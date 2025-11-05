import { getUserFromHeader } from "@/helpers/common_func";
import sendEmail from "@/helpers/mailer";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import VerificationEmail from "@/templates/emails/VerificationEmail";
import EventType from "@/types/Event";
import { Verifier } from "@/models/Verifier";
import Department from "@/types/Department";
import College from "@/types/College";
import { connect } from "@/config/database/mongoDBConfig";

connect();

// Gmail-safe configuration (60 emails/minute limit)
// Math: If email takes ~2.5 seconds, and we want max 50 emails/min:
// 50 emails/min = 0.833 emails/sec = 1.2 seconds per email minimum
// To be safe with 5 concurrent: we need delay between chunks
const CONFIG = {
  BATCH_SIZE: 50,               // Total users per batch
  CONCURRENT_EMAILS: 5,         // Parallel email sends (5 at a time)
  CHUNK_DELAY: 3000,            // 3 second delay between chunks of 5 emails
  BATCH_DELAY: 2000,            // 2 second delay between batches
  RETRY_ATTEMPTS: 2,            // Retry failed emails
  RETRY_DELAY: 1000             // Delay before retry
};
// With this config: 5 emails take ~2.5s + 3s delay = 5.5s per chunk
// That's 5 emails per 5.5s = ~54 emails/minute ✅

export default interface UserType {
  email: string;
  name: string;
  aadhar: string;
  college_id: number | null;
  designation: string | null;
  department: Department | null;
  college: College | null;
  photo: string | null;
  repeated: boolean;
  events: Map<string, { 
    status: boolean; 
    seat_no: string; 
    enclosure_no: string; 
    verifier: { name: string }; 
    invitation: string 
  }>;
}

type EmailSuccess = {
  email: string;
  messageId: string;
};

type EmailFailure = {
  email: string;
  error: string;
};

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);

  const day: number = date.getDate();
  const suffix: string = (day % 10 === 1 && day !== 11) ? 'st' :
                         (day % 10 === 2 && day !== 12) ? 'nd' :
                         (day % 10 === 3 && day !== 13) ? 'rd' : 'th';

  return formattedDate.replace(day.toString(), `${day}${suffix}`);
}

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Send a single email with retry logic
const sendSingleEmail = async (
  user: UserType,
  event: EventType,
  event_id: string,
  jwtAccessToken: string,
  time: string,
  date: string,
  verifier: string,
  retryCount: number = 0
): Promise<{ success: boolean; email: string; messageId?: string; error?: string }> => {
  try {
    const messageId = await sendEmail(
      `"Convocation GBPUAT" <${process.env.SMTP_NOREPLY}>`,
      user.email,
      event.title + " - Invitation",
      `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${jwtAccessToken}`,
      VerificationEmail({ jwtAccessToken, event, user, time, date, verifier }),
      user.events.get(event_id)?.invitation || "",
      `${event.title} - ${event.title} <${user.email}>.pdf`
    );

    // Update database
    const updatedUser = await User.findOneAndUpdate(
      { email: user.email },
      { $push: { [`events.${event_id}.emails_sent`]: messageId } },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error(`Failed to update emails_sent for user ${user.email}`);
    }

    console.log(`✓ Email sent to ${user.email}`);
    return { success: true, email: user.email, messageId };

  } catch (error: any) {
    console.error(`✗ Error sending email to ${user.email}:`, error.message);

    // Retry logic
    if (retryCount < CONFIG.RETRY_ATTEMPTS) {
      console.log(`  Retrying ${user.email} (attempt ${retryCount + 1}/${CONFIG.RETRY_ATTEMPTS})`);
      await sleep(CONFIG.RETRY_DELAY);
      return sendSingleEmail(user, event, event_id, jwtAccessToken, time, date, verifier, retryCount + 1);
    }

    return { 
      success: false, 
      email: user.email, 
      error: error.message || 'Unknown error' 
    };
  }
};

// Process users in controlled concurrent batches
const processBatch = async (
  users: UserType[],
  event: EventType,
  event_id: string,
  time: string,
  date: string,
  verifiers: Record<string, string>,
  concurrentEmails: number = CONFIG.CONCURRENT_EMAILS
) => {
  const batchResults = {
    successful: 0,
    failed: 0,
    successfulEmails: [] as EmailSuccess[],
    failedEmails: [] as EmailFailure[]
  };

  // Process users in chunks of concurrentEmails
  for (let i = 0; i < users.length; i += concurrentEmails) {
    const chunk = users.slice(i, i + concurrentEmails);
    
    console.log(`  Processing ${chunk.length} emails in parallel (${i + 1}-${i + chunk.length} of ${users.length})`);

    // Process chunk in parallel - NO DELAY INSIDE, emails take time naturally
    const emailPromises = chunk.map(async (user) => {
      const jwtAccessToken = jwt.sign(
        { event: event_id, email: user.email },
        String(process.env.JWT_USER_QR_SECRET)
      );

      const verifier = verifiers[user.events.get(event_id)?.verifier.toString() || ""];
      
      return sendSingleEmail(user, event, event_id, jwtAccessToken, time, date, verifier);
    });

    const results = await Promise.all(emailPromises);

    // Aggregate results
    for (const result of results) {
      if (result.success) {
        batchResults.successful++;
        batchResults.successfulEmails.push({
          email: result.email,
          messageId: result.messageId!
        });
      } else {
        batchResults.failed++;
        batchResults.failedEmails.push({
          email: result.email,
          error: result.error!
        });
      }
    }

    // Small delay between chunks to avoid bursting
    if (i + concurrentEmails < users.length) {
      await sleep(CONFIG.CHUNK_DELAY);
    }
  }

  return batchResults;
};

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req, true);
    
    if (user == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { event_id, batchSize, concurrentEmails } = await req.json();

    // Use provided values or fall back to defaults
    const BATCH_SIZE = batchSize || CONFIG.BATCH_SIZE;
    const CONCURRENT_EMAILS = concurrentEmails || CONFIG.CONCURRENT_EMAILS;

    // Validate configuration
    if (CONCURRENT_EMAILS > BATCH_SIZE) {
      throw new Error('CONCURRENT_EMAILS cannot be greater than BATCH_SIZE');
    }

    // Gmail safety check - proper calculation
    // Each chunk of CONCURRENT_EMAILS takes avgEmailTime + CHUNK_DELAY
    const avgEmailTime = 2.5; // seconds (realistic email send time)
    const timePerChunk = avgEmailTime + (CONFIG.CHUNK_DELAY / 1000); // total time per chunk
    const emailsPerMinute = (60 / timePerChunk) * CONCURRENT_EMAILS;
    
    console.log(`📊 Rate calculation: ${CONCURRENT_EMAILS} emails per ${timePerChunk}s = ~${emailsPerMinute.toFixed(1)} emails/min`);
    
    if (emailsPerMinute > 55) {
      console.warn(`⚠️  WARNING: Config may send ${emailsPerMinute.toFixed(0)} emails/min. Gmail limit is 60/min!`);
      const safeChunkDelay = Math.ceil(((60 / 50) * CONCURRENT_EMAILS - avgEmailTime) * 1000);
      console.warn(`⚠️  Recommended CHUNK_DELAY: ${safeChunkDelay}ms for 50 emails/min`);
    } else {
      console.log(`✅ Safe rate: ${emailsPerMinute.toFixed(1)}/min (under 60/min limit)`);
    }

    const event: EventType | null = await Event.findById(event_id);
    if (event_id == null || event == null) {
      return NextResponse.json({ error: "Invalid event_id" }, { status: 400 });
    }

    // Fetch users who haven't received emails
    const unsentUsers = await User.find({
      [`events.${event_id}`]: { $exists: true, $ne: null },
      [`events.${event_id}.emails_sent`]: { $size: 0 }
    }, { 
      email: 1, 
      _id: 1, 
      name: 1, 
      designation: 1, 
      events: 1 
    });

    const totalUsers = unsentUsers.length;

    if (totalUsers === 0) {
      return NextResponse.json({
        message: 'No users found to send emails',
        total: 0,
        successful: 0,
        failed: 0
      });
    }

    console.log(`Found ${totalUsers} users to send emails for event: ${event.title}`);
    console.log(`Using BATCH_SIZE: ${BATCH_SIZE}, CONCURRENT_EMAILS: ${CONCURRENT_EMAILS}`);

    // Prepare event details
    let eventDate: string | Date = new Date(event.date);
    const time = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = formatDate(eventDate);

    const verifiers: Record<string, string> = Object.fromEntries(
      (await Verifier.find({}, { name: 1 })).map((verifier) => [
        verifier._id.toString(),
        verifier.name,
      ])
    );

    // Create SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'started',
            total: totalUsers,
            eventTitle: event.title,
            config: {
              batchSize: BATCH_SIZE,
              concurrentEmails: CONCURRENT_EMAILS,
              chunkDelay: CONFIG.CHUNK_DELAY,
              batchDelay: CONFIG.BATCH_DELAY
            }
          })}\n\n`));

          let totalProcessed = 0;
          let totalSuccessful = 0;
          let totalFailed = 0;
          const allSuccessful: EmailSuccess[] = [];
          const allFailed: EmailFailure[] = [];

          const totalBatches = Math.ceil(totalUsers / BATCH_SIZE);

          for (let i = 0; i < totalUsers; i += BATCH_SIZE) {
            const batch = unsentUsers.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

            console.log(`\nProcessing batch ${batchNumber}/${totalBatches} (${batch.length} users)`);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'batch_started',
              batch: batchNumber,
              totalBatches: totalBatches,
              batchSize: batch.length
            })}\n\n`));

            const batchResults = await processBatch(
              batch,
              event,
              event_id,
              time,
              date,
              verifiers,
              CONCURRENT_EMAILS
            );

            totalProcessed += batch.length;
            totalSuccessful += batchResults.successful;
            totalFailed += batchResults.failed;
            allSuccessful.push(...batchResults.successfulEmails);
            allFailed.push(...batchResults.failedEmails);

            const batchPercentage = ((totalProcessed / totalUsers) * 100).toFixed(2);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'batch_complete',
              batch: batchNumber,
              totalBatches: totalBatches,
              batchSuccessful: batchResults.successful,
              batchFailed: batchResults.failed,
              totalProcessed: totalProcessed,
              totalSuccessful: totalSuccessful,
              totalFailed: totalFailed,
              percentage: batchPercentage,
              total: totalUsers
            })}\n\n`));

            console.log(`Batch ${batchNumber} complete: ${batchResults.successful} successful, ${batchResults.failed} failed`);

            // Delay between batches to respect rate limits (except for last batch)
            if (i + BATCH_SIZE < totalUsers) {
              console.log(`  Waiting ${CONFIG.BATCH_DELAY}ms before next batch...`);
              await sleep(CONFIG.BATCH_DELAY);
            }
          }

          // Update event's emails_sent count
          if (totalSuccessful > 0) {
            const emailsSentCount = await User.countDocuments({
              [`events.${event_id}`]: { $exists: true, $ne: null },
              [`events.${event_id}.emails_sent`]: { $exists: true, $not: { $size: 0 } }
            });

            await Event.findByIdAndUpdate(
              event_id,
              { emails_sent: emailsSentCount }
            );

            console.log(`Updated event: ${emailsSentCount} total emails sent`);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'complete',
            total: totalUsers,
            successful: totalSuccessful,
            failed: totalFailed,
            successfulEmails: allSuccessful,
            failedEmails: allFailed.length > 0 ? allFailed.slice(0, 20) : [],
            percentage: '100.00'
          })}\n\n`));

          console.log(`\n✓ All batches complete: ${totalSuccessful}/${totalUsers} successful`);

        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
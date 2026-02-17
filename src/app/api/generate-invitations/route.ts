import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { getInvitationHTML } from '@/helpers/templateService';
import { connect } from '@/config/database/mongoDBConfig';
import { Event } from '@/models/Event';
import { Hostel } from '@/models/Hostel';
import { College } from '@/models/College';
import { Verifier } from '@/models/Verifier';
import { Department } from '@/models/Department';
import { getUserFromHeader } from '@/helpers/common_func';
import { uploadPdf } from '@/lib/cloudinary';

Hostel;
Verifier;
College;
Department;

connect();

// Configuration constants
const CONFIG = {
  BATCH_SIZE: 50,
  CONCURRENT_PAGES: 5,
  PDF_TIMEOUT: 15000,
  CONTENT_TIMEOUT: 60000,
  RENDER_DELAY: 500
};

// ──────────────────────────────────────────────────────────────
// PROCESS SINGLE USER
// ──────────────────────────────────────────────────────────────
const processUser = async (
  browser: any,
  user: any,
  event_id: string,
  eventTitle: string
) => {
  const page = await browser.newPage();
  
  try {
    await page.emulateMediaType('screen');
    const userEvent = user.events.get(event_id);

    const invitationHtml = await getInvitationHTML(
      event_id,
      user,
      userEvent.verifier.name,
      userEvent.enclosure_no,
      userEvent.entry_gate
    );

    await page.setContent(
      invitationHtml,
      { 
        waitUntil: 'networkidle0',
        timeout: CONFIG.CONTENT_TIMEOUT
      }
    );
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.RENDER_DELAY));

    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      timeout: CONFIG.PDF_TIMEOUT
    });

    // Determine subfolder for organization
    const subfolder = user.hostel?.name || user.college?.name || undefined;

    // Upload to Cloudinary
    const publicUrl = await uploadPdf(
      Buffer.from(pdfBuffer),
      eventTitle,
      subfolder,
      user.email
    );

    await User.findByIdAndUpdate(user._id, {
      $set: { [`events.${event_id}.invitation`]: publicUrl },
    });

    console.log(`✓ ${user.email}`);
    
    return { success: true, email: user.email };
  } catch (error) {
    console.error(`✗ ${user.email}:`, error);
    return {
      success: false,
      email: user.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    await page.close();
  }
};

const processBatch = async (
  users: any[],
  event_id: string,
  eventTitle: string,
  concurrentPages: number = CONFIG.CONCURRENT_PAGES
) => {
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  const batchResults = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>
  };

  try {
    for (let i = 0; i < users.length; i += concurrentPages) {
      const chunk = users.slice(i, i + concurrentPages);
      
      console.log(`  Processing ${chunk.length} users (${i + 1}-${i + chunk.length}/${users.length})`);
      
      const results = await Promise.all(
        chunk.map(user => processUser(browser, user, event_id, eventTitle))
      );

      for (const result of results) {
        if (result.success) {
          batchResults.successful++;
        } else {
          batchResults.failed++;
          batchResults.errors.push({ email: result.email, error: result.error || 'Unknown error' });
        }
      }
    }
  } finally {
    await browser.close();
  }

  return batchResults;
};

export async function POST(req: NextRequest) {
  try {
    const admin = await getUserFromHeader(req, true);
    if (admin == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { event_id } = await req.json();
    
    if (CONFIG.CONCURRENT_PAGES > CONFIG.BATCH_SIZE) {
      throw new Error('CONCURRENT_PAGES cannot be greater than BATCH_SIZE');
    }

    const event = await Event.findById(event_id).select('title registered_users');
    if (!event) throw new Error('Event not found');

    const unsentUsers = await User.find({
      [`events.${event_id}`]: { $exists: true, $ne: null },
      $or: [
        { [`events.${event_id}.invitation`]: { $exists: false } },
        { [`events.${event_id}.invitation`]: null },
        { [`events.${event_id}.invitation`]: '' }
      ]
    })
    .populate('hostel')
    .populate('college')
    .populate('department')
    .populate({
      path: `events.${event_id}.verifier`,
      model: 'Verifier'
    });

    const totalUsers = unsentUsers.length;
    
    if (totalUsers === 0) {
      return NextResponse.json({ 
        message: 'No users found to process',
        total: 0,
        successful: 0,
        failed: 0
      });
    }
    
    console.log(`Found ${totalUsers} users for event: ${event.title}`);
    console.log(`Config: BATCH=${CONFIG.BATCH_SIZE}, CONCURRENT=${CONFIG.CONCURRENT_PAGES}`);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'started',
            total: totalUsers,
            eventTitle: event.title,
            config: {
              batchSize: CONFIG.BATCH_SIZE,
              concurrentPages: CONFIG.CONCURRENT_PAGES
            }
          })}\n\n`));

          let totalProcessed = 0;
          let totalSuccessful = 0;
          let totalFailed = 0;
          const allErrors: Array<{ email: string; error: string }> = [];

          const totalBatches = Math.ceil(totalUsers / CONFIG.BATCH_SIZE);

          for (let i = 0; i < totalUsers; i += CONFIG.BATCH_SIZE) {
            const batch = unsentUsers.slice(i, i + CONFIG.BATCH_SIZE);
            const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

            console.log(`\nBatch ${batchNumber}/${totalBatches} (${batch.length} users)`);
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'batch_started',
              batch: batchNumber,
              totalBatches: totalBatches,
              batchSize: batch.length
            })}\n\n`));
            
            const batchResults = await processBatch(
              batch, 
              event_id, 
              event.title,
              CONFIG.CONCURRENT_PAGES
            );
            
            totalProcessed += batch.length;
            totalSuccessful += batchResults.successful;
            totalFailed += batchResults.failed;
            allErrors.push(...batchResults.errors);
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'batch_complete',
              batch: batchNumber,
              totalBatches: totalBatches,
              batchSuccessful: batchResults.successful,
              batchFailed: batchResults.failed,
              totalProcessed: totalProcessed,
              totalSuccessful: totalSuccessful,
              totalFailed: totalFailed,
              percentage: ((totalProcessed / totalUsers) * 100).toFixed(2),
              total: totalUsers
            })}\n\n`));
            
            console.log(`Batch ${batchNumber}: ${batchResults.successful} OK, ${batchResults.failed} failed`);
          }

          if (totalSuccessful > 0) {
            await Event.findByIdAndUpdate(
              event_id,
              { $inc: { invitations_generated: totalSuccessful } }
            );
            console.log(`Event updated: +${totalSuccessful} invitations`);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'complete',
            total: totalUsers,
            successful: totalSuccessful,
            failed: totalFailed,
            errors: allErrors.slice(0, 10),
            percentage: '100.00'
          })}\n\n`));

          console.log(`\n✓ Complete: ${totalSuccessful}/${totalUsers} successful`);

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
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { drive_v3, google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import InvitationTemplate from '@/components/InvitationTemplate';
import { connect } from '@/config/database/mongoDBConfig';
import { Event } from '@/models/Event';
import { Hostel } from '@/models/Hostel';
import { College } from '@/models/College';
import { Verifier } from '@/models/Verifier';
import { Readable } from 'stream';
import { Department } from '@/models/Department';

Hostel;
Verifier;
College;
Department;

connect();

// Configuration constants - easily adjustable
const CONFIG = {
  BATCH_SIZE: 50,        // Total users per batch
  CONCURRENT_PAGES: 5,   // Number of parallel PDF generations
  PDF_TIMEOUT: 15000,    // PDF generation timeout
  CONTENT_TIMEOUT: 30000, // Page content loading timeout
  RENDER_DELAY: 1000     // Additional delay for full rendering
};

const bufferToStream = (buffer: Buffer): Readable => new Readable({
  read() {
    this.push(buffer);
    this.push(null);
  }
});

const initializeGoogleDrive = () => {
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_id: process.env.GOOGLE_CLIENT_ID,
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
};

const findOrCreateFolder = async (drive: drive_v3.Drive, parentFolderId: string, folderName: string): Promise<string> => {
  try {
    const response = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    if (response.data.files?.length) {
      console.log(`Folder found: ${folderName}`);
      return response.data.files[0].id!;
    }

    console.log(`Folder not found, creating: ${folderName}`);
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
    });

    const folderId = folder.data.id!;

    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log(`Public permissions set for folder: ${folderName}`);
    } catch (permError) {
      console.warn(`Could not set permissions for ${folderName}:`, permError);
    }

    return folderId;
  } catch (error) {
    console.error(`Error finding or creating folder: ${folderName}`, error);
    throw error;
  }
};

const uploadFile = async (
  drive: drive_v3.Drive, 
  folderId: string, 
  fileName: string, 
  fileBuffer: Uint8Array
): Promise<string> => {
  try {
    const fileList = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    let fileId = fileList.data.files?.[0]?.id ?? null;
    if (fileId) {
      await drive.files.delete({ fileId });
      console.log(`Deleted old file: ${fileName}`);
    }

    const media = {
      mimeType: 'application/pdf',
      body: bufferToStream(Buffer.from(fileBuffer)),
    };

    // Create the file
    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media,
      fields: 'id',
    });

    const uploadedFileId = file.data.id!;
    console.log(`Uploaded new file: ${fileName} with ID: ${uploadedFileId}`);

    // Make the file publicly accessible
    try {
      await drive.permissions.create({
        fileId: uploadedFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log(`Public permissions set for file: ${fileName}`);
    } catch (permError) {
      console.warn(`Could not set permissions for ${fileName}:`, permError);
    }

    // Return direct download URL
    const publicUrl = `https://drive.google.com/uc?id=${uploadedFileId}&export=download`;
    console.log(`Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

const shareFolder = async (drive: drive_v3.Drive, folderId: string) => {
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: process.env.GOOGLE_DRIVE_SHARE_TO_EMAIL,
      },
    });
    console.log(`Folder shared with ${process.env.GOOGLE_DRIVE_SHARE_TO_EMAIL}`);
  } catch (error) {
    console.error('Error sharing folder:', error);
    throw error;
  }
};

// Process a single user - creates its own page for maximum flexibility
const processUser = async (
  browser: any,
  user: any,
  event_id: string,
  drive: drive_v3.Drive,
  eventFolderId: string,
  folderCache: Map<string, string>
) => {
  const page = await browser.newPage();
  
  try {
    await page.emulateMediaType('screen');
    const userEvent = user.events.get(event_id);

    await page.setContent(
      InvitationTemplate(
        user,
        event_id,
        userEvent.verifier.name,
        userEvent.enclosure_no,
        userEvent.entry_gate
      ),
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

    let uploadFolderId = eventFolderId;
    const folderKey = user.hostel?.name || user.college?.name;
    
    if (folderKey) {
      if (!folderCache.has(folderKey)) {
        const folderId = await findOrCreateFolder(drive, eventFolderId, folderKey);
        folderCache.set(folderKey, folderId);
      }
      uploadFolderId = folderCache.get(folderKey)!;
    }

    const publicUrl = await uploadFile(drive, uploadFolderId, `${user.email}.pdf`, pdfBuffer);

    await User.findByIdAndUpdate(user._id, {
      $set: { [`events.${event_id}.invitation`]: publicUrl },
    });

    console.log(`✓ Invitation generated for ${user.email}`);
    
    return { success: true, email: user.email };
  } catch (error) {
    console.error(`✗ Error processing ${user.email}:`, error);
    return {
      success: false,
      email: user.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    await page.close();
  }
};

// TRULY FLEXIBLE: Process users in parallel batches - works with ANY number
const processBatch = async (
  users: any[],
  event_id: string,
  drive: drive_v3.Drive,
  eventFolderId: string,
  folderCache: Map<string, string>,
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
    // Process users in chunks of concurrentPages
    for (let i = 0; i < users.length; i += concurrentPages) {
      // Get the actual chunk size (may be less than concurrentPages at the end)
      const chunk = users.slice(i, i + concurrentPages);
      
      console.log(`  Processing ${chunk.length} users in parallel (${i + 1}-${i + chunk.length} of ${users.length})`);
      
      // Process this chunk in parallel - each user gets its own page
      const results = await Promise.all(
        chunk.map(user => processUser(browser, user, event_id, drive, eventFolderId, folderCache))
      );

      // Aggregate results
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

// Main POST handler with flexible configuration
export async function POST(req: NextRequest) {
  try {
    const { event_id, batchSize, concurrentPages } = await req.json();
    
    // Use provided values or fall back to defaults
    const BATCH_SIZE = batchSize || CONFIG.BATCH_SIZE;
    const CONCURRENT_PAGES = concurrentPages || CONFIG.CONCURRENT_PAGES;
    
    // Validate configuration
    if (CONCURRENT_PAGES > BATCH_SIZE) {
      throw new Error('CONCURRENT_PAGES cannot be greater than BATCH_SIZE');
    }
    
    const drive = initializeGoogleDrive();

    const baseFolderId = await findOrCreateFolder(drive, 'root', 'gbpuat-event-pass');
    
    const event = await Event.findById(event_id).select('title registered_users');
    if (!event) throw new Error('Event not found');
    
    const eventFolderId = await findOrCreateFolder(drive, baseFolderId, event.title);

    await shareFolder(drive, baseFolderId);

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
    
    console.log(`Found ${totalUsers} users to process for event: ${event.title}`);
    console.log(`Using BATCH_SIZE: ${BATCH_SIZE}, CONCURRENT_PAGES: ${CONCURRENT_PAGES}`);

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
              concurrentPages: CONCURRENT_PAGES
            }
          })}\n\n`));

          const folderCache = new Map<string, string>();
          let totalProcessed = 0;
          let totalSuccessful = 0;
          let totalFailed = 0;
          const allErrors: Array<{ email: string; error: string }> = [];

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
              event_id, 
              drive, 
              eventFolderId, 
              folderCache,
              CONCURRENT_PAGES
            );
            
            totalProcessed += batch.length;
            totalSuccessful += batchResults.successful;
            totalFailed += batchResults.failed;
            allErrors.push(...batchResults.errors);
            
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
          }

          // Update event's invitations_generated field efficiently
          if (totalSuccessful > 0) {
            await Event.findByIdAndUpdate(
              event_id,
              { $inc: { invitations_generated: totalSuccessful } }
            );
            console.log(`Updated event: +${totalSuccessful} invitations generated`);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'complete',
            total: totalUsers,
            successful: totalSuccessful,
            failed: totalFailed,
            errors: allErrors.length > 0 ? allErrors.slice(0, 10) : [],
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
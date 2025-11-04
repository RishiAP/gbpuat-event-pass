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
import { getUserFromHeader } from '@/helpers/common_func';
import { initializeGoogleDrive } from '@/helpers/initGoogleDrive';

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
  CONTENT_TIMEOUT: 30000,
  RENDER_DELAY: 1000
};

const bufferToStream = (buffer: Buffer): Readable => new Readable({
  read() {
    this.push(buffer);
    this.push(null);
  }
});

// Mutex to prevent concurrent folder creation
class FolderMutex {
  private locks: Map<string, Promise<string>> = new Map();

  async acquire(key: string, createFn: () => Promise<string>): Promise<string> {
    // If there's already a pending creation for this folder, wait for it
    if (this.locks.has(key)) {
      return this.locks.get(key)!;
    }

    // Create a new promise for this folder creation
    const promise = (async () => {
      try {
        return await createFn();
      } finally {
        // Remove the lock after creation completes
        this.locks.delete(key);
      }
    })();

    this.locks.set(key, promise);
    return promise;
  }
}

const folderMutex = new FolderMutex();

const findOrCreateFolder = async (
  drive: drive_v3.Drive, 
  parentFolderId: string, 
  folderName: string,
  folderCache: Map<string, string>
): Promise<string> => {
  const cacheKey = `${parentFolderId}:${folderName}`;
  
  // Check cache first
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!;
  }

  // Use mutex to prevent concurrent creation attempts
  return folderMutex.acquire(cacheKey, async () => {
    // Double-check cache after acquiring lock
    if (folderCache.has(cacheKey)) {
      return folderCache.get(cacheKey)!;
    }

    try {
      const escapedFolderName = folderName.replace(/'/g, "\\'");
      
      // Search for existing folder
      const response = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${escapedFolderName}' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        pageSize: 1 // We only need one result
      });

      if (response.data.files && response.data.files.length > 0) {
        const folderId = response.data.files[0].id!;
        console.log(`Folder found: ${folderName} (ID: ${folderId})`);
        folderCache.set(cacheKey, folderId);
        return folderId;
      }

      // Create folder if not found
      console.log(`Creating folder: ${folderName}`);
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        fields: 'id',
      });

      const folderId = folder.data.id!;
      console.log(`Folder created: ${folderName} (ID: ${folderId})`);
      
      // Cache the folder ID immediately
      folderCache.set(cacheKey, folderId);

      return folderId;
    } catch (error) {
      console.error(`Error finding/creating folder: ${folderName}`, error);
      throw error;
    }
  });
};

const uploadFile = async (
  drive: drive_v3.Drive, 
  folderId: string, 
  fileName: string, 
  fileBuffer: Uint8Array
): Promise<string> => {
  try {
    // Check for existing file
    const fileList = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 1
    });

    const existingFileId = fileList.data.files?.[0]?.id;
    if (existingFileId) {
      await drive.files.delete({ fileId: existingFileId });
      console.log(`Deleted old file: ${fileName}`);
    }

    const media = {
      mimeType: 'application/pdf',
      body: bufferToStream(Buffer.from(fileBuffer)),
    };

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media,
      fields: 'id',
    });

    const uploadedFileId = file.data.id!;
    console.log(`Uploaded: ${fileName}`);

    // Set permissions asynchronously
    drive.permissions.create({
      fileId: uploadedFileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    }).catch(err => console.warn(`Could not set permissions for ${fileName}:`, err));

    return `https://drive.google.com/uc?id=${uploadedFileId}&export=download`;
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
  }
};

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

    // Determine upload folder
    let uploadFolderId = eventFolderId;
    const folderKey = user.hostel?.name || user.college?.name;
    
    if (folderKey) {
      uploadFolderId = await findOrCreateFolder(drive, eventFolderId, folderKey, folderCache);
    }

    const publicUrl = await uploadFile(drive, uploadFolderId, `${user.email}.pdf`, pdfBuffer);

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
    for (let i = 0; i < users.length; i += concurrentPages) {
      const chunk = users.slice(i, i + concurrentPages);
      
      console.log(`  Processing ${chunk.length} users (${i + 1}-${i + chunk.length}/${users.length})`);
      
      const results = await Promise.all(
        chunk.map(user => processUser(browser, user, event_id, drive, eventFolderId, folderCache))
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
    
    const drive = initializeGoogleDrive();
    
    // Initialize folder cache at the start
    const folderCache = new Map<string, string>();

    const baseFolderId = await findOrCreateFolder(drive, 'root', 'gbpuat-event-pass', folderCache);
    
    const event = await Event.findById(event_id).select('title registered_users');
    if (!event) throw new Error('Event not found');
    
    const eventFolderId = await findOrCreateFolder(drive, baseFolderId, event.title, folderCache);

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
              drive, 
              eventFolderId, 
              folderCache,
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
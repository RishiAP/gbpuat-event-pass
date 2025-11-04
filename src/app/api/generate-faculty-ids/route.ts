import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { drive_v3 } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import FacultyIdTemplate from '@/components/FacultyIdTemplate';
import { connect } from '@/config/database/mongoDBConfig';
import { Event } from '@/models/Event';
import { Readable } from 'stream';
import { getUserFromHeader } from '@/helpers/common_func';
import { College } from '@/models/College';
import { Department } from '@/models/Department';
import { Verifier } from '@/models/Verifier';
import { initializeGoogleDrive } from '@/helpers/initGoogleDrive';

connect();

College;
Department;

// Configuration constants
const CONFIG = {
  BATCH_SIZE: 30,
  CONCURRENT_PAGES: 5,
  CONTENT_TIMEOUT: 30000,
  RENDER_DELAY: 1000,
  JPG_QUALITY: 100,
  JPG_DPI_SCALE: 1,
  CARD_WIDTH: 1181,
  CARD_HEIGHT: 756,
  SCREENSHOT_TIMEOUT: 15000,
} as const;

// ──────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

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
    if (this.locks.has(key)) {
      return this.locks.get(key)!;
    }

    const promise = (async () => {
      try {
        return await createFn();
      } finally {
        this.locks.delete(key);
      }
    })();

    this.locks.set(key, promise);
    return promise;
  }
}

const folderMutex = new FolderMutex();

// Find or create folder with mutex and cache
const findOrCreateFolder = async (
  drive: drive_v3.Drive, 
  parentFolderId: string, 
  folderName: string,
  folderCache: Map<string, string>
): Promise<string> => {
  const cacheKey = `${parentFolderId}:${folderName}`;
  
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!;
  }

  return folderMutex.acquire(cacheKey, async () => {
    if (folderCache.has(cacheKey)) {
      return folderCache.get(cacheKey)!;
    }

    try {
      const escapedFolderName = folderName.replace(/'/g, "\\'");
      
      const response = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${escapedFolderName}' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        pageSize: 1
      });

      if (response.data.files && response.data.files.length > 0) {
        const folderId = response.data.files[0].id!;
        console.log(`Folder found: ${folderName} (ID: ${folderId})`);
        folderCache.set(cacheKey, folderId);
        return folderId;
      }

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
      
      folderCache.set(cacheKey, folderId);
      return folderId;
    } catch (error) {
      console.error(`Error finding/creating folder: ${folderName}`, error);
      throw error;
    }
  });
};

// Upload JPG - inherits folder permissions (no public access)
const uploadJpg = async (
  drive: drive_v3.Drive,
  folderId: string,
  filename: string,
  buffer: Buffer
): Promise<string> => {
  try {
    const fileList = await drive.files.list({
      q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 1
    });

    if (fileList.data.files?.[0]?.id) {
      await drive.files.delete({ fileId: fileList.data.files[0].id });
      console.log(`Deleted old file: ${filename}`);
    }

    const media = {
      mimeType: 'image/jpeg',
      body: bufferToStream(buffer),
    };

    const file = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media,
      fields: 'id, webViewLink',
    });

    const fileId = file.data.id!;
    console.log(`Uploaded: ${filename} (restricted)`);
    
    // Return webViewLink - only accessible to users with folder permissions
    return `https://drive.google.com/file/d/${fileId}/view`;
  } catch (error) {
    console.error(`Error uploading ${filename}:`, error);
    throw error;
  }
};

// Share folder with specific user
const shareFolder = async (drive: drive_v3.Drive, folderId: string) => {
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: process.env.GOOGLE_DRIVE_SHARE_TO_EMAIL!,
      },
    });
    console.log(`Folder shared with ${process.env.GOOGLE_DRIVE_SHARE_TO_EMAIL}`);
  } catch (error) {
    console.error('Error sharing folder:', error);
  }
};

// ──────────────────────────────────────────────────────────────
// PROCESS SINGLE FACULTY
// ──────────────────────────────────────────────────────────────
const processFaculty = async (
  browser: any,
  user: any,
  event: any,
  drive: drive_v3.Drive,
  facultyIdsFolderId: string,
  folderCache: Map<string, string>
) => {
  const page = await browser.newPage();
  
  try {
    await page.setViewport({
      width: CONFIG.CARD_WIDTH,
      height: CONFIG.CARD_HEIGHT,
      deviceScaleFactor: CONFIG.JPG_DPI_SCALE,
    });

    const html = FacultyIdTemplate(event, user);
    
    await page.setContent(html, { 
      waitUntil: 'networkidle0', 
      timeout: CONFIG.CONTENT_TIMEOUT 
    });
    
    await delay(CONFIG.RENDER_DELAY);

    const jpgBuffer = await page.screenshot({
      type: 'jpeg',
      quality: CONFIG.JPG_QUALITY,
      clip: { 
        x: 0, 
        y: 0, 
        width: CONFIG.CARD_WIDTH, 
        height: CONFIG.CARD_HEIGHT 
      },
      timeout: CONFIG.SCREENSHOT_TIMEOUT,
    });

    // Get or create college folder
    const collegeName = user.college?.name || 'No College';
    const collegeFolderId = await findOrCreateFolder(drive, facultyIdsFolderId, collegeName, folderCache);

    // Upload JPG
    const filename = `${user.name} - ${user.email}.jpg`;
    const url = await uploadJpg(drive, collegeFolderId, filename, jpgBuffer as Buffer);

    // Update database
    await User.findByIdAndUpdate(user._id, {
      $set: { [`events.${event._id.toString()}.id_card`]: url },
    });

    console.log(`✓ ${user.email}`);
    
    return { success: true, email: user.email };
  } catch (error: any) {
    console.error(`✗ ${user.email}:`, error);
    return { 
      success: false, 
      email: user.email, 
      error: error.message || 'Unknown error' 
    };
  } finally {
    await page.close();
  }
};

// ──────────────────────────────────────────────────────────────
// BATCH PROCESSOR
// ──────────────────────────────────────────────────────────────
const processBatch = async (
  users: any[],
  event: any,
  drive: drive_v3.Drive,
  facultyIdsFolderId: string,
  folderCache: Map<string, string>,
  concurrentPages: number
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
      
      console.log(`  Processing ${chunk.length} faculties (${i + 1}-${i + chunk.length}/${users.length})`);
      
      const results = await Promise.all(
        chunk.map(user => 
          processFaculty(browser, user, event, drive, facultyIdsFolderId, folderCache)
        )
      );

      for (const result of results) {
        if (result.success) {
          batchResults.successful++;
        } else {
          batchResults.failed++;
          batchResults.errors.push({ 
            email: result.email, 
            error: result.error || 'Unknown error' 
          });
        }
      }
    }
  } finally {
    await browser.close();
  }

  return batchResults;
};

// ──────────────────────────────────────────────────────────────
// ATOMIC INCREMENT HELPER
// ──────────────────────────────────────────────────────────────
const incrementIdCardGenerated = async (eventId: string, count: number) => {
  try {
    await Event.findByIdAndUpdate(
      eventId,
      { $inc: { id_card_generated: count } },
      { new: false }
    );
    console.log(`✓ Incremented id_card_generated by ${count}`);
  } catch (error) {
    console.error('Error incrementing id_card_generated:', error);
  }
};

// ──────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await getUserFromHeader(request, true);
    if (admin == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { event_id } = await request.json();
    
    if (!event_id) {
      return NextResponse.json({ message: "Event ID required" }, { status: 400 });
    }
    
    if (CONFIG.CONCURRENT_PAGES > CONFIG.BATCH_SIZE) {
      throw new Error('CONCURRENT_PAGES cannot be greater than BATCH_SIZE');
    }

    const drive = initializeGoogleDrive();
    
    // Initialize folder cache
    const folderCache = new Map<string, string>();

    const event = await Event.findById(event_id).select('title');
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Create folder structure
    const baseFolderId = await findOrCreateFolder(drive, 'root', 'gbpuat-event-pass', folderCache);
    await shareFolder(drive, baseFolderId);
    
    const eventFolderId = await findOrCreateFolder(drive, baseFolderId, event.title, folderCache);
    const facultyIdsFolderId = await findOrCreateFolder(drive, eventFolderId, 'Faculty_IDS', folderCache);

    // Find faculties
    const faculties = await User.find({
      $and: [
        {
          $or: [
            { college_id: null },
            { college_id: { $exists: false } }
          ]
        },
        {
          [`events.${event_id}`]: { $exists: true, $ne: null }
        },
        {
          $or: [
            { [`events.${event_id}.id_card`]: { $exists: false } },
            { [`events.${event_id}.id_card`]: null },
            { [`events.${event_id}.id_card`]: '' }
          ]
        }
      ]
    })
      .populate('college')
      .populate('department');

    // Fetch and map verifiers
    const allVerifiers = await Verifier.find({});
    const verifierMap = new Map(
      allVerifiers.map(v => [v._id.toString(), v])
    );

    for (const faculty of faculties) {
      const eventData = faculty.events.get(event_id);
      if (eventData?.verifier) {
        const verifierId = typeof eventData.verifier === 'object' 
          ? eventData.verifier._id.toString() 
          : eventData.verifier.toString();
        
        const verifierDoc = verifierMap.get(verifierId);
        if (verifierDoc) {
          eventData.verifier = verifierDoc;
          faculty.events.set(event_id, eventData);
        }
      }
    }

    const totalFaculties = faculties.length;

    if (totalFaculties === 0) {
      return NextResponse.json({ 
        message: "No faculties to process", 
        total: 0,
        successful: 0,
        failed: 0
      });
    }

    console.log(`Found ${totalFaculties} faculties for event: ${event.title}`);
    console.log(`Config: BATCH=${CONFIG.BATCH_SIZE}, CONCURRENT=${CONFIG.CONCURRENT_PAGES}`);

    // Pre-create college folders
    const uniqueColleges = new Set(
      faculties.map(f => f.college?.name || 'No College')
    );
    
    console.log(`\nPre-creating ${uniqueColleges.size} college folders...`);
    for (const collegeName of uniqueColleges) {
      await findOrCreateFolder(drive, facultyIdsFolderId, collegeName, folderCache);
      console.log(`✓ ${collegeName}`);
    }

    // SSE Stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'started',
            total: totalFaculties,
            eventTitle: event.title,
            config: {
              batchSize: CONFIG.BATCH_SIZE,
              concurrentPages: CONFIG.CONCURRENT_PAGES
            },
            colleges: uniqueColleges.size
          })}\n\n`));

          let totalProcessed = 0;
          let totalSuccessful = 0;
          let totalFailed = 0;
          const allErrors: Array<{ email: string; error: string }> = [];

          const totalBatches = Math.ceil(totalFaculties / CONFIG.BATCH_SIZE);

          for (let i = 0; i < totalFaculties; i += CONFIG.BATCH_SIZE) {
            const batch = faculties.slice(i, i + CONFIG.BATCH_SIZE);
            const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
            
            console.log(`\nBatch ${batchNumber}/${totalBatches} (${batch.length} faculties)`);
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'batch_started',
              batch: batchNumber,
              totalBatches: totalBatches,
              batchSize: batch.length
            })}\n\n`));
            
            const batchResults = await processBatch(
              batch,
              event,
              drive,
              facultyIdsFolderId,
              folderCache,
              CONFIG.CONCURRENT_PAGES
            );
            
            totalProcessed += batch.length;
            totalSuccessful += batchResults.successful;
            totalFailed += batchResults.failed;
            allErrors.push(...batchResults.errors);
            
            if (batchResults.successful > 0) {
              await incrementIdCardGenerated(event_id, batchResults.successful);
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'batch_complete',
              batch: batchNumber,
              totalBatches: totalBatches,
              batchSuccessful: batchResults.successful,
              batchFailed: batchResults.failed,
              totalProcessed: totalProcessed,
              totalSuccessful: totalSuccessful,
              totalFailed: totalFailed,
              percentage: ((totalProcessed / totalFaculties) * 100).toFixed(2),
              total: totalFaculties
            })}\n\n`));
            
            console.log(`Batch ${batchNumber}: ${batchResults.successful} OK, ${batchResults.failed} failed`);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'complete',
            total: totalFaculties,
            successful: totalSuccessful,
            failed: totalFailed,
            errors: allErrors.slice(0, 10),
            percentage: '100.00',
            message: 'All Faculty ID JPGs generated!'
          })}\n\n`));

          console.log(`\n✓ Complete: ${totalSuccessful}/${totalFaculties} successful`);

        } catch (error: any) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'error',
            message: error.message || 'Unknown error occurred'
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
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Sanitize a path segment for use as a Cloudinary folder/public_id component.
 * Removes characters that Cloudinary does not allow and trims whitespace.
 */
function sanitizeSegment(segment: string): string {
  return segment
    .replace(/[^a-zA-Z0-9_\-. ]/g, '_') // replace special chars
    .replace(/\s+/g, '_')               // spaces → underscores
    .replace(/_+/g, '_')                // collapse multiple underscores
    .replace(/^_|_$/g, '')              // trim leading/trailing _
    .substring(0, 100);                  // cap length
}

/**
 * Build an organized Cloudinary folder path.
 *
 * Example results:
 *   buildFolder("36th Convocation", "invitations", "College of Agri")
 *   → "gbpuat-event-pass/36th_Convocation/invitations/College_of_Agri"
 */
export function buildFolderPath(
  eventTitle: string,
  category: string,
  subfolder?: string
): string {
  const parts = [
    'gbpuat-event-pass',
    sanitizeSegment(eventTitle),
    sanitizeSegment(category),
  ];
  if (subfolder) {
    parts.push(sanitizeSegment(subfolder));
  }
  return parts.join('/');
}

// ─── Upload Functions ───────────────────────────────────────────────────

/**
 * Upload a PDF buffer to Cloudinary.
 *
 * Organized path:
 *   gbpuat-event-pass/<event>/<category>/<subfolder?>/<filename>.pdf
 *
 * @returns The secure download URL for the uploaded PDF.
 */
export async function uploadPdf(
  buffer: Buffer,
  eventTitle: string,
  subfolder: string | undefined,
  filename: string
): Promise<string> {
  const folderPath = buildFolderPath(eventTitle, 'invitations', subfolder);
  const publicId = sanitizeSegment(filename);

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'image',
          folder: folderPath,
          public_id: publicId,
          overwrite: true,
          format: 'pdf',
        },
        (error, result) => (error ? reject(error) : resolve(result!))
      )
      .end(buffer);
  });

  console.log(`☁ Uploaded PDF → ${folderPath}/${publicId}`);
  return result.secure_url;
}

/**
 * Upload a JPG buffer to Cloudinary (faculty ID cards).
 *
 * Organized path:
 *   gbpuat-event-pass/<event>/faculty_ids/<college>/<filename>.jpg
 *
 * Since this is an image, resource_type = 'image' so Cloudinary
 * can serve optimised transforms if needed later.
 *
 * @returns The secure URL for the uploaded image.
 */
export async function uploadJpg(
  buffer: Buffer,
  eventTitle: string,
  collegeName: string,
  filename: string
): Promise<string> {
  const folderPath = buildFolderPath(eventTitle, 'faculty_ids', collegeName);
  const publicId = sanitizeSegment(filename);

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'image',
          folder: folderPath,
          public_id: publicId,
          overwrite: true,
          format: 'jpg',
        },
        (error, result) => (error ? reject(error) : resolve(result!))
      )
      .end(buffer);
  });

  console.log(`☁ Uploaded JPG: ${publicId}`);
  return result.secure_url;
}

// ─── Legacy helpers (kept for backwards compat) ─────────────────────────

/** @deprecated Use `uploadPdf` instead. */
export async function uploadPdfToCloudinary(buffer: Buffer, publicId: string) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'image',
          public_id: publicId,
          folder: 'gbpuat-event-pass',
          overwrite: true,
          format: 'pdf',
        },
        (error, result) => (error ? reject(error) : resolve(result))
      )
      .end(buffer);
  });
}

/** @deprecated Use the secure_url returned by upload functions instead. */
export function getPdfUrl(publicId: string) {
  return cloudinary.url(publicId, {
    resource_type: 'image',
    format: 'pdf',
    secure: true,
  });
}
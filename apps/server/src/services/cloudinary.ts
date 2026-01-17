import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from '../config/index.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Media types
export type MediaType = 'image' | 'audio' | 'video';

// Upload options by media type
const uploadOptions: Record<MediaType, object> = {
  image: {
    folder: 'questions/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Max size
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  },
  audio: {
    folder: 'questions/audio',
    resource_type: 'video', // Cloudinary uses 'video' for audio too
    allowed_formats: ['mp3', 'wav', 'ogg', 'm4a'],
  },
  video: {
    folder: 'questions/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'webm', 'mov'],
    transformation: [
      { width: 1280, height: 720, crop: 'limit' },
      { quality: 'auto' },
    ],
  },
};

// Upload result interface
export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: string;
  width?: number;
  height?: number;
  duration?: number; // For audio/video
  bytes: number;
}

// Upload from buffer
export const uploadFromBuffer = async (
  buffer: Buffer,
  mediaType: MediaType,
  filename?: string
): Promise<UploadResult> => {
  const options = {
    ...uploadOptions[mediaType],
    public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined, // Remove extension
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options as any,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(formatResult(result));
        } else {
          reject(new Error('Upload failed: no result'));
        }
      }
    );

    uploadStream.end(buffer);
  });
};

// Upload from URL
export const uploadFromUrl = async (
  url: string,
  mediaType: MediaType
): Promise<UploadResult> => {
  const options = uploadOptions[mediaType];

  const result = await cloudinary.uploader.upload(url, options as any);
  return formatResult(result);
};

// Delete media
export const deleteMedia = async (
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === 'ok';
  } catch {
    return false;
  }
};

// Format upload result
const formatResult = (result: UploadApiResponse): UploadResult => {
  return {
    publicId: result.public_id,
    url: result.url,
    secureUrl: result.secure_url,
    format: result.format,
    resourceType: result.resource_type,
    width: result.width,
    height: result.height,
    duration: result.duration,
    bytes: result.bytes,
  };
};

// Check if Cloudinary is configured
export const isCloudinaryConfigured = (): boolean => {
  return !!(
    config.cloudinary.cloudName &&
    config.cloudinary.apiKey &&
    config.cloudinary.apiSecret
  );
};

export default cloudinary;

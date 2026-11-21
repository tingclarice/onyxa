import "server-only";

/** Only the cloud name and unsigned preset are intended for the browser. */
export function getCloudinaryUploadSettings() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  };
}

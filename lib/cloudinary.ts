/**
 * Helper to upload data URLs to Cloudinary when credentials are provided.
 * This uses a dynamic require so the project won't crash at import time if the
 * `cloudinary` package isn't installed. If Cloudinary isn't available or an
 * upload fails, the function returns null and callers should fallback.
 */
export async function uploadDataUrlToCloudinary(dataUrl: string, folder = 'joshper/documents') {
  try {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return null
    let cloudinary: any
    try {
      // dynamic require to avoid hard dependency at import time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cloudinary = require('cloudinary').v2
    } catch (err) {
      console.warn('Cloudinary SDK not installed; skipping upload to Cloudinary')
      return null
    }

    // configure from CLOUDINARY_URL or individual env vars
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL })
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
        api_key: process.env.CLOUDINARY_API_KEY || '',
        api_secret: process.env.CLOUDINARY_API_SECRET || '',
      })
    }

    const res = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: 'image',
      overwrite: true,
      use_filename: false,
    })
    return res?.secure_url || res?.url || null
  } catch (err) {
    console.error('Error uploading to Cloudinary', err)
    return null
  }
}

export default uploadDataUrlToCloudinary

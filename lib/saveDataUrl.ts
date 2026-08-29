import fs from "fs/promises"
import path from "path"

export async function saveDataUrlToPublicUploads(dataUrl: string, prefix = "img") {
  try {
    console.log("Attempting to save data URL with prefix:", prefix)
    const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/)
    if (!match) {
      console.error("Invalid data URL format")
      return null
    }
    const mime = match[1] // e.g. image/png
    const ext = match[2] || "png"
    const base64 = match[3]
    const buffer = Buffer.from(base64, "base64")

    // Save to the shared uploads volume served by the reverse proxy.
    const uploadsDir = path.join(process.cwd(), "uploads", prefix)
    console.log("Uploads directory:", uploadsDir)
    await fs.mkdir(uploadsDir, { recursive: true })

    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = path.join(uploadsDir, filename)
    console.log("Saving file to:", filePath)
    await fs.writeFile(filePath, buffer)

    // A relative URL works in every deployment and goes through the unified proxy.
    const fullUrl = `/uploads/${prefix}/${filename}`
    console.log("File saved successfully, full URL:", fullUrl)
    return fullUrl
  } catch (err) {
    console.error("Error saving data URL:", err)
    return null
  }
}

export default saveDataUrlToPublicUploads

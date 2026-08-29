import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/pg"
import { getUserFromRequest } from "@/lib/auth"
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import fs from 'fs'
import path from 'path'
import saveDataUrlToPublicUploads from '@/lib/saveDataUrl'
import uploadDataUrlToCloudinary from '@/lib/cloudinary'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      console.log("No user found in request")
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    console.log("Getting profile for user ID:", user.id)

    const result = await query(
      `SELECT
        id, nombre, apellido, email, cedula_pasaporte, documento_foto,
        numero_celular, profile_edits_count, last_profile_edit, created_at, is_admin
      FROM users
      WHERE id = $1
      LIMIT 1`,
      [user.id],
    )

    const profile = result.rows[0]

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
    }

    // If documento_foto points to /uploads/... but file is missing, clear it so frontend won't show broken image
    try {
      const docFoto = profile.documento_foto
      if (typeof docFoto === 'string' && docFoto.startsWith('http://localhost:8081/uploads/')) {
        // Normalize values written before uploads were served by the unified proxy.
        profile.documento_foto = docFoto.replace('http://localhost:8081', '')
      }
      if (typeof profile.documento_foto === 'string' && profile.documento_foto.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), profile.documento_foto.replace(/^\//, ''))
        try {
          await fs.promises.access(filePath, fs.constants.R_OK)
        } catch (err) {
          // file missing — clear the field so frontend shows placeholder
          profile.documento_foto = null
        }
      }
    } catch (e) {
      // ignore any file-check errors and return profile as-is
      console.error('Error checking documento_foto file existence', e)
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 })
    }

    console.log("User from token:", user)

    const currentResult = await query(
      `SELECT profile_edits_count, last_profile_edit, is_admin, documento_foto FROM users WHERE id = $1 LIMIT 1`,
      [user.id],
    )

    const currentProfile = currentResult.rows[0]

    if (!currentProfile) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (!currentProfile.is_admin) {
      const editCount = currentProfile.profile_edits_count || 0
      if (editCount >= 2) {
        const lastEdit = currentProfile.last_profile_edit ? new Date(currentProfile.last_profile_edit) : null
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        if (lastEdit && lastEdit > oneMonthAgo) {
          return NextResponse.json(
            {
              error: "Has alcanzado el límite de ediciones. Debes esperar un mes desde tu última edición.",
            },
            { status: 403 },
          )
        } else if (lastEdit && lastEdit <= oneMonthAgo) {
          await query(`UPDATE users SET profile_edits_count = 0 WHERE id = $1`, [user.id])
        }
      }
    }

    const data = await request.json()
    console.log("Received data:", data)

    if (!data.nombre || !data.apellido || !data.numero_celular || !data.email || !data.cedula_pasaporte) {
      return NextResponse.json({ error: "Nombre, apellido, número de celular, email y documento de identidad son requeridos" }, { status: 400 })
    }

    const nombre = String(data.nombre).trim()
    const apellido = String(data.apellido).trim()
    const numero_celular = String(data.numero_celular).trim()
    const email = String(data.email).trim()
    const cedula_pasaporte = String(data.cedula_pasaporte).trim()

    // Preserve existing documento_foto if not provided in update
    let documento_foto = currentProfile.documento_foto
    if (data.documento_foto !== undefined) {
      documento_foto = data.documento_foto ? String(data.documento_foto).trim() : null

      // If it's a data URL, save it to the shared uploads volume.
      if (documento_foto && documento_foto.startsWith('data:image')) {
        const saved = await saveDataUrlToPublicUploads(documento_foto, 'doc')
        if (saved) {
          documento_foto = saved
        } else {
          // If local save fails, try Cloudinary as fallback
          const cloudUrl = await uploadDataUrlToCloudinary(documento_foto)
          if (cloudUrl) {
            documento_foto = cloudUrl
          }
          // else keep the data URL in DB as fallback
        }
      } else if (documento_foto && !documento_foto.startsWith('http') && !documento_foto.startsWith('/uploads')) {
        // If it's just a filename, assume it belongs under uploads.
        documento_foto = `/uploads/${documento_foto}`
      }
    }

    const updateResult = await query(
      `UPDATE users
       SET
         nombre = $1,
         apellido = $2,
         email = $3,
         cedula_pasaporte = $4,
         numero_celular = $5,
         documento_foto = $6,
         profile_edits_count = COALESCE(profile_edits_count, 0) + 1,
         last_profile_edit = NOW(),
         updated_at = NOW()
       WHERE id = $7
       RETURNING id, documento_foto`,
      [nombre, apellido, email, cedula_pasaporte, numero_celular, documento_foto, user.id],
    )

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 400 })
    }

    return NextResponse.json({
      message: "Perfil actualizado exitosamente",
      documento_foto: updateResult.rows[0].documento_foto,
    })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

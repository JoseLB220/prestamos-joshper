import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { getClient } from "@/lib/pg"

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)

    if (!user || !user.is_admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const client = await getClient()

    const query = `
      SELECT 
        r.id,
        r.action_type,
        r.target_type,
        r.target_id,
        r.reason,
        r.revocation_reason,
        r.status,
        r.created_at,
        r.revoked_at,
        r.revoked_by_id,
        r.actor_id,
        u1.nombre as actor_nombre,
        u1.apellido as actor_apellido,
        u1.email as actor_email,
        u2.nombre as revoked_by_nombre,
        u2.apellido as revoked_by_apellido,
        u2.email as revoked_by_email,
        ra.description as action_description
      FROM revocations r
      JOIN users u1 ON r.actor_id = u1.id
      JOIN users u2 ON r.revoked_by_id = u2.id
      JOIN revocation_actions ra ON r.action_type = ra.action_code
      ORDER BY r.created_at DESC
      LIMIT 100
    `

    const result = await client.query(query)
    if (typeof client.release === "function") {
      client.release()
    }

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching revocations:", error)
    return NextResponse.json(
      { message: "Error fetching revocations" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)

    if (!user || !user.is_admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action_type, target_type, target_id, reason, original_data, revocation_reason } = body

    if (!action_type || !target_type || !target_id || !revocation_reason) {
      return NextResponse.json(
        { message: "Missing required fields: action_type, target_type, target_id, revocation_reason" },
        { status: 400 }
      )
    }

    const client = await getClient()

    const insertQuery = `
      INSERT INTO revocations (
        action_type,
        target_type,
        target_id,
        actor_id,
        original_data,
        reason,
        revocation_reason,
        revoked_by_id,
        status,
        effective_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    // apply a 30 hour delay before the revocation becomes effective
    const effectiveAtQuery = `NOW() + INTERVAL '30 hours'`

    const result = await client.query(insertQuery, [
      action_type,
      target_type,
      target_id,
      user.id,
      original_data || null,
      reason || null,
      revocation_reason,
      user.id,
      "pending",
      // pass the expression for effective_at
      // Note: we'll set it using a query fragment by selecting the expression
      // but since parametrized values don't accept expressions, use a follow-up update if needed.
      // For now set to NULL and update below.
      null,
    ])

    const rev = result.rows[0]

    // set effective_at to now + 30 hours
    await client.query('UPDATE revocations SET effective_at = NOW() + INTERVAL \'30 hours\' WHERE id = $1', [rev.id])

    // Notify all admins about this pending revocation
    try {
      const adminsRes = await client.query('SELECT id, email FROM users WHERE is_admin = TRUE')
      const admins = adminsRes.rows || []
      const msg = `Se ha iniciado una anulación pendiente (${action_type}) para ${target_type} ID ${target_id}. Razón: ${revocation_reason}`
      for (const a of admins) {
        await client.query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [a.id, 'revocation_pending', msg])
      }
    } catch (e) {
      console.error('Error creating admin notifications for revocation', e)
    }

    if (typeof client.release === "function") {
      client.release()
    }

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("Error creating revocation:", error)
    return NextResponse.json(
      { message: "Error creating revocation" },
      { status: 500 }
    )
  }
}

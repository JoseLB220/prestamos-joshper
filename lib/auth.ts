import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { query } from "@/lib/pg"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

if (process.env.NODE_ENV === "production" && JWT_SECRET === "your-secret-key") {
  console.warn("⚠️ ADVERTENCIA DE SEGURIDAD: JWT_SECRET está usando el valor por defecto en producción. Por favor define una clave segura en las variables de entorno.")
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function comparePassword(password: string, hash: string): boolean {
  if (!password || !hash) return false
  return bcrypt.compareSync(password, hash)
}


export function generateToken(user: {
  id: number
  email: string
  is_admin: boolean
  can_request_loans: boolean
  can_associate_companies: boolean
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      can_request_loans: user.can_request_loans,
      can_associate_companies: user.can_associate_companies,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  )
}

export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number }
    const result = await query(
      `SELECT id, email, is_admin, can_request_loans, can_associate_companies
      FROM users
      WHERE id = $1
      LIMIT 1`,
      [decoded.id]
    )
    return result.rows[0] || null
  } catch (err) {
    console.error("Error verifying token:", err)
    return null
  }
}

export async function getUserFromRequest(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value || request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      console.log("No auth token found")
      return null
    }

    const user = await verifyToken(token)
    if (!user) {
      console.log("Invalid token or user not found")
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting user from request:", error)
    return null
  }
}

export async function requireAuth(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    throw new Error("Authentication required")
  }
  return user
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user.is_admin) {
    throw new Error("Admin access required")
  }
  return user
}



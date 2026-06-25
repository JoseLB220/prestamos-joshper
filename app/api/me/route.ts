// app/api/me/route.ts
import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
const user = await getUserFromRequest(request as any)
if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
}
return NextResponse.json(user)
}
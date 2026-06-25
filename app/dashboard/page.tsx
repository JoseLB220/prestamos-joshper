import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/pg"
import Navigation from "@/components/navigation"
import UserDashboard from "@/components/user-dashboard"

export default async function DashboardPage() {
  const cookieStore = cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) {
    redirect("/auth/login")
  }

  const user = await verifyToken(token)
  if (!user) {
    redirect("/auth/login")
  }

  // Fetch full user profile from the database so the client components receive
  // fields like `cedula_pasaporte` and `numero_celular` (used to auto-fill forms).
  let fullUser = user
  try {
    const res = await query(
      `SELECT id, nombre, apellido, email, cedula_pasaporte, numero_celular, is_admin, can_request_loans, can_associate_companies
       FROM users WHERE id = $1 LIMIT 1`,
      [user.id],
    )
    if (res && res.rows && res.rows[0]) {
      fullUser = res.rows[0]
    }
  } catch (err) {
    // If DB lookup fails, continue with the token-decoded user to avoid blocking the page.
    console.error('Error fetching full user profile for dashboard:', err)
  }

  return (
    <div className="overlay">
      <Navigation user={fullUser} />
      <UserDashboard user={fullUser} />
    </div>
  )
}

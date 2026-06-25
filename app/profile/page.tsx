import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"
import Navigation from "@/components/navigation"
import ProfilePage from "@/components/profile-page"

export default async function Profile() {
  const cookieStore = cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) {
    redirect("/auth/login")
  }

  const user = await verifyToken(token)
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="overlay">
      <Navigation user={user} />
      <ProfilePage user={user} />
    </div>
  )
}

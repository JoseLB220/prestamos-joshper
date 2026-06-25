import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import Navigation from "@/components/navigation"
import HomePage from "@/components/home-page"


export default async function Home() {
  const cookieStore = cookies()
  const token = cookieStore.get("auth-token")?.value

  let user = null
  if (token) {
    const decoded = await verifyToken(token)
    if (decoded) {
      user = decoded
    }
  }

  return (
    <div className="overlay">
      <Navigation user={user} />
      <HomePage user={user} />
    </div>
  )
}

import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import Navigation from "@/components/navigation"
import AboutPage from "@/components/about-page"

export default async function About() {
  const cookieStore = cookies()
  const token = cookieStore.get("auth-token")?.value

  let user = null
  if (token) {
    const decoded = verifyToken(token)
    if (decoded) {
      user = decoded
    }
  }

  return (
    <div className="overlay">
      <Navigation user={user} />
      <AboutPage />
    </div>
  )
}

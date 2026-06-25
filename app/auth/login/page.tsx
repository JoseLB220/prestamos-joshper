import Navigation from "@/components/navigation"
import LoginForm from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="overlay">
      <Navigation />
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoginForm />
      </div>
    </div>
  )
}

import Navigation from "@/components/navigation"
import RegisterForm from "@/components/register-form"

export default function RegisterPage() {
  return (
    <div className="overlay">
      <Navigation />
      <div className="min-h-screen flex items-center justify-center p-4">
        <RegisterForm />
      </div>
    </div>
  )
}

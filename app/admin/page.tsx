import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Navigation from "@/components/navigation";
import AdminDashboard from "@/components/admin-dashboard";

export default async function AdminPage() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return redirect("/auth/login");
    }

    const user = await verifyToken(token);

    if (!user || !user.is_admin) {
      return redirect("/dashboard");
    }

    return (
      <div className="overlay">
        <Navigation user={user} />
        <AdminDashboard user={user} />
      </div>
    );
  } catch (error) {
    // Si ocurre error (token inválido, expirado), redirige al login
    return redirect("/auth/login");
  }
}

import AdminHistory from '@/components/admin-history'
import Navigation from '@/components/navigation'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AdminHistoryPage() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    if (!token) return redirect('/auth/login')
    const user = await verifyToken(token)
    if (!user || !user.is_admin) return redirect('/dashboard')

    return (
      <div className="overlay" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <Navigation user={user} />
        <div className="content-container">
          <AdminHistory />
        </div>
      </div>
    )
  } catch (e) {
    return redirect('/auth/login')
  }
}

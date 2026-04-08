import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.user.isBlocked === true) {
    const reason = session.user.blockReason || 'Manual block'
    redirect(`/login?blocked=true&reason=${encodeURIComponent(reason)}`)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-eve-dark">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

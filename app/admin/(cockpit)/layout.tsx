import { redirect } from 'next/navigation'
import { hasValidCeoSession } from '@/lib/ceo/auth'

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasValidCeoSession()) redirect('/admin/login')
  return children
}

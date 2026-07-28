import { redirect } from 'next/navigation'
import { hasValidAdminSession } from '@/lib/ceo/auth'

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  if (!hasValidAdminSession()) redirect('/admin/login')
  return children
}

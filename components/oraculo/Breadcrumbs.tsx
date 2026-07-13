import Link from 'next/link'
export default function Breadcrumbs({ items }: { items: readonly { name: string; href?: string }[] }) {
  return <nav aria-label="Breadcrumb"><ol className="flex flex-wrap gap-2 text-sm text-slate-500">{items.map((item, index) => <li key={item.name} className="flex gap-2">{index > 0 && <span aria-hidden="true">/</span>}{item.href ? <Link href={item.href} className="font-medium hover:text-blue-700">{item.name}</Link> : <span aria-current="page">{item.name}</span>}</li>)}</ol></nav>
}

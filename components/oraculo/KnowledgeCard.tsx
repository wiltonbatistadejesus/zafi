import Link from 'next/link'
import { categoryMap, entryHref, type Entry } from '@/lib/oraculo'
export default function KnowledgeCard({ entry }: { entry: Entry }) {
  return <Link href={entryHref(entry)} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"><span className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">{categoryMap[entry.category].name}</span><h3 className="mt-3 text-lg font-extrabold leading-snug group-hover:text-blue-700">{entry.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{entry.description}</p><span className="mt-5 text-sm font-bold text-blue-700">Consultar resposta →</span></Link>
}

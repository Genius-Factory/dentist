import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Database } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function DatabasePage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(`${API_URL}/api/records/admin/database`, { headers: { Authorization: `Bearer ${await getToken()}` } })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load database')
      setTables(body)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  useEffect(() => { if (isLoaded && user?.publicMetadata?.role === 'admin') load() }, [isLoaded, user])
  if (!isLoaded) return <div className="p-6 text-slate-600">Loading DB...</div>
  if (!user) return <Navigate to="/sign-in?redirect_url=/db" replace />
  if (user.publicMetadata?.role !== 'admin') return <Navigate to="/" replace />
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-sky-700"><Database size={20} /><span className="text-sm font-semibold">Admin</span></div><h1 className="mt-2 text-3xl font-semibold text-slate-900">DB</h1><p className="mt-2 text-slate-600">All database tables and their stored records.</p></div><button onClick={load} className="rounded-full border px-4 py-2 text-sm font-semibold">Refresh</button></div>{loading ? <p className="py-12 text-center">Loading database...</p> : error ? <p className="py-12 text-center text-red-600">{error}</p> : <div className="mt-8 space-y-6">{tables.map(({ name, records }) => <section key={name} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold text-slate-900">{name}</h2><p className="text-sm text-slate-500">{records.length} records</p></div>{records.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50">{Object.keys(records[0]).map((key) => <th key={key} className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{key}</th>)}</tr></thead><tbody>{records.map((record, index) => <tr key={index} className="border-b last:border-0">{Object.keys(records[0]).map((key) => <td key={key} className="max-w-xs break-words px-4 py-3 text-slate-700">{record[key] === null ? '—' : typeof record[key] === 'object' ? JSON.stringify(record[key]) : String(record[key])}</td>)}</tr>)}</tbody></table></div> : <p className="p-5 text-sm text-slate-500">No records.</p>}</section>)}</div>}</div>
}

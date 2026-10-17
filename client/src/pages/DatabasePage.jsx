import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { AlertTriangle, Database } from 'lucide-react'
import { normalizeRole } from '../lib/bookings'
import logger from '../lib/logger'
import DatabaseLoading from '../components/DatabaseLoading'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const HIDDEN_COLUMNS = new Set(['profile_picture'])

function getVisibleColumns(records) {
  if (!records.length) return []
  return Object.keys(records[0]).filter((key) => !HIDDEN_COLUMNS.has(key))
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function DatabasePage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState('')
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [testLogStatus, setTestLogStatus] = useState('')

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/records/admin/database?${new URLSearchParams({ ...(selectedTable ? { table: selectedTable } : {}), page })}`, {
        signal,
        headers: { Authorization: `Bearer ${await getToken()}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load database')
      if (signal?.aborted) return
      setTables(body.tables)
      setRecords(body.records)
      setHasMore(body.hasMore)
    } catch (err) {
      if (!signal?.aborted) setError(err.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [getToken, selectedTable, page])

  useEffect(() => {
    const controller = new AbortController()
    if (isLoaded && ['admin', 'superadmin'].includes(normalizeRole(user?.publicMetadata?.role))) load(controller.signal)
    return () => controller.abort()
  }, [isLoaded, load, user])

  const triggerFailedApiLog = async () => {
    setTestLogStatus('Sending failed API call...')

    try {
      const response = await fetch(`${API_URL}/api/debug/fail-log-test`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || `Expected failure returned ${response.status}`)
      }
      setTestLogStatus('Unexpected success')
    } catch (err) {
      logger.error('Temporary failed API log test', {
        route: '/api/debug/fail-log-test',
        page: 'DatabasePage',
        message: err.message,
      })
      setTestLogStatus(`Logged expected failure: ${err.message}`)
    }
  }

  const tableViews = useMemo(
    () => tables.length ? [{ name: selectedTable || tables[0], records, columns: getVisibleColumns(records) }] : [],
    [tables, selectedTable, records],
  )

  if (!isLoaded) return <div className="p-6"><DatabaseLoading label="Loading database access…" className="py-0" /></div>
  if (!user) return <Navigate to="/sign-in?redirect_url=/db" replace />
  if (!['admin', 'superadmin'].includes(normalizeRole(user.publicMetadata?.role))) return <Navigate to="/" replace />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700">
            <Database size={20} />
            <span className="text-sm font-semibold">Admin</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">DB</h1>
          <p className="mt-2 text-slate-600">All database tables and their stored records.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={triggerFailedApiLog}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <AlertTriangle size={16} />
            Test Error Log
          </button>
          <button onClick={() => load()} disabled={loading} className="rounded-full border px-4 py-2 text-sm font-semibold">Refresh</button>
        </div>
      </div>
      {testLogStatus && <p className="mt-3 text-sm text-slate-600">{testLogStatus}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label htmlFor="database-table" className="text-sm font-medium">Table</label>
        <select id="database-table" value={selectedTable || tables[0] || ''} disabled={loading} onChange={(event) => { setSelectedTable(event.target.value); setPage(1) }} className="rounded-lg border bg-white px-3 py-2 text-sm">
          {tables.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <button disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button>
        <span className="text-sm">Page {page}</span>
        <button disabled={loading || !!error || !hasMore} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button>
      </div>
      {loading ? (
        <DatabaseLoading label="Loading database records…" />
      ) : error ? (
        <p className="py-12 text-center text-red-600">{error}</p>
      ) : (
        <div className="mt-8 space-y-6">
          {tableViews.map(({ name, records, columns }) => (
            <section key={name} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="font-semibold text-slate-900">{name}</h2>
                <p className="text-sm text-slate-500">{records.length} records on this page</p>
              </div>
              {records.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        {columns.map((key) => (
                          <th key={key} className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => (
                        <tr key={index} className="border-b last:border-0">
                          {columns.map((key) => {
                            const value = formatCellValue(record[key])
                            return (
                              <td key={key} className="max-w-xs truncate px-4 py-3 text-slate-700" title={value}>
                                {value}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-5 text-sm text-slate-500">No records.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

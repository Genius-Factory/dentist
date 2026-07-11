/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Edit3, Search, Trash2, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const ROLES = ['admin', 'librarian', 'member', 'secretary']

function formatDate(value) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function EditUserDialog({ user, onClose, onSave, saving }) {
  const [username, setUsername] = useState(user.username || '')
  const [role, setRole] = useState(user.role || 'member')

  const submit = (event) => {
    event.preventDefault()
    onSave({ username: username.trim(), role })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="edit-user-title" className="text-xl font-semibold text-slate-900">Edit user</h2>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close edit dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Role
            <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
              {ROLES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving || !username.trim()} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserRecordsPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const request = async (path, options = {}) => {
    const token = await getToken()
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'Request failed')
    return body
  }

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await request('/api/users'))
    } catch (requestError) {
      setError(requestError.message || 'Unable to load user records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && user) loadUsers()
    // loadUsers reads the current Clerk token and is intentionally invoked when auth state settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user])

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((record) => [record.username, record.email, record.role].some((value) => String(value || '').toLowerCase().includes(query)))
  }, [search, users])

  const saveUser = async (values) => {
    setSaving(true)
    try {
      const updatedUser = await request(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      })
      setUsers((records) => records.map((record) => record.id === updatedUser.id ? updatedUser : record))
      setEditingUser(null)
      toast.success('User record updated')
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to update user record')
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (record) => {
    const confirmed = window.confirm(`Delete the database record for ${record.email}? Their Clerk sign-in account will remain active and may recreate this record later.`)
    if (!confirmed) return

    setDeletingId(record.id)
    try {
      await request(`/api/users/${record.id}`, { method: 'DELETE' })
      setUsers((records) => records.filter((item) => item.id !== record.id))
      toast.success('Database record deleted')
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to delete user record')
    } finally {
      setDeletingId('')
    }
  }

  if (!isLoaded) return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Loading user records...</div>
  if (!user) return <Navigate to="/sign-in?redirect_url=/users" replace />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-700"><Users size={20} /><span className="text-sm font-semibold">Database</span></div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">User Records</h1>
          <p className="mt-2 text-slate-600">View and manage the live user records without opening the database directly.</p>
        </div>
        <Link to="/" className="w-fit rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back to home</Link>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username, email, or role" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500" />
          </div>
          <button type="button" onClick={loadUsers} disabled={loading} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Refresh</button>
        </div>

        {loading ? <p className="py-12 text-center text-slate-600">Loading user records...</p> : error ? (
          <div className="py-12 text-center"><p className="text-red-600">{error}</p><button type="button" onClick={loadUsers} className="mt-4 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Try again</button></div>
        ) : visibleUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-600">{users.length === 0 ? 'No user records are in the database yet.' : 'No user records match your search.'}</div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3 font-semibold">Username</th><th className="px-3 py-3 font-semibold">Email</th><th className="px-3 py-3 font-semibold">Role</th><th className="px-3 py-3 font-semibold">Created</th><th className="px-3 py-3 text-right font-semibold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((record) => (
                  <tr key={record.id} className="text-slate-700">
                    <td className="px-3 py-4 font-medium text-slate-900">{record.username || '—'}</td>
                    <td className="px-3 py-4">{record.email}</td>
                    <td className="px-3 py-4"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700">{record.role}</span></td>
                    <td className="px-3 py-4">{formatDate(record.created_at)}</td>
                    <td className="px-3 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingUser(record)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 font-semibold text-sky-700 hover:bg-sky-50"><Edit3 size={15} /> Edit</button><button type="button" onClick={() => deleteUser(record)} disabled={deletingId === record.id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /> {deletingId === record.id ? 'Deleting...' : 'Delete'}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} onSave={saveUser} saving={saving} />}
    </div>
  )
}

/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { getServiceUsage } from '../lib/recordsApi'

export default function ServiceTransferDialog({ services, source, deactivate, getToken, onClose, onTransfer }) {
  const [fromId, setFromId] = useState(source?.id || '')
  const [toId, setToId] = useState('')
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setUsage(null); setToId(''); setError('')
    if (!fromId) return
    setLoading(true)
    getServiceUsage(getToken, fromId).then((value) => { if (active) setUsage(value) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fromId, getToken])
  const destinations = services.filter((item) => item.id !== fromId && item.status === 'active' && usage &&
    usage.durations.every((duration) => Number(duration) === Number(item.duration)) &&
    usage.dentists.every((id) => item.dentists.some((dentist) => dentist.id === id)))
  const submit = async (event) => {
    event.preventDefault()
    if (saving || !toId || !usage?.upcoming) return
    setSaving(true); setError('')
    try { await onTransfer(fromId, toId); onClose() } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
    <form role="dialog" aria-modal="true" aria-labelledby="transfer-title" onSubmit={submit} className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
      <h2 id="transfer-title" className="text-xl font-bold">{deactivate ? 'Transfer before deactivating' : 'Transfer bookings'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">From service<select required value={fromId} disabled={saving || deactivate} onChange={(event) => setFromId(event.target.value)} className="rounded-xl border border-slate-200 p-3"><option value="">Choose a service</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium">To service<select required value={toId} disabled={saving || loading || !usage?.upcoming} onChange={(event) => setToId(event.target.value)} className="rounded-xl border border-slate-200 p-3"><option value="">Choose a replacement</option>{destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {loading && <p role="status" className="text-sm text-slate-500">Checking attached appointments…</p>}
      {usage && <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{usage.upcoming} upcoming pending or approved appointment(s) will be transferred. Past appointments remain on the original service.</p>}
      {usage?.upcoming > 0 && !destinations.length && <p className="text-sm text-amber-700">No compatible replacement is available. Assign the booked dentists to an active service with the same appointment duration, then reopen this dialog.</p>}
      <p className="text-sm text-slate-500">Patient, dentist, date, time, booked price, approval status, and existing payments stay unchanged. Only services matching all booked dentists and durations are listed.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose}>Cancel</button><button disabled={saving || loading || !usage?.upcoming || !toId} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Transferring…' : deactivate ? 'Transfer & deactivate' : 'Transfer'}</button></div>
    </form>
  </div>
}

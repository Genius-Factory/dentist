/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/clerk-react'
import { LoaderCircle, X } from 'lucide-react'
import { confirmCharge, getBilling, recordPayment, voidPayment } from '../lib/recordsApi'
import { localDate, money } from '../lib/finance'

export default function PaymentManager({ appointment }) {
  const [open, setOpen] = useState(false)
  return <><button type="button" onClick={() => setOpen(true)} className="rounded-full border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Manage Payment</button>{open && createPortal(<PaymentDialog appointment={appointment} onClose={() => setOpen(false)} />, document.body)}</>
}
function PaymentDialog({ appointment, onClose }) {
  const { getToken } = useAuth()
  const dialog = useRef(null)
  const mounted = useRef(true)
  const paymentRequest = useRef(null)
  const busy = useRef(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(localDate())
  const [voidId, setVoidId] = useState(null)
  const [reason, setReason] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setData(null); setError('')
    try {
      const next = await getBilling(getToken, appointment.id)
      if (!mounted.current) return
      setData(next)
      setAmount(next.charge ? '' : next.appointment.price ?? '')
      setDate(localDate())
    } catch (err) { if (mounted.current) setError(err.message) }
    finally { if (mounted.current) setLoading(false) }
  }, [getToken, appointment.id])
  useEffect(() => {
    mounted.current = true
    dialog.current.showModal()
    load()
    return () => { mounted.current = false }
  }, [load])
  async function save(action) {
    if (busy.current) return
    busy.current = true; setSaving(true); setError('')
    try {
      await action()
      paymentRequest.current = null
      window.dispatchEvent(new Event('billing-updated'))
      if (mounted.current) { setVoidId(null); setReason(''); await load() }
    } catch (err) { if (mounted.current) setError(err.message) }
    finally { busy.current = false; if (mounted.current) setSaving(false) }
  }
  function submit(event) {
    event.preventDefault()
    if (!data.charge) return save(() => confirmCharge(getToken, appointment.id, { amount, issuedDate: date }))
    const payload = `${amount}:${date}`
    if (paymentRequest.current?.payload !== payload) paymentRequest.current = { payload, id: crypto.randomUUID() }
    return save(() => recordPayment(getToken, appointment.id, { amount, receivedDate: date, id: paymentRequest.current.id }))
  }
  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-blue-500'
  return <dialog ref={dialog} onCancel={(event) => { if (busy.current) event.preventDefault(); else onClose() }} aria-labelledby="payment-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <div className="flex items-start justify-between gap-4"><div><h2 id="payment-title" className="text-xl font-bold">Manage Payment</h2><p className="mt-1 text-sm text-slate-500">{appointment.name} · {appointment.date}</p></div><button disabled={saving} onClick={onClose} aria-label="Close payment dialog" className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-40"><X size={20} /></button></div>
    {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}{!data && <button onClick={load} className="ml-2 underline">Retry</button>}</div>}
    {loading ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" />Loading billing…</p> : data && <>
      <div className="my-5 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">{data.charge?.service_name || data.appointment.service_name}</p>{data.charge ? <><p className="mt-1 text-xs text-slate-500">Charge issued {data.charge.issued_date} · USD</p><dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-slate-500">Charged</dt><dd className="mt-1 font-bold">{money(Math.round(Number(data.charge.amount) * 100))}</dd></div><div><dt className="text-xs text-slate-500">Collected</dt><dd className="mt-1 font-bold text-emerald-600">{money(data.collectedCents)}</dd></div><div><dt className="text-xs text-slate-500">Remaining</dt><dd className="mt-1 font-bold">{money(data.remainingCents)}</dd></div></dl></> : <p className="mt-2 text-sm text-slate-500">Confirm the charge to start tracking this appointment. Review the amount and issue date; the confirmed charge cannot be edited.</p>}</div>
      {(!data.charge || data.remainingCents > 0) && <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm">{data.charge ? 'Payment amount (USD)' : 'Confirm charge (USD)'}<input autoFocus type="number" required min={data.charge ? '0.01' : '0'} max={data.charge ? (data.remainingCents / 100).toFixed(2) : '99999999.99'} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></label><label className="grid gap-1 text-sm">{data.charge ? 'Received date' : 'Issue date'}<input type="date" required min={data.charge?.issued_date || '1900-01-01'} max={localDate()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></label></fieldset><button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : data.charge ? 'Record payment' : 'Confirm charge'}</button></form>}
      {data.charge && data.remainingCents === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">No outstanding balance.</p>}
      {data.charge && <section className="mt-6"><h3 className="font-semibold">Payment history</h3>{!data.payments.length && <p className="mt-3 text-sm text-slate-500">No payments recorded yet.</p>}<ul className="mt-3 divide-y divide-slate-100">{data.payments.map((payment) => <li key={payment.id} className="py-3"><div className="flex items-center justify-between gap-3"><div><p className={`text-sm font-semibold ${payment.voided_at ? 'text-slate-400 line-through' : ''}`}>{money(Math.round(Number(payment.amount) * 100))}</p><p className="text-xs text-slate-500">{payment.received_date}</p></div>{payment.voided_at ? <span className="text-xs text-rose-600">Voided</span> : <button disabled={saving} onClick={() => { setVoidId(payment.id); setReason('') }} className="text-xs font-semibold text-rose-600">Void payment</button>}</div>{payment.voided_at && <p className="mt-1 break-words text-xs text-slate-500">{payment.void_reason}</p>}{voidId === payment.id && <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); save(() => voidPayment(getToken, appointment.id, payment.id, reason)) }}><label className="grid gap-1 text-xs">Reason for voiding<input autoFocus required maxLength={1000} disabled={saving} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></label><div className="flex gap-3"><button disabled={saving || !reason.trim()} className="text-xs font-semibold text-rose-600 disabled:opacity-50">Confirm void</button><button type="button" disabled={saving} onClick={() => setVoidId(null)} className="text-xs text-slate-500">Cancel</button></div></form>}</li>)}</ul></section>}
    </>}
  </dialog>
}

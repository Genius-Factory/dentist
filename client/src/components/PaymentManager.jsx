/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/clerk-react'
import { LoaderCircle, X } from 'lucide-react'
import { confirmCharge, getBilling, recordPayment, voidPayment } from '../lib/recordsApi'
import { billingSummary, localDate, money } from '../lib/finance'
import { billingRead, pendingPaymentKey, readPendingPayment, persistPayment, clearPendingPayment } from '../lib/paymentRequests'

const statuses = {
  paid: ['Paid', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  partial: ['Partially paid', 'border-amber-200 bg-amber-50 text-amber-700'],
  unpaid: ['Unpaid', 'border-rose-200 bg-rose-50 text-rose-700'],
  not_billed: ['Not billed', 'border-slate-200 bg-slate-50 text-slate-600'],
}

export default function PaymentManager({ appointment, onBillingChange }) {
  const [open, setOpen] = useState(false)
  const { userId, sessionId } = useAuth()
  const status = statuses[appointment.billing?.status]
  return <><span className="payment-actions inline-flex flex-wrap items-center gap-3">{status && <span aria-label={`Payment status: ${status[0]}`} className={`rounded-full border px-3 py-1 text-xs font-semibold ${status[1]}`}>{status[0]}</span>}<button type="button" onClick={() => setOpen(true)} className="payment-open-button rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">{appointment.billing?.status === 'paid' ? 'Payment Details' : 'Manage Payment'}</button></span>{open && userId && createPortal(<PaymentDialog key={`${sessionId}:${appointment.id}`} userId={userId} sessionId={sessionId} appointment={appointment} onBillingChange={onBillingChange} onClose={() => setOpen(false)} />, document.body)}</>
}
function PaymentDialog({ appointment, onClose, userId, sessionId, onBillingChange }) {
  const { getToken } = useAuth()
  const token = useRef(getToken)
  token.current = getToken
  const billingChanged = useRef(onBillingChange)
  billingChanged.current = onBillingChange
  const dialog = useRef(null)
  const mounted = useRef(true)
  const generation = useRef(0)
  const busy = useRef(false)
  const paymentRequest = useRef(null)
  const storageKey = pendingPaymentKey(userId, appointment.id)
  const readKey = JSON.stringify([userId, sessionId, appointment.id])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(null)
  const [review, setReview] = useState(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(localDate())
  const [voidId, setVoidId] = useState(null)
  const [reason, setReason] = useState('')
  const load = useCallback(async (fresh = false) => {
    const current = ++generation.current
    setLoading(true); setData(null); setError('')
    try {
      const saved = readPendingPayment(storageKey)
      paymentRequest.current = saved
      setPending(saved)
      const next = await billingRead(readKey, () => getBilling(() => token.current(), appointment.id), fresh)
      if (!mounted.current || current !== generation.current) return
      if (saved && next.payments.some((payment) => payment.id === saved.id)) {
        clearPendingPayment(storageKey)
        paymentRequest.current = null
        setPending(null)
        setNotice('Payment recorded.')
        window.dispatchEvent(new Event('billing-updated'))
      }
      setData(next)
      billingChanged.current?.(appointment.id, billingSummary(next))
      setAmount(next.charge ? next.remainingCents > 0 ? (next.remainingCents / 100).toFixed(2) : '' : next.appointment.price ?? '')
      setDate(localDate())
    } catch (err) { if (mounted.current && current === generation.current) setError(err.message) }
    finally { if (mounted.current && current === generation.current) setLoading(false) }
  }, [storageKey, readKey, appointment.id])
  useEffect(() => {
    mounted.current = true
    if (!dialog.current.open) dialog.current.showModal()
    load()
    const current = generation.current
    return () => { mounted.current = false; generation.current = current + 1 }
  }, [load])
  async function save(action, message = 'Payment voided. Balance updated.') {
    if (busy.current || paymentRequest.current) return
    busy.current = true; setSaving(true); setError(''); setNotice('')
    try {
      await action()
      window.dispatchEvent(new Event('billing-updated'))
      if (mounted.current) {
        setNotice(message); setVoidId(null); setReason('')
        await load(true)
      }
    } catch (err) { if (mounted.current) setError(err.message) }
    finally { busy.current = false; if (mounted.current) setSaving(false) }
  }
  async function submitPayment() {
    if (busy.current || (!review && !paymentRequest.current)) return
    busy.current = true
    setSaving(true); setError(''); setNotice('')
    const retry = Boolean(paymentRequest.current)
    let submitted = false
    try {
      const request = paymentRequest.current || {
        id: crypto.randomUUID(), ...review, timezoneOffset: new Date().getTimezoneOffset(),
      }
      persistPayment(storageKey, request)
      paymentRequest.current = request
      setPending(request); setReview(null)
      submitted = true
      await recordPayment(() => token.current(), appointment.id, request)
      if (mounted.current) setNotice('Payment recorded.')
      // Keep the stored request until a fresh read confirms it, including when
      // the write succeeded but the following read fails.
      if (mounted.current) await load(true)
    } catch (err) {
      if (!mounted.current) return
      if (submitted && !retry && [400, 401, 403, 404, 409, 422].includes(err.status)) {
        try {
          clearPendingPayment(storageKey)
          paymentRequest.current = null; setPending(null)
        } catch { /* Leave the payment blocked when storage cannot be cleared. */ }
        await load(true)
      } else if (submitted) {
        await load(true)
      }
      if (mounted.current && (!submitted || paymentRequest.current || !retry && [400, 401, 403, 404, 409, 422].includes(err.status))) setError(err.message)
    } finally { busy.current = false; if (mounted.current) setSaving(false) }
  }
  function submit(event) {
    event.preventDefault()
    if (busy.current || paymentRequest.current || review || !data) return
    if (!data.charge) return save(() => confirmCharge(() => token.current(), appointment.id, { amount, issuedDate: date }), 'Charge confirmed. Review the prefilled payment below.')
    setVoidId(null)
    setReview({ amount: Number(amount).toFixed(2), receivedDate: date })
  }
  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-blue-500'
  return <dialog ref={dialog} onCancel={(event) => { if (busy.current) event.preventDefault(); else onClose() }} aria-labelledby="payment-title" className="payment-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <div className="flex items-start justify-between gap-4"><div><h2 id="payment-title" className="text-xl font-bold">Manage Payment</h2><p className="mt-1 text-sm text-slate-500">{appointment.name} · {appointment.date}</p></div><button disabled={saving} onClick={onClose} aria-label="Close payment dialog" className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-40"><X size={20} /></button></div>
    {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}{!data && <button disabled={saving || loading} onClick={() => load(true)} className="ml-2 underline">Retry</button>}</div>}
      {pending && <section aria-label="Pending payment" className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm text-slate-900">
        <p role="status">{notice === 'Payment recorded.' ? 'Payment recorded. Refresh billing before recording another payment.' : 'Payment status not confirmed. Resolve this payment before recording another.'}</p>
        <p>{money(Math.round(Number(pending.amount) * 100))} &middot; {pending.receivedDate}</p>
        <div className="flex gap-4"><button type="button" disabled={saving || loading} onClick={() => load(true)}>Check payment status</button>{notice !== 'Payment recorded.' && <button type="button" disabled={saving || loading || !data} onClick={submitPayment}>Retry same payment</button>}</div>
      </section>}
    {loading ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" />Loading billing…</p> : data && <>
      <div className="payment-summary my-5 rounded-xl bg-slate-50 p-5"><p className="text-sm font-semibold">{data.charge?.service_name || data.appointment.service_name}</p>{data.charge ? <><p className="mt-1 text-xs text-slate-500">Charge issued {data.charge.issued_date} · USD</p><dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-slate-500">Charged</dt><dd className="mt-1 text-xl font-bold">{money(Math.round(Number(data.charge.amount) * 100))}</dd></div><div><dt className="text-xs text-slate-500">Collected</dt><dd className="mt-1 text-xl font-bold text-emerald-600">{money(data.collectedCents)}</dd></div><div><dt className="text-xs text-slate-500">Remaining</dt><dd className="mt-1 text-xl font-bold">{money(data.remainingCents)}</dd></div></dl></> : <p className="mt-2 text-sm text-slate-500">Confirm the charge to start tracking this appointment. Review the amount and issue date; the confirmed charge cannot be edited.</p>}</div>
      {!pending && !review && (!data.charge || data.remainingCents > 0) && <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm">{data.charge ? 'Payment amount (USD)' : 'Confirm charge (USD)'}<input autoFocus type="number" required min={data.charge ? '0.01' : '0'} max={data.charge ? (data.remainingCents / 100).toFixed(2) : '99999999.99'} step="0.01" value={amount} onFocus={(event) => event.target.select()} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></label><label className="grid gap-1 text-sm">{data.charge ? 'Received date' : 'Issue date'}<input type="date" required min={data.charge?.issued_date || '1900-01-01'} max={localDate()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></label></fieldset>{data.charge && <p className="text-sm text-slate-500">The remaining balance is filled in. Change it for a partial payment.</p>}{data.charge && Number(amount) * 100 > data.remainingCents && <p role="alert" className="text-sm text-rose-600">Payment cannot exceed the remaining balance of {money(data.remainingCents)}.</p>}<button disabled={saving || Boolean(data.charge && (Number(amount) <= 0 || Number(amount) * 100 > data.remainingCents))} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : data.charge ? 'Submit payment' : 'Confirm charge'}</button></form>}
      {review && <section aria-label="Review payment" className="space-y-4 rounded-xl border border-blue-200 p-4">
        <h3 tabIndex={-1} ref={(node) => node?.focus()} className="font-semibold">Review payment</h3>
        <p>{appointment.name} &middot; {data.charge.service_name}</p>
        <dl className="space-y-2 text-sm"><div><dt>Payment amount</dt><dd>{money(Math.round(Number(review.amount) * 100))}</dd></div><div><dt>Received date</dt><dd>{review.receivedDate}</dd></div><div><dt>Balance after payment</dt><dd>{money(data.remainingCents - Math.round(Number(review.amount) * 100))}</dd></div></dl>
        <div className="flex gap-4"><button type="button" disabled={saving} onClick={() => setReview(null)}>Back</button><button type="button" disabled={saving} onClick={submitPayment} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirm payment</button></div>
      </section>}
      {data.charge && data.remainingCents === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">No outstanding balance.</p>}
      {data.charge && <section className="mt-6"><h3 className="font-semibold">Payment history</h3>{!data.payments.length && <p className="mt-3 text-sm text-slate-500">No payments recorded yet.</p>}<ul className="mt-3 divide-y divide-slate-100">{data.payments.map((payment) => <li key={payment.id} className="py-3"><div className="flex items-center justify-between gap-3"><div><p className={`text-sm font-semibold ${payment.voided_at ? 'text-slate-400 line-through' : ''}`}>{money(Math.round(Number(payment.amount) * 100))}</p><p className="text-xs text-slate-500">{payment.received_date}</p></div>{payment.voided_at ? <span className="text-xs text-rose-600">Voided</span> : <button disabled={saving || Boolean(pending) || Boolean(review)} onClick={() => { setVoidId(payment.id); setReason('') }} className="text-xs font-semibold text-rose-600">Void payment</button>}</div>{payment.voided_at && <p className="mt-1 break-words text-xs text-slate-500">{payment.void_reason}</p>}{voidId === payment.id && <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); save(() => voidPayment(() => token.current(), appointment.id, payment.id, reason)) }}><label className="grid gap-1 text-xs">Reason for voiding<input autoFocus required maxLength={1000} disabled={saving} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></label><div className="flex gap-3"><button disabled={saving || Boolean(pending) || !reason.trim()} className="text-xs font-semibold text-rose-600 disabled:opacity-50">Confirm void</button><button type="button" disabled={saving} onClick={() => setVoidId(null)} className="text-xs text-slate-500">Cancel</button></div></form>}</li>)}</ul></section>}
    </>}
  </dialog>
}

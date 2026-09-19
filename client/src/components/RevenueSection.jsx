/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, LoaderCircle, TrendingUp } from 'lucide-react'
import { getRevenue } from '../lib/recordsApi'
import { money, presetRange } from '../lib/finance'
import { RevenueLine, RevenueRing } from './RevenueCharts'

const chartColors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#f45383', '#94a3b8', '#06b6d4', '#c084fc']

export default function RevenueSection({ getToken }) {
  const [dates, setDates] = useState(() => presetRange('Month'))
  const [draft, setDraft] = useState(dates)
  const [preset, setPreset] = useState('Month')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    window.addEventListener('billing-updated', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('billing-updated', refresh); window.removeEventListener('focus', refresh) }
  }, [refresh])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getRevenue(getToken, dates.start, dates.end).then((result) => { if (active) setData(result) }).catch((err) => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [getToken, dates, revision])
  function choosePreset(value) { const next = presetRange(value); setPreset(value); setDates(next); setDraft(next) }
  const services = data?.services.map((service, i) => ({ ...service, color: chartColors[i % chartColors.length] })) || []
  const status = data?.status
  const inputClass = 'min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:outline-blue-500'
  return <section className="mt-6" aria-label="Revenue analytics" aria-busy={loading}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-lg font-bold">Revenue analytics</h2><p className="text-xs text-slate-500">USD · {dates.start} to {dates.end}</p></div>
      <div className="flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); setPreset('Custom'); setDates({ ...draft }) }}>
          <label className="grid gap-1 text-xs text-slate-500">From<input aria-label="Revenue start date" type="date" required min="1900-01-01" max={draft.end} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={inputClass} /></label>
          <label className="grid gap-1 text-xs text-slate-500">To<input aria-label="Revenue end date" type="date" required min={draft.start} max="9999-12-31" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={inputClass} /></label>
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Apply</button>
        </form>
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Revenue period">{['Day', 'Week', 'Month', 'Year'].map((value) => <button key={value} onClick={() => choosePreset(value)} aria-pressed={preset === value} className={`rounded-lg px-3 py-2 text-xs font-semibold ${preset === value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>{value}</button>)}</div>
      </div>
    </div>
    {loading ? <div role="status" className="flex min-h-72 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin text-blue-600" />Loading revenue…</div> : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}<button onClick={refresh} className="ml-3 font-semibold underline">Retry</button></div> : data && <div className="grid gap-4 xl:grid-cols-[1.2fr_1.1fr_1fr]">
      <Card title="Revenue Overview" subtitle="Money received, by payment date">
        <RevenueLine data={data.timeline} />
        {!data.totalCents && <p className="mb-2 text-xs text-slate-500">No payments received in this period.</p>}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3"><TrendingUp size={17} className="mb-1 text-emerald-500" /><strong className="block text-sm">{money(data.totalCents)}</strong><p className="text-xs text-slate-500">Total collected</p><p className={`mt-1 text-xs ${data.changePercent < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{data.changePercent === null ? 'No prior revenue' : `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(1)}% vs. previous period`}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><CalendarDays size={17} className="mb-1 text-blue-600" /><strong className="block text-sm">{money(data.averageCents)}</strong><p className="text-xs text-slate-500">Average per {data.interval}</p><p className="mt-1 text-xs text-slate-400">Including empty intervals</p></div>
        </div>
      </Card>
      <Card title="Revenue by Service" subtitle="Distribution of received payments">
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
          <div className="w-44 shrink-0"><RevenueRing total={data.totalCents} center={money(data.totalCents)} caption="Total collected" label={`Revenue by service: ${money(data.totalCents)}`} segments={services.map((s) => ({ name: s.name, value: s.amountCents, color: s.color }))} /></div>
          <ul className="w-full space-y-3 text-xs">{services.map((service) => <li key={service.name} className="flex items-start gap-2"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: service.color }} /><span className="min-w-0 flex-1 break-words text-slate-500">{service.name}<span className="block text-slate-700">{money(service.amountCents)}</span></span><strong>{service.percent.toFixed(1)}%</strong></li>)}{!services.length && <li className="text-center text-slate-500">No revenue by service yet.</li>}</ul>
        </div>
      </Card>
      <Card title="Payment Status" subtitle="Charges issued in the selected range">
        <div className="mt-5"><RevenueRing total={status.chargedCents} center={status.chargedCents ? `${Math.round(status.collectedCents / status.chargedCents * 100)}%` : '—'} caption="Collected" label={`${money(status.collectedCents)} collected; ${money(status.outstandingCents)} outstanding`} segments={[{ name: 'Collected', value: status.collectedCents, color: '#10b981' }, { name: 'Outstanding', value: status.outstandingCents, color: '#e2e8f0' }]} /></div>
        <dl className="mt-3 space-y-3 text-xs"><Amount label="Collected" value={status.collectedCents} color="#10b981" /><Amount label="Outstanding" value={status.outstandingCents} color="#e2e8f0" /><div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Total charged</dt><dd className="font-bold">{money(status.chargedCents)}</dd></div></dl>
        <p className="mt-3 text-[11px] text-slate-400">{!status.chargedCents ? 'No charge amounts in this period. ' : ''}Payments counted through {dates.end}.</p>
      </Card>
    </div>}
  </section>
}
function Card({ title, subtitle, children }) { return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs text-slate-500">{subtitle}</p>{children}</section> }
function Amount({ label, value, color }) { return <div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</dt><dd className="font-bold">{money(value)}</dd></div> }

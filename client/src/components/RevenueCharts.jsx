/* eslint-disable react/prop-types */
import { useId, useState } from 'react'
import { money } from '../lib/finance'

export function RevenueLine({ data }) {
  const gradient = useId()
  const [active, setActive] = useState(null)
  const max = Math.max(...data.map((point) => point.amountCents), 100)
  const ceiling = Math.ceil(max / 100) * 100
  const points = data.map((point, i) => ({ ...point, x: data.length === 1 ? 260 : 65 + i / (data.length - 1) * 390, y: 160 - point.amountCents / ceiling * 130 }))
  const path = points.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  const label = (date) => new Date(`${date.length === 7 ? `${date}-01` : date}T12:00:00`).toLocaleDateString('en-US', date.length === 7 ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' })
  return <div>
    <svg viewBox="0 0 480 200" className="mt-5 w-full overflow-visible" role="group" aria-label="Collected revenue by payment date">
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".24" /><stop offset="100%" stopColor="#2563eb" stopOpacity=".02" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((step) => <g key={step}><line x1="65" x2="455" y1={160 - step * 32.5} y2={160 - step * 32.5} stroke="#e8edf5" /><text x="57" y={164 - step * 32.5} textAnchor="end" fontSize="10" fill="#64748b">{new Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'USD', maximumFractionDigits: 1 }).format(ceiling * step / 400)}</text></g>)}
      <path d={`${path} L ${points.at(-1).x} 160 L ${points[0].x} 160 Z`} fill={`url(#${gradient})`} />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((point, i) => <g key={point.date}>
        {(i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 4) === 0) && <text x={point.x} y="184" textAnchor="middle" fontSize="10" fill="#64748b">{label(point.date)}</text>}
        <circle cx={point.x} cy={point.y} r={active === i ? 6 : 3.5} fill="#2563eb" stroke="white" strokeWidth="1.5" />
        <circle cx={point.x} cy={point.y} r="9" fill="transparent" tabIndex="0" role="img" aria-label={`${label(point.date)}: ${money(point.amountCents)}`} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(i)}><title>{label(point.date)}: {money(point.amountCents)}</title></circle>
      </g>)}
    </svg>
    <p className="min-h-5 text-center text-xs text-slate-500" aria-live="polite">{active !== null && points[active] ? `${label(points[active].date)} · ${money(points[active].amountCents)}` : 'Hover or focus a point to see revenue'}</p>
  </div>
}

export function RevenueRing({ segments, total, center, caption, label }) {
  let offset = 0
  return <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-[210px] shrink-0" role="img" aria-label={label}>
    <circle cx="100" cy="100" r="76" fill="none" stroke="#e2e8f0" strokeWidth="27" />
    {total > 0 && segments.map((segment, i) => {
      const percent = segment.value / total * 100
      const start = offset
      offset += percent
      return <circle key={i} cx="100" cy="100" r="76" fill="none" stroke={segment.color} strokeWidth="27" pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"><title>{segment.name}: {money(segment.value)} ({percent.toFixed(1)}%)</title></circle>
    })}
    <text x="100" y="98" textAnchor="middle" fill="#0f172a" fontWeight="700" fontSize={center.length > 12 ? 13 : 20}>{center}</text>
    <text x="100" y="119" textAnchor="middle" fill="#64748b" fontSize="11">{caption}</text>
  </svg>
}

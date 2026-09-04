/* eslint-disable react/prop-types */
import { LoaderCircle } from 'lucide-react'

export default function DatabaseLoading({ label = 'Loading database data…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-10 text-sm text-slate-500 ${className}`} role="status" aria-live="polite">
      <LoaderCircle className="animate-spin text-blue-600" size={20} />
      <span>{label}</span>
    </div>
  )
}

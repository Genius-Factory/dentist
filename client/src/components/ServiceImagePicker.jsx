/* eslint-disable react/prop-types */
import { useState } from 'react'
import clinicVisit from '../assets/clinic-visit.png'

export default function ServiceImagePicker({ value, onChange, onBusyChange, disabled }) {
  const [error, setError] = useState('')
  const chooseImage = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image up to 2 MB.')
      return
    }
    setError('')
    onBusyChange(true)
    const reader = new FileReader()
    reader.onload = () => { onChange(reader.result); onBusyChange(false) }
    reader.onerror = () => { setError('Could not read this image. Please try again.'); onBusyChange(false) }
    reader.readAsDataURL(file)
  }
  return <div className="space-y-3 sm:col-span-2">
    <label className="grid gap-2 text-sm font-medium">Service image
      <img src={value || clinicVisit} alt="Service image preview" className="h-36 w-full rounded-xl border border-slate-200 object-cover" />
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={chooseImage} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
    </label>
    <p className="text-xs text-slate-500">JPG, PNG, or WebP, up to 2 MB. Changes apply when you save the service.</p>
    {value && <button type="button" disabled={disabled} onClick={() => { onChange(''); setError('') }} className="text-sm font-semibold text-blue-600">Remove image</button>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>
}

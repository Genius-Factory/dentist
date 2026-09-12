/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { Edit3, Plus, Search, ToggleLeft, ToggleRight, X } from 'lucide-react'

const initialServices = [
  { id: 'svc-consultation', name: 'Dental Consultation', category: 'General Dentistry', duration: 30, price: 45, dentists: ['Dr. Maya Haddad', 'Dr. Karim Saab'], status: 'active', description: 'An examination and treatment consultation for new or returning patients.' },
  { id: 'svc-cleaning', name: 'Professional Cleaning', category: 'Preventive Care', duration: 45, price: 70, dentists: ['Dr. Maya Haddad', 'Dr. Rami Khoury'], status: 'active', description: 'Routine cleaning to remove plaque, tartar, and surface staining.' },
  { id: 'svc-whitening', name: 'Teeth Whitening', category: 'Cosmetic Dentistry', duration: 60, price: 180, dentists: ['Dr. Nour Farah'], status: 'active', description: 'In-clinic whitening treatment for a brighter smile.' },
  { id: 'svc-root-canal', name: 'Root Canal Treatment', category: 'Endodontics', duration: 90, price: 320, dentists: ['Dr. Rami Khoury'], status: 'active', description: 'Treatment for an infected or damaged tooth pulp.' },
  { id: 'svc-braces', name: 'Orthodontic Assessment', category: 'Orthodontics', duration: 40, price: 60, dentists: ['Dr. Leila Nassar'], status: 'inactive', description: 'Assessment and treatment planning for tooth alignment.' },
]

const blankService = () => ({ name: '', category: 'General Dentistry', duration: 30, price: '', dentists: '', status: 'active', description: '' })

export function ServicesManager({ embedded = false }) {
  const [services, setServices] = useState(initialServices)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null)

  const categories = useMemo(() => [...new Set(services.map((service) => service.category))].sort(), [services])
  const visibleServices = useMemo(() => services.filter((service) => {
    const matchesSearch = `${service.name} ${service.category} ${service.description} ${service.dentists.join(' ')}`.toLowerCase().includes(search.toLowerCase().trim())
    return matchesSearch && (category === 'all' || service.category === category) && (status === 'all' || service.status === status)
  }), [services, search, category, status])

  const openNew = () => setEditing({ mode: 'new', data: blankService() })
  const openEdit = (service) => setEditing({ mode: 'edit', data: { ...service, dentists: service.dentists.join(', ') } })
  const deactivate = (service) => setServices((items) => items.map((item) => item.id === service.id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item))
  const saveService = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = {
      ...editing.data,
      name: form.get('name').trim(), category: form.get('category').trim(), duration: Number(form.get('duration')), price: Number(form.get('price')),
      dentists: form.get('dentists').split(',').map((name) => name.trim()).filter(Boolean), description: form.get('description').trim(), status: form.get('status'),
    }
    if (editing.mode === 'new') setServices((items) => [...items, { ...data, id: `svc-${Date.now()}` }])
    else setServices((items) => items.map((item) => item.id === data.id ? data : item))
    setEditing(null)
  }

  return <section id="services" className={`${embedded ? 'mt-8 border-t border-slate-200 pt-8' : 'min-h-full bg-[#f8faff]'} text-slate-900`}>
    <div className={`mx-auto max-w-[1500px] ${embedded ? '' : 'p-4 sm:p-7'}`}>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-blue-600">Admin management</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Services</h1><p className="mt-2 text-sm text-slate-500">Manage the services available for appointment booking.</p></div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={18} /> Add Service</button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_150px]">
          <label className="relative"><span className="sr-only">Search services</span><Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services, categories, or dentists" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" /></label>
          <label><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>
        <div className="mt-4 text-sm text-slate-500">{visibleServices.length} {visibleServices.length === 1 ? 'service' : 'services'} shown</div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Service</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Duration</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Dentists</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody>{visibleServices.length ? visibleServices.map((service) => <tr key={service.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-4"><p className="font-semibold text-slate-800">{service.name}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={service.description}>{service.description}</p></td><td className="px-4 py-4 text-slate-600">{service.category}</td><td className="px-4 py-4 text-slate-600">{service.duration} min</td><td className="px-4 py-4 font-medium text-slate-700">${service.price.toFixed(2)}</td><td className="px-4 py-4 text-slate-600">{service.dentists.join(', ') || 'Unassigned'}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{service.status === 'active' ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit(service)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Edit3 size={15} /> Edit</button><button onClick={() => deactivate(service)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">{service.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}{service.status === 'active' ? 'Deactivate' : 'Activate'}</button></div></td></tr>) : <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">No services match these filters.</td></tr>}</tbody></table></div>
      </section>
    </div>
    {editing && <ServiceModal editing={editing} onClose={() => setEditing(null)} onSave={saveService} />}
  </section>
}

function ServiceModal({ editing, onClose, onSave }) {
  const service = editing.data
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-labelledby="service-dialog-title"><form onSubmit={onSave} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="service-dialog-title" className="text-xl font-bold">{editing.mode === 'new' ? 'Add Service' : 'Edit Service'}</h2><p className="mt-1 text-sm text-slate-500">This catalog is currently using mock data.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={19} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Service name" name="name" defaultValue={service.name} required /><Field label="Category" name="category" defaultValue={service.category} required /><Field label="Duration (minutes)" name="duration" type="number" min="5" defaultValue={service.duration} required /><Field label="Price (USD)" name="price" type="number" min="0" step="0.01" defaultValue={service.price} required /><Field label="Dentists" name="dentists" defaultValue={service.dentists} hint="Separate multiple names with commas" /><label className="grid gap-1.5 text-sm font-medium text-slate-700">Status<select name="status" defaultValue={service.status} className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400"><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea name="description" defaultValue={service.description} rows="3" required className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Save service</button></div></form></div>
}

function Field({ label, name, hint, ...props }) { return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}<input name={name} {...props} className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400" />{hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}</label> }

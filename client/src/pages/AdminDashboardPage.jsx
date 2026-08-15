/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, useUser, UserButton } from '@clerk/clerk-react'
import {
  Bell, CalendarDays, CalendarPlus, ChevronRight, ClipboardList,
  Clock3, MoreHorizontal, Search, Stethoscope, SmilePlus, UserPlus, Users, X,
} from 'lucide-react'
import { getAppointments, getProfiles } from '../lib/recordsApi'
import { getBookingStatus, normalizeRole } from '../lib/bookings'
import { getFullName } from '../lib/patientProfiles'

const mockAppointments = [
  { id: 'mock-1', name: 'Emma Johnson', date: new Date().toISOString().slice(0, 10), time: '09:30', medicalIssue: 'Dental Check-up', status: 'approved' },
  { id: 'mock-2', name: 'Michael Brown', date: new Date().toISOString().slice(0, 10), time: '10:30', medicalIssue: 'Teeth Cleaning', status: 'approved' },
  { id: 'mock-3', name: 'Sarah Wilson', date: new Date().toISOString().slice(0, 10), time: '11:30', medicalIssue: 'Tooth Filling', status: 'pending' },
  { id: 'mock-4', name: 'David Martinez', date: new Date().toISOString().slice(0, 10), time: '13:00', medicalIssue: 'Consultation', status: 'approved' },
]
const mockProfiles = [{ id: 'mock-p1', firstName: 'James', lastName: 'Taylor', email: 'jtaylor@email.com' }, { id: 'mock-p2', firstName: 'Olivia', lastName: 'Davis', email: 'olivia.davis@email.com' }]

const initials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const today = () => new Date().toISOString().slice(0, 10)
const labelTime = (time) => new Date(`2000-01-01T${time || '00:00'}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [appointments, setAppointments] = useState(mockAppointments)
  const [profiles, setProfiles] = useState(mockProfiles)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const role = normalizeRole(user?.publicMetadata?.role)
  const canAccess = ['admin', 'superadmin'].includes(role)

  useEffect(() => {
    if (!isLoaded || !user || !canAccess) return
    let active = true
    setLoading(true)
    Promise.all([getAppointments(getToken), getProfiles(getToken)])
      .then(([appointmentData, profileData]) => {
        if (!active) return
        setAppointments(appointmentData.length ? appointmentData : mockAppointments)
        setProfiles(profileData.length ? profileData : mockProfiles)
        setError('')
      })
      .catch(() => active && setError('Live records are temporarily unavailable. Showing sample clinic data.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [canAccess, getToken, isLoaded, user])

  const dashboard = useMemo(() => {
    const todayAppointments = appointments.filter((item) => item.date === today())
    const pending = appointments.filter((item) => getBookingStatus(item) === 'pending')
    const matching = todayAppointments.filter((item) => `${item.name} ${item.medicalIssue}`.toLowerCase().includes(search.toLowerCase()))
    const services = appointments.reduce((all, item) => {
      const name = item.medicalIssue || 'Dental Consultation'
      all[name] = (all[name] || 0) + 1
      return all
    }, {})
    return { todayAppointments, pending, matching, services: Object.entries(services).sort((a, b) => b[1] - a[1]).slice(0, 4) }
  }, [appointments, search])

  if (!isLoaded) return <div className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading dashboard…</div>
  if (!user) return <Navigate to="/sign-in?redirect_url=/admin/dashboard" replace />
  if (!canAccess) return <Navigate to="/" replace />

  const cards = [
    { label: "Today's Appointments", value: dashboard.todayAppointments.length, icon: CalendarDays, note: loading ? 'Loading live records…' : 'Scheduled for today', tone: 'text-blue-600 bg-blue-50' },
    { label: 'Total Patients', value: profiles.length, icon: Users, note: 'Patient profiles', tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Active Dentists', value: 0, icon: Stethoscope, note: 'On clinic roster', tone: 'text-violet-600 bg-violet-50' },
    { label: 'Pending Requests', value: dashboard.pending.length, icon: ClipboardList, note: 'View and respond', tone: 'text-amber-600 bg-amber-50' },
  ]

  return <div className="min-h-full bg-[#f8faff] text-slate-900">
      <header className="sticky top-0 z-30 flex h-[78px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
        <label className="relative hidden max-w-[480px] flex-1 md:block"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search today's appointments" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" /></label>
        <div className="ml-auto flex items-center gap-4"><button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications"><Bell size={22} /><span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span></button><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.fullName || user.username || 'Admin User'}</p><p className="text-xs capitalize text-slate-500">{role}</p></div><UserButton afterSignOutUrl="/" /></div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-7">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Dashboard</h1><p className="mt-1 text-sm text-slate-500">Manage appointments, patients, and clinic activity.</p></div><p className="text-xs font-medium text-slate-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
        {error && <div role="status" className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}<button onClick={() => setError('')} aria-label="Dismiss message"><X size={17} /></button></div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, note, tone }) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={24} /></span><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div></div></section>)}</div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Today&apos;s Appointments</h2><Link to="/secretary/appointments" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all appointments →</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3 font-medium">Time</th><th className="px-3 py-3 font-medium">Patient</th><th className="px-3 py-3 font-medium">Service</th><th className="px-3 py-3 font-medium">Status</th><th className="px-5 py-3" /></tr></thead><tbody>{dashboard.matching.length ? dashboard.matching.slice(0, 6).map((item) => { const status = getBookingStatus(item); return <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-3.5 font-medium">{labelTime(item.time)}</td><td className="px-3 py-3.5"><span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{initials(item.name || 'Patient')}</span>{item.name || 'Patient'}</span></td><td className="px-3 py-3.5 text-slate-600">{item.medicalIssue || 'Consultation'}</td><td className="px-3 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{status === 'pending' ? 'Pending' : 'Confirmed'}</span></td><td className="px-5 py-3.5"><Link to="/secretary/appointments" aria-label={`View ${item.name} appointment`} className="text-slate-400 hover:text-blue-600"><MoreHorizontal size={20} /></Link></td></tr> }) : <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-500">No appointments match this search.</td></tr>}</tbody></table></div></section>
          <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold">Quick Actions</h2><div className="space-y-2"><QuickAction to="/patients/create" icon={UserPlus} title="Add Patient" text="Create a new patient profile" /><QuickAction to="/reservation" icon={CalendarPlus} title="Book Appointment" text="Schedule a new appointment" /><QuickAction to="/reservation" icon={SmilePlus} title="Add Service" text="Create a new service request" /></div></section><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 font-semibold">Clinic Status</h2><div className="space-y-4 text-sm"><Status icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />} label="All Systems Operational" text="Everything is running smoothly." /><Status icon={<Users size={17} />} label="7 Dentists On Duty" text="Clinic is fully staffed today." /><Status icon={<Clock3 size={17} />} label="Average Wait Time" text="18 minutes" /></div></section></aside>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><h2 className="font-semibold">Recent Patients</h2><Link to="/patients" className="text-sm font-semibold text-blue-600">View all patients →</Link></div><div className="mt-3 divide-y divide-slate-100">{profiles.slice(0, 4).map((profile) => <Link key={profile.id} to={`/patients/${profile.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{initials(getFullName(profile) || 'Patient')}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{getFullName(profile) || 'Unnamed Patient'}</span><span className="block truncate text-xs text-slate-500">{profile.email || 'No email supplied'}</span></span></Link>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Popular Services</h2><div className="mt-3 divide-y divide-slate-100">{dashboard.services.length ? dashboard.services.map(([service, count]) => <div key={service} className="flex items-center justify-between py-3"><span className="flex items-center gap-3 text-sm"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><SmilePlus size={17} /></span>{service}</span><span className="text-right text-sm font-bold">{count}<small className="ml-1 block text-[10px] font-normal text-slate-400">Appointments</small></span></div>) : <p className="py-8 text-center text-sm text-slate-500">No service activity yet.</p>}</div></section></div>
      </main>
  </div>
}

function QuickAction({ to, icon: Icon, title, text }) { return <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:border-blue-200 hover:bg-blue-50"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="block truncate text-xs text-slate-500">{text}</span></span><ChevronRight size={18} className="text-slate-400" /></Link> }
function Status({ icon, label, text }) { return <div className="flex gap-3"><span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-blue-600">{icon}</span><span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-slate-500">{text}</span></span></div> }

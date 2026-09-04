import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Calendar, Mail, MapPin, Phone, Plus, Search, UserRound, Users } from 'lucide-react'
import { isStaffRole, normalizeRole } from '../lib/bookings'
import { getAge, getFullName, getProfilePictureSrc } from '../lib/patientProfiles'
import { getProfiles } from '../lib/recordsApi'
import DatabaseLoading from '../components/DatabaseLoading'

function patientInitials(profile) {
  return getFullName(profile)
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'P'
}

export default function PatientsPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const role = user?.publicMetadata?.role || 'member'
  const isStaff = isStaffRole(role)
  const canCreateProfile = ['admin', 'superadmin'].includes(normalizeRole(role))

  useEffect(() => {
    if (!isLoaded || !user) return
    setLoading(true)
    getProfiles(getToken)
      .then(setProfiles)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [getToken, isLoaded, user])

  const visibleProfiles = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return profiles
    return profiles.filter((profile) => {
      const content = [
        getFullName(profile),
        profile.email,
        profile.phone,
        profile.address,
        profile.gender,
      ].join(' ').toLowerCase()
      return content.includes(search)
    })
  }, [profiles, query])

  if (!isLoaded) {
    return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><DatabaseLoading label="Loading patients from the database…" className="py-0" /></div>
  }

  if (!user) return <Navigate to="/sign-in?redirect_url=/patients" replace />
  if (!isStaff) return <Navigate to="/" replace />

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">{isStaff ? 'Patient Directory' : 'My Profiles'}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Patients</h1>
          <p className="mt-2 text-sm text-slate-500">
            {loading ? 'Counting patient profiles...' : `${profiles.length} ${profiles.length === 1 ? 'patient' : 'patients'} available`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patients"
              className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </label>
          {canCreateProfile && (
            <Link to="/patients/create" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
              <Plus size={16} />
              New Profile
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl bg-cyan-50 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-white"><Users size={22} /></span>
          <div>
            <p className="text-2xl font-semibold text-slate-950">{profiles.length}</p>
            <p className="text-sm text-slate-500">Total patients</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-blue-50 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white"><UserRound size={22} /></span>
          <div>
            <p className="text-2xl font-semibold text-slate-950">{visibleProfiles.length}</p>
            <p className="text-sm text-slate-500">Showing now</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-emerald-50 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white"><Calendar size={22} /></span>
          <div>
            <p className="text-2xl font-semibold text-slate-950">{profiles.filter((profile) => getAge(profile.dateOfBirth) !== '').length}</p>
            <p className="text-sm text-slate-500">With birth date</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><DatabaseLoading label="Loading patients from the database…" className="py-0" /></div>
      ) : visibleProfiles.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProfiles.map((profile) => {
            const age = getAge(profile.dateOfBirth)
            const profilePictureSrc = getProfilePictureSrc(profile)
            return (
              <Link
                key={profile.id}
                to={`/patients/${profile.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-cyan-200 text-xl font-semibold text-cyan-800">
                    {profilePictureSrc ? <img src={profilePictureSrc} alt={getFullName(profile)} className="h-full w-full object-cover" /> : patientInitials(profile)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-slate-950 group-hover:text-cyan-700">{getFullName(profile) || 'Unnamed Patient'}</h2>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">ID {profile.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{profile.gender || 'Unset'}</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2"><Calendar size={15} className="shrink-0 text-slate-400" /> {age === '' ? 'Age not set' : `${age} years old`}</p>
                      <p className="flex items-center gap-2"><Phone size={15} className="shrink-0 text-slate-400" /> <span className="truncate">{profile.phone || 'Phone not set'}</span></p>
                      <p className="flex items-center gap-2"><Mail size={15} className="shrink-0 text-slate-400" /> <span className="truncate">{profile.email || 'Email not set'}</span></p>
                      <p className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-slate-400" /> <span className="truncate">{profile.address || 'Address not set'}</span></p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </section>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">{profiles.length ? 'No patients match your search' : 'No patient profiles yet'}</h2>
          <p className="mt-2 text-sm text-slate-500">{profiles.length ? 'Try another name, email, phone, or address.' : 'Patient cards will appear here after profiles are created.'}</p>
        </div>
      )}
    </div>
  )
}

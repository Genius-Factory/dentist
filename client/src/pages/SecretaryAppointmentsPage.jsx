import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import {
  getBookingStatus,
  getStatusClasses,
  getStatusLabel,
  isArchivedBooking,
  isSecretaryRole,
} from '../lib/bookings'
import { findProfileForBooking } from '../lib/patientProfiles'
import { getAppointments, getProfiles, getServices, updateAppointment } from '../lib/recordsApi'
import DatabaseLoading from '../components/DatabaseLoading'
import PaymentManager from '../components/PaymentManager'
import { money } from '../lib/finance'

function sortByAppointmentDate(bookings) {
  return [...bookings].sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.time || '00:00'}`).getTime()
    const bTime = new Date(`${b.date}T${b.time || '00:00'}`).getTime()
    return aTime - bTime
  })
}

export default function SecretaryAppointmentsPage() {
  const { user, isLoaded } = useUser()
  const { getToken, sessionId } = useAuth()
  const token = useRef(getToken)
  token.current = getToken
  const userId = user?.id
  const [profiles, setProfiles] = useState([])
  const [bookings, setBookings] = useState([])
  const [servicesById, setServicesById] = useState({})
  const [dentistsById, setDentistsById] = useState({})
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const role = user?.publicMetadata?.role || 'client'
  const canApproveAppointments = isSecretaryRole(role)
  const now = Date.now()

  useEffect(() => {
    if (!isLoaded || !userId || !canApproveAppointments) return
    let active = true
    setLoading(true)
    Promise.all([getAppointments(() => token.current()), getProfiles(() => token.current()), getServices(() => token.current())]).then(([items, profileItems, services]) => {
      if (!active) return
      setBookings(sortByAppointmentDate(items))
      setProfiles(profileItems)
      setServicesById(Object.fromEntries(services.map((service) => [service.id, service])))
      setDentistsById(Object.fromEntries(services.flatMap((service) => (service.dentists || []).map((dentist) => [dentist.id, dentist.name]))))
    }).catch(console.error).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [isLoaded, canApproveAppointments, userId, sessionId])

  const activeBookings = useMemo(
    () => bookings.filter((booking) => !isArchivedBooking(booking, now)),
    [bookings, now],
  )
  const archivedBookings = useMemo(
    () => bookings.filter((booking) => isArchivedBooking(booking, now)),
    [bookings, now],
  )
  const visibleBookings = showArchived ? archivedBookings : activeBookings

  const counts = useMemo(
    () =>
      activeBookings.reduce(
        (totals, booking) => {
          totals[getBookingStatus(booking)] += 1
          return totals
        },
        { pending: 0, approved: 0, declined: 0 },
      ),
    [activeBookings],
  )

  const updateStatus = async (id, status) => {
    const now = new Date().toISOString()
    const nextBookings = bookings.map((booking) => {
      if (booking.id !== id) return booking

      return {
        ...booking,
        status,
        updatedAt: now,
        approvedAt: status === 'approved' ? now : booking.approvedAt || null,
        approvedBy: status === 'approved' ? user.id : booking.approvedBy || null,
        declinedAt: status === 'declined' ? now : null,
        declinedBy: status === 'declined' ? user.id : null,
      }
    })

    const updated = nextBookings.find((booking) => booking.id === id)
    await updateAppointment(getToken, updated)
    setBookings(sortByAppointmentDate(nextBookings))
  }

  if (!isLoaded || (user && canApproveAppointments && loading)) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        <DatabaseLoading label="Loading appointments from the database…" className="py-0" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in?redirect_url=/secretary/appointments" replace />
  }

  if (!canApproveAppointments) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Staff access only</h1>
        <p className="mt-2 text-slate-600">Appointment approvals are available to secretary and administrator accounts.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back Home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {showArchived ? 'Archived Appointments' : 'Appointment Approvals'}
          </h1>
          <p className="mt-2 text-slate-600">
            {showArchived
              ? 'Review declined appointments and approved appointments whose date has already passed.'
              : 'Review sent appointment requests and approve or decline them.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showArchived ? 'Active Appointments' : 'Archives'}
          </button>
          <Link
            to="/reservation"
            className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add Appointment
          </Link>
        </div>
      </div>

      {!showArchived && (
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <p className="text-sm font-medium">Pending</p>
          <p className="mt-1 text-2xl font-semibold">{counts.pending}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <p className="text-sm font-medium">Approved</p>
          <p className="mt-1 text-2xl font-semibold">{counts.approved}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="text-sm font-medium">Declined</p>
          <p className="mt-1 text-2xl font-semibold">{counts.declined}</p>
        </div>
      </div>
      )}

      {visibleBookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {showArchived ? 'No archived appointments' : 'No active appointments'}
          </h2>
          <p className="mt-2 text-slate-600">
            {showArchived
              ? 'Declined appointments and past approved appointments will show here.'
              : 'Client requests will appear here when they are submitted.'}
          </p>
        </div>
      ) : showArchived ? (
        <div className="space-y-3">
          {visibleBookings.map((booking) => {
            const status = getBookingStatus(booking)

            return (
              <article key={booking.id} className="appointment-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">{booking.name}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}>{getStatusLabel(status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{booking.date}{booking.time && ` ? ${booking.time}`}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
                      <span>{serviceLabel(booking, servicesById)}</span>
                      {dentistsById[booking.dentistId || booking.dentist_id] && <span>{dentistLabel(booking, dentistsById)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:items-end sm:border-0 sm:pt-0">
                    <p className="text-sm text-slate-500">{booking.billing?.chargedCents != null ? <><span className="font-semibold text-slate-900">{money(booking.billing.chargedCents)}</span> charged{booking.billing.remainingCents > 0 && <> &middot; {money(booking.billing.remainingCents)} remaining</>}</> : 'No charge confirmed'}</p>
                    <PaymentManager appointment={booking} onBillingChange={(id, billing) => setBookings((items) => items.map((entry) => entry.id === id ? { ...entry, billing } : entry))} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <>
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const status = getBookingStatus(booking)
            const profile = findProfileForBooking(profiles, booking)

            return (
              <article key={booking.id} className="appointment-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{booking.name}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-x-8 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
                      <p><span className="font-medium text-slate-700">Date:</span> {booking.date}</p>
                      <p><span className="font-medium text-slate-700">Time:</span> {booking.time}</p>
                      <p><span className="font-medium text-slate-700">Duration:</span> {booking.duration} minutes</p>
                      <p><span className="font-medium text-slate-700">Emergency:</span> {booking.emergencyLevel}</p>
                      <p><span className="font-medium text-slate-700">Service:</span> {serviceLabel(booking, servicesById)}</p>
                      <p><span className="font-medium text-slate-700">Dentist:</span> {dentistLabel(booking, dentistsById)}</p>
                      <p><span className="font-medium text-slate-700">Price:</span> {priceLabel(booking, servicesById)}</p>
                      <p><span className="font-medium text-slate-700">Date of Birth:</span> {booking.dateOfBirth}</p>
                      {booking.guardianContact && (
                        <p><span className="font-medium text-slate-700">Guardian:</span> {booking.guardianContact}</p>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Issue:</span> {booking.medicalIssue}
                    </p>
                  </div>

                  <div className="flex min-w-56 flex-wrap gap-2 lg:justify-end">
                    <PaymentManager appointment={booking} onBillingChange={(id, billing) => setBookings((items) => items.map((entry) => entry.id === id ? { ...entry, billing } : entry))} />
                    {profile && (
                      <Link
                        to={`/patients/${profile.id}`}
                        className="rounded-full border border-sky-200 px-5 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                      >
                        Patient Details
                      </Link>
                    )}
                    {status !== 'approved' && <button
                      type="button"
                      onClick={() => updateStatus(booking.id, 'approved')}
                      disabled={status === 'approved'}
                      className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Approve
                    </button>}
                    {status !== 'approved' && <button
                      type="button"
                      onClick={() => updateStatus(booking.id, 'declined')}
                      disabled={status === 'declined'}
                      className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Decline
                    </button>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-sky-800">
          Approved appointments whose date has passed and declined appointments will be hidden in the Archives tab.
        </div>
        </>
      )}
    </div>
  </div>
)
}

function serviceLabel(booking, servicesById) {
  return booking.serviceName || servicesById[booking.serviceId || booking.service_id]?.name || 'Service not specified'
}

function dentistLabel(booking, dentistsById) {
  return dentistsById[booking.dentistId || booking.dentist_id] || 'Assigned dentist'
}

function priceLabel(booking, servicesById) {
  if (booking.billing?.chargedCents != null) return money(booking.billing.chargedCents)
  const price = servicesById[booking.serviceId || booking.service_id]?.price
  return price != null && price !== '' && Number.isFinite(Number(price)) ? Number(price) === 0 ? 'Free' : `$${Number(price).toFixed(2)}` : 'Price unavailable'
}

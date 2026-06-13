import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  getBookingStatus,
  getStatusClasses,
  getStatusLabel,
  getStoredBookings,
  isSecretaryRole,
  saveStoredBookings,
} from '../lib/bookings'

function sortByAppointmentDate(bookings) {
  return [...bookings].sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.time || '00:00'}`).getTime()
    const bTime = new Date(`${b.date}T${b.time || '00:00'}`).getTime()
    return aTime - bTime
  })
}

export default function SecretaryAppointmentsPage() {
  const { user, isLoaded } = useUser()
  const [bookings, setBookings] = useState([])
  const role = user?.publicMetadata?.role || 'member'
  const isSecretary = isSecretaryRole(role)

  useEffect(() => {
    if (!isLoaded || !user || !isSecretary) return
    setBookings(sortByAppointmentDate(getStoredBookings()))
  }, [isLoaded, isSecretary, user])

  const counts = useMemo(
    () =>
      bookings.reduce(
        (totals, booking) => {
          totals[getBookingStatus(booking)] += 1
          return totals
        },
        { pending: 0, approved: 0, declined: 0 },
      ),
    [bookings],
  )

  const updateStatus = (id, status) => {
    const now = new Date().toISOString()
    const nextBookings = getStoredBookings().map((booking) => {
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

    saveStoredBookings(nextBookings)
    setBookings(sortByAppointmentDate(nextBookings))
  }

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Loading appointments...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in?redirect_url=/secretary/appointments" replace />
  }

  if (!isSecretary) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Secretary access only</h1>
        <p className="mt-2 text-slate-600">Appointment approvals are available to secretary accounts.</p>
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
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Appointment Approvals</h1>
          <p className="mt-2 text-slate-600">Review sent appointment requests and approve or decline them.</p>
        </div>
        <Link
          to="/reservation"
          className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Appointment
        </Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <p className="text-sm font-medium">Pending</p>
          <p className="mt-1 text-2xl font-semibold">{counts.pending}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <p className="text-sm font-medium">Approved</p>
          <p className="mt-1 text-2xl font-semibold">{counts.approved}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="text-sm font-medium">Declined</p>
          <p className="mt-1 text-2xl font-semibold">{counts.declined}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No appointments sent yet</h2>
          <p className="mt-2 text-slate-600">Client requests will appear here when they are submitted.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const status = getBookingStatus(booking)

            return (
              <article key={booking.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                    <button
                      type="button"
                      onClick={() => updateStatus(booking.id, 'approved')}
                      disabled={status === 'approved'}
                      className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(booking.id, 'declined')}
                      disabled={status === 'declined'}
                      className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import {
  getBookingStatus,
  getStatusClasses,
  getStatusLabel,
  isArchivedBooking,
  isBookingEditable,
} from '../lib/bookings'
import { deleteAppointment, getAppointments } from '../lib/recordsApi'
import DatabaseLoading from '../components/DatabaseLoading'

function formatCountdown(editableUntil) {
  const remaining = new Date(editableUntil).getTime() - Date.now()

  if (remaining <= 0) {
    return 'Expired'
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

  return `${hours}h ${minutes}m ${seconds}s`
}

export default function BookedPage() {
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [bookings, setBookings] = useState([])
  const [now, setNow] = useState(Date.now())
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isLoaded || !user) return
    setLoading(true)
    getAppointments(getToken).then((items) => setBookings(items.filter((booking) => booking.userId === user.id))).catch(console.error).finally(() => setLoading(false))
  }, [getToken, isLoaded, user])

  const cancelBooking = async (id) => {
    await deleteAppointment(getToken, id)
    setBookings((items) => items.filter((booking) => booking.id !== id))
  }

  const activeBookings = useMemo(
    () => bookings.filter((booking) => !isArchivedBooking(booking, now)),
    [bookings, now],
  )
  const archivedBookings = useMemo(
    () => bookings.filter((booking) => isArchivedBooking(booking, now)),
    [bookings, now],
  )
  const visibleBookings = showArchived ? archivedBookings : activeBookings

  if (!isLoaded || (user && loading)) {
    return (
      <div className="min-h-full">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        <DatabaseLoading label="Loading appointments from the database…" className="py-0" />
      </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-full">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in to view appointments</h1>
        <p className="mt-2 text-slate-600">Your booked appointments are connected to your account.</p>
        <Link
          to="/sign-in?redirect_url=/booked"
          className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Sign In
        </Link>
      </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {showArchived ? 'Archived Appointments' : 'Booked Appointments'}
          </h1>
          <p className="mt-2 text-slate-600">
            {showArchived
              ? 'Review declined appointments and approved appointments whose date has already passed.'
              : 'Track approval status. Pending requests can be edited or canceled during their 24-hour window.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            className="inline-flex whitespace-nowrap rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showArchived ? 'Active Appointments' : 'Archives'}
          </button>
          <Link
            to="/reservation"
            className="inline-flex whitespace-nowrap rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Appointment
          </Link>
        </div>
      </div>

      {visibleBookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {showArchived ? 'No archived appointments' : 'No active appointments'}
          </h2>
          <p className="mt-2 text-slate-600">
            {showArchived
              ? 'Declined appointments and past approved appointments will show here.'
              : 'Once you send a reservation, it will show here.'}
          </p>
        </div>
      ) : showArchived ? (
        <div className="space-y-3">
          {visibleBookings.map((booking) => {
            const status = getBookingStatus(booking)

            return (
              <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <h2 className="text-base font-semibold text-slate-900">{booking.name}</h2>
                      <p className="text-sm text-slate-500">{booking.date}</p>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">{booking.medicalIssue}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const status = getBookingStatus(booking)
            const canEdit = isBookingEditable(booking, now)

            return (
              <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{booking.name}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p><span className="font-medium text-slate-700">Date:</span> {booking.date}</p>
                      <p><span className="font-medium text-slate-700">Time:</span> {booking.time}</p>
                      <p><span className="font-medium text-slate-700">Duration:</span> {booking.duration} minutes</p>
                      <p><span className="font-medium text-slate-700">Issue:</span> {booking.medicalIssue}</p>
                    </div>
                  </div>

                  <div className={`min-w-56 rounded-2xl p-3 text-sm ${
                    status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'
                  }`}>
                    <p className="font-medium">{status === 'pending' ? 'Edit window' : 'Approval status'}</p>
                    <p className="mt-1 font-mono">
                      {status === 'pending' ? formatCountdown(booking.editableUntil) : getStatusLabel(status)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/reservation?edit=${booking.id}`)}
                    disabled={!canEdit}
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                  {booking.profileId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/patients/${booking.profileId}`)}
                      className="rounded-full border border-sky-200 px-5 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                    >
                      Patient Details
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => cancelBooking(booking.id)}
                    disabled={!canEdit}
                    className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {!showArchived && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-sky-800">
          Approved appointments whose date has passed and declined appointments will be hidden in the Archives tab.
        </div>
      )}
    </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  getBookingStatus,
  getStatusClasses,
  getStatusLabel,
  getStoredBookings,
  isBookingEditable,
  saveStoredBookings,
} from '../lib/bookings'

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
  const [bookings, setBookings] = useState([])
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isLoaded || !user) return
    setBookings(getStoredBookings().filter((booking) => booking.userId === user.id))
  }, [isLoaded, user])

  const cancelBooking = (id) => {
    const nextBookings = getStoredBookings().filter(
      (booking) => !(booking.id === id && booking.userId === user.id),
    )
    saveStoredBookings(nextBookings)
    setBookings(nextBookings.filter((booking) => booking.userId === user.id))
  }

  if (!isLoaded) {
    return (
      <div className="min-h-full" style={{
        background: `radial-gradient(circle at 8% 18%, rgba(125,211,252,0.18), transparent 22%), radial-gradient(circle at 92% 50%, rgba(59,130,246,0.10), transparent 28%), linear-gradient(180deg, #fbfdff 0%, #f7fbff 46%, #ffffff 100%)`
      }}>
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Loading appointments...
      </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-full" style={{
        background: `radial-gradient(circle at 8% 18%, rgba(125,211,252,0.18), transparent 22%), radial-gradient(circle at 92% 50%, rgba(59,130,246,0.10), transparent 28%), linear-gradient(180deg, #fbfdff 0%, #f7fbff 46%, #ffffff 100%)`
      }}>
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
    <div className="min-h-full" style={{
      background: `radial-gradient(circle at 8% 18%, rgba(125,211,252,0.18), transparent 22%), radial-gradient(circle at 92% 50%, rgba(59,130,246,0.10), transparent 28%), linear-gradient(180deg, #fbfdff 0%, #f7fbff 46%, #ffffff 100%)`
    }}>
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Booked Appointments</h1>
          <p className="mt-2 text-slate-600">
            Track approval status. Pending requests can be edited or canceled during their 24-hour window.
          </p>
        </div>
        <Link
          to="/reservation"
          className="inline-flex whitespace-nowrap rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          New Appointment
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No appointments booked yet</h2>
          <p className="mt-2 text-slate-600">Once you send a reservation, it will show here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
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
    </div>
    </div>
  )
}

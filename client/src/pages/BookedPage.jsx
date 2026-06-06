import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

const STORAGE_KEY = 'dentistBookings'

function getStoredBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookings))
    setBookings(nextBookings.filter((booking) => booking.userId === user.id))
  }

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Loading appointments...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in to view appointments</h1>
        <p className="mt-2 text-slate-600">Your booked appointments are connected to your account.</p>
        <Link
          to="/sign-in?redirect_url=/booked"
          className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Booked Appointments</h1>
          <p className="mt-2 text-slate-600">Edit or cancel each appointment during its 24-hour window.</p>
        </div>
        <Link
          to="/reservation"
          className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          New Appointment
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No appointments booked yet</h2>
          <p className="mt-2 text-slate-600">Once you approve a reservation, it will show here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isExpired = new Date(booking.editableUntil).getTime() <= now

            return (
              <article key={booking.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{booking.name}</h2>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p><span className="font-medium text-slate-700">Date:</span> {booking.date}</p>
                      <p><span className="font-medium text-slate-700">Time:</span> {booking.time}</p>
                      <p><span className="font-medium text-slate-700">Duration:</span> {booking.duration} minutes</p>
                      {booking.department && (
                        <p><span className="font-medium text-slate-700">Department:</span> {booking.department}</p>
                      )}
                      <p><span className="font-medium text-slate-700">Issue:</span> {booking.medicalIssue}</p>
                    </div>
                  </div>

                  <div className="min-w-56 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    <p className="font-medium">Edit window</p>
                    <p className="mt-1 font-mono">{formatCountdown(booking.editableUntil)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/reservation?edit=${booking.id}`)}
                    disabled={isExpired}
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelBooking(booking.id)}
                    disabled={isExpired}
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
  )
}

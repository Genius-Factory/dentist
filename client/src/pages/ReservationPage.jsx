import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  EDIT_WINDOW_MS,
  getStoredBookings,
  isBookingEditable,
  isSecretaryRole,
  saveStoredBookings,
} from '../lib/bookings'

const OPEN_TIME = '08:00'
const CLOSE_TIME = '17:00'

const DURATIONS = [
  { value: 30, label: '30 minutes', price: 10 },
  { value: 60, label: '1 hour', price: 20 },
]

const EMERGENCY_LEVELS = [
  { value: 'low', label: 'Low - Regular checkup' },
  { value: 'medium', label: 'Medium - Needs attention soon' },
  { value: 'high', label: 'High - Urgent care needed' },
]

const emergencyKeywords = [
  'chest pain',
  'difficulty breathing',
  'shortness of breath',
  'unconscious',
  'fainting',
  'severe bleeding',
  'bleeding',
  'stroke',
  'seizure',
  'heart attack',
  'suicidal',
  'poisoning',
  'pregnancy bleeding',
  'high fever',
  'accident',
  'severe pain',
]

const mediumKeywords = [
  'fever',
  'infection',
  'vomiting',
  'dizziness',
  'pain',
  'sick',
  'cough',
  'headache',
]

const lifeThreateningKeywords = [
  'chest pain',
  'shortness of breath',
  'difficulty breathing',
  'unconscious',
  'severe bleeding',
  'stroke',
  'seizure',
  'suicidal',
  'poisoning',
  'heart attack',
]

const junkWords = ['test', 'asdf', 'qwerty', 'none', 'idk', 'sicke']

function toDateInputValue(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(date.getMonth() + months)
  return next
}

function isWeekend(dateValue) {
  const day = new Date(`${dateValue}T00:00:00`).getDay()
  return day === 0 || day === 6
}

function minutesFromTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function timeFromMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getWorkingTimes(duration) {
  const times = []
  const openMinutes = minutesFromTime(OPEN_TIME)
  const closeMinutes = minutesFromTime(CLOSE_TIME)

  for (let time = openMinutes; time + duration <= closeMinutes; time += 30) {
    times.push(timeFromMinutes(time))
  }

  return times
}

function getBusinessDaysForMonth() {
  const today = new Date()
  const maxDate = addMonths(today, 1)
  const dates = []

  for (let date = new Date(today); date <= maxDate; date = addDays(date, 1)) {
    const value = toDateInputValue(date)
    if (!isWeekend(value)) {
      dates.push(value)
    }
  }

  return dates
}

function getAge(dateOfBirth) {
  if (!dateOfBirth) return ''
  const birthDate = new Date(`${dateOfBirth}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age
}

function normalizeText(value) {
  return value.trim().toLowerCase()
}

function hasKeyword(text, keywords) {
  return keywords.some((word) => text.includes(word))
}

function isClearMedicalReason(issue) {
  const normalizedIssue = normalizeText(issue)
  const letters = normalizedIssue.replace(/[^a-z]/g, '')
  const hasOnlyRepeatedPunctuation = /^[.\-_\s\d]+$/.test(normalizedIssue)

  if (normalizedIssue.length < 10) return false
  if (hasOnlyRepeatedPunctuation) return false
  if (letters.length < 6) return false
  if (junkWords.includes(normalizedIssue)) return false

  return true
}

function validateAppointmentForm(form) {
  const errors = {}
  const issue = normalizeText(form.medicalIssue || '')
  const name = form.name?.trim() || ''
  const nameParts = name.split(/\s+/).filter(Boolean)
  const age = getAge(form.dateOfBirth)

  if (name.length < 3 || nameParts.length < 2 || !/^[a-zA-Z\s'-]+$/.test(name)) {
    errors.name = "Please enter the patient's full name."
  }

  if (!form.dateOfBirth || !Number.isInteger(age) || age < 1 || age > 120) {
    errors.dateOfBirth = 'Please enter a valid age between 1 and 120.'
  }

  if (Number.isInteger(age) && age < 18 && !form.guardianContact.trim()) {
    errors.guardianContact = 'Patients under 18 must provide guardian contact information.'
  }

  if (!isClearMedicalReason(form.medicalIssue || '')) {
    errors.medicalIssue =
      'Please describe the medical issue clearly, including symptoms and duration. Example: "Bad toothache for the last 3 days, worse when eating."'
  }

  if (hasKeyword(issue, emergencyKeywords) && form.emergencyLevel === 'low') {
    errors.emergencyLevel =
      'This symptom may require urgent care. Please choose Medium/High emergency level or call emergency services if severe.'
  } else if (hasKeyword(issue, mediumKeywords) && form.emergencyLevel === 'low') {
    errors.emergencyLevel =
      'Low emergency level is only for routine visits or non-urgent checkups. If symptoms are worsening, choose Medium or provide more details.'
  }

  return errors
}

const emptyForm = {
  name: '',
  dateOfBirth: '',
  guardianContact: '',
  medicalIssue: '',
  emergencyLevel: 'low',
  duration: 30,
  date: '',
  time: '',
}

export default function ReservationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isLoaded } = useUser()
  const editId = searchParams.get('edit')
  const role = user?.publicMetadata?.role || 'member'
  const isSecretary = isSecretaryRole(role)

  const [formData, setFormData] = useState(emptyForm)
  const [step, setStep] = useState(1)
  const [dateError, setDateError] = useState('')
  const [errors, setErrors] = useState({})

  const businessDays = useMemo(() => getBusinessDaysForMonth(), [])
  const todayValue = toDateInputValue(new Date())
  const maxDateValue = toDateInputValue(addMonths(new Date(), 1))
  const selectedDuration = DURATIONS.find((duration) => duration.value === Number(formData.duration))
  const workingTimes = getWorkingTimes(Number(formData.duration))
  const derivedAge = getAge(formData.dateOfBirth)
  const showEmergencyWarning = hasKeyword(normalizeText(formData.medicalIssue), lifeThreateningKeywords)

  useEffect(() => {
    if (!isLoaded || !user || !editId) return

    const booking = getStoredBookings().find((item) => item.id === editId && item.userId === user.id)

    if (booking) {
      if (!isBookingEditable(booking)) {
        navigate('/booked', { replace: true })
        return
      }

      setFormData({
        name: booking.name,
        dateOfBirth: booking.dateOfBirth,
        guardianContact: booking.guardianContact || '',
        medicalIssue: booking.medicalIssue,
        emergencyLevel: booking.emergencyLevel,
        duration: booking.duration,
        date: booking.date,
        time: booking.time,
      })
      setStep(1)
    }
  }, [editId, isLoaded, navigate, user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleDateChange = (e) => {
    const value = e.target.value

    if (!value) {
      setDateError('')
      setFormData((prev) => ({ ...prev, date: '', time: '' }))
      return
    }

    if (isWeekend(value)) {
      setDateError('Weekends are closed. Please choose a weekday.')
      setFormData((prev) => ({ ...prev, date: '', time: '' }))
      return
    }

    setDateError('')
    setFormData((prev) => ({ ...prev, date: value, time: '' }))
  }

  const hasStep1RequiredFields =
    formData.name &&
    formData.dateOfBirth &&
    formData.medicalIssue &&
    formData.emergencyLevel
  const isStep2Valid = formData.date && formData.time

  const handleContinueToCalendar = () => {
    const nextErrors = validateAppointmentForm(formData)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length === 0) {
      setStep(2)
    }
  }

  const handleReview = (e) => {
    e.preventDefault()
    const nextErrors = validateAppointmentForm(formData)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length === 0 && isStep2Valid) {
      setStep(3)
    }
  }

  const handleSaveBooking = () => {
    const nextErrors = validateAppointmentForm(formData)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setStep(1)
      return
    }

    const existingBookings = getStoredBookings()
    const existingBooking = editId
      ? existingBookings.find((item) => item.id === editId && item.userId === user.id)
      : null
    const createdAt = existingBooking?.createdAt || new Date().toISOString()
    const status = isSecretary ? 'approved' : 'pending'
    const booking = {
      ...formData,
      id: editId || crypto.randomUUID(),
      userId: user.id,
      duration: Number(formData.duration),
      createdAt,
      editableUntil: existingBooking?.editableUntil || new Date(Date.now() + EDIT_WINDOW_MS).toISOString(),
      status,
      requestedByRole: role,
      updatedAt: new Date().toISOString(),
      approvedAt: status === 'approved' ? new Date().toISOString() : null,
      approvedBy: status === 'approved' ? user.id : null,
      declinedAt: null,
      declinedBy: null,
    }
    const nextBookings = editId
      ? existingBookings.map((item) => (item.id === editId && item.userId === user.id ? booking : item))
      : [...existingBookings, booking]

    saveStoredBookings(nextBookings)
    navigate('/booked')
  }

  if (!isLoaded) {
    return (
      <div className="min-h-full">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Loading reservation...
      </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-full">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in to book an appointment</h1>
        <p className="mt-2 text-slate-600">
          Please sign in before entering reservation details so your appointment can be saved to your account.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/sign-in?redirect_url=/reservation"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign In
          </Link>
          <Link
            to="/sign-up?redirect_url=/reservation"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create Account
          </Link>
        </div>
      </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">
          {editId ? 'Edit Appointment' : 'Book an Appointment'}
        </h1>
        <p className="mt-2 text-slate-600">
          {isSecretary
            ? 'Secretary-created appointments are approved immediately.'
            : 'Your request will be sent to a secretary for approval.'}
        </p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((currentStep) => (
          <div key={currentStep} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= currentStep ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {currentStep}
            </div>
            {currentStep < 3 && (
              <div className={`h-1 w-12 ${step > currentStep ? 'bg-slate-900' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleReview} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Patient Information</h2>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Your full name"
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                max={todayValue}
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {Number.isInteger(derivedAge) && (
                <p className="mt-2 text-sm text-slate-500">Age: {derivedAge}</p>
              )}
              {errors.dateOfBirth && <p className="mt-2 text-sm text-red-600">{errors.dateOfBirth}</p>}
            </div>

            {Number.isInteger(derivedAge) && derivedAge < 18 && (
              <div>
                <label htmlFor="guardianContact" className="block text-sm font-medium text-slate-700">
                  Guardian Contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="guardianContact"
                  name="guardianContact"
                  value={formData.guardianContact}
                  onChange={handleChange}
                  required
                  className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Guardian name and phone number"
                />
                {errors.guardianContact && (
                  <p className="mt-2 text-sm text-red-600">{errors.guardianContact}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="medicalIssue" className="block text-sm font-medium text-slate-700">
                Medical Issue <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-sm text-slate-500">
                Include symptoms, duration, and severity. Example: Bad toothache for the last 3 days, worse when eating.
              </p>
              <textarea
                id="medicalIssue"
                name="medicalIssue"
                value={formData.medicalIssue}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Describe your dental issue..."
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {showEmergencyWarning && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  If this is a life-threatening emergency, do not book online. Call emergency services or go to the nearest emergency department.
                </div>
              )}
              {errors.medicalIssue && <p className="mt-2 text-sm text-red-600">{errors.medicalIssue}</p>}
            </div>

            <div>
              <label htmlFor="emergencyLevel" className="block text-sm font-medium text-slate-700">
                Emergency Level <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-sm text-slate-500">
                Low = routine checkup. Medium = symptoms but stable. High = urgent or severe symptoms.
              </p>
              <select
                id="emergencyLevel"
                name="emergencyLevel"
                value={formData.emergencyLevel}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {EMERGENCY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              {errors.emergencyLevel && <p className="mt-2 text-sm text-red-600">{errors.emergencyLevel}</p>}
            </div>

            <button
              type="button"
              onClick={handleContinueToCalendar}
              disabled={!hasStep1RequiredFields}
              className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              Continue to Calendar
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Select Date & Time</h2>
            <p className="text-sm text-slate-500">Available weekdays, 8:00 AM - 5:00 PM, up to 1 month ahead.</p>

            <div>
              <label className="block text-sm font-medium text-slate-700">Duration</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {DURATIONS.map((duration) => (
                  <button
                    key={duration.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, duration: duration.value, time: '' }))
                    }
                    className={`rounded-2xl border p-4 text-center transition ${
                      Number(formData.duration) === duration.value
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <p className="font-medium">{duration.label}</p>
                    <p className="text-sm text-slate-500">${duration.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-700">
                Appointment Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleDateChange}
                min={todayValue}
                max={maxDateValue}
                required
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {dateError && <p className="mt-2 text-sm text-red-600">{dateError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Quick Weekday Picks</label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {businessDays.slice(0, 10).map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setDateError('')
                      setFormData((prev) => ({ ...prev, date, time: '' }))
                    }}
                    className={`rounded-2xl border p-2 text-center text-sm transition ${
                      formData.date === date
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </button>
                ))}
              </div>
            </div>

            {formData.date && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Appointment Time</label>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {workingTimes.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, time }))}
                      className={`rounded-2xl border p-2 text-center text-sm transition ${
                        formData.time === time
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 hover:border-sky-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!isStep2Valid}
                className="flex-1 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Review Booking
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Confirm Appointment</h2>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p><span className="font-medium text-slate-700">Name:</span> {formData.name}</p>
              <p><span className="font-medium text-slate-700">Date of Birth:</span> {formData.dateOfBirth}</p>
              <p><span className="font-medium text-slate-700">Age:</span> {getAge(formData.dateOfBirth)}</p>
              {formData.guardianContact && (
                <p><span className="font-medium text-slate-700">Guardian:</span> {formData.guardianContact}</p>
              )}
              <p><span className="font-medium text-slate-700">Issue:</span> {formData.medicalIssue}</p>
              <p>
                <span className="font-medium text-slate-700">Emergency:</span>{' '}
                {EMERGENCY_LEVELS.find((level) => level.value === formData.emergencyLevel)?.label}
              </p>
              <p><span className="font-medium text-slate-700">Duration:</span> {selectedDuration?.label}</p>
              <p><span className="font-medium text-slate-700">Price:</span> ${selectedDuration?.price}</p>
              <p><span className="font-medium text-slate-700">Date:</span> {formData.date}</p>
              <p><span className="font-medium text-slate-700">Time:</span> {formData.time}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveBooking}
                className="flex-1 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {isSecretary ? 'Approve' : 'Send for Approval'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
    </div>
  )
}

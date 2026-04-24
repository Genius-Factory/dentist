import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

// Lebanon working hours: Mon-Fri, 8am-4pm
const WORKING_HOURS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
]

const DURATIONS = [
  { value: 30, label: '30 minutes', price: 10 },
  { value: 60, label: '1 hour', price: 20 },
]

const EMERGENCY_LEVELS = [
  { value: 'low', label: 'Low - Regular checkup' },
  { value: 'medium', label: 'Medium - Needs attention soon' },
  { value: 'high', label: 'High - Urgent care needed' },
]

function getNextBusinessDays() {
  const dates = []
  const today = new Date()
  
  for (let i = 0; dates.length < 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const day = date.getDay()
    // Monday = 1, Friday = 5
    if (day >= 1 && day <= 5) {
      dates.push(date.toISOString().split('T')[0])
    }
  }
  return dates
}

export default function ReservationPage() {
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    medicalIssue: '',
    emergencyLevel: 'low',
    duration: 30,
    date: '',
    time: '',
  })
  const [step, setStep] = useState(1) // 1: info, 2: calendar, 3: confirm
  const [submitted, setSubmitted] = useState(false)
  const [countdown, setCountdown] = useState(null)

  const businessDays = getNextBusinessDays()
  const selectedDuration = DURATIONS.find(d => d.value === formData.duration)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const isStep1Valid = formData.name && formData.age && formData.medicalIssue && formData.emergencyLevel

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isLoaded) return
    if (!user) {
      navigate('/sign-in')
      return
    }
    setSubmitted(true)
  }

  // Countdown timer for 24 hours edit window
  useEffect(() => {
    if (submitted) {
      const endTime = new Date().getTime() + 24 * 60 * 60 * 1000
      const interval = setInterval(() => {
        const now = new Date().getTime()
        const remaining = endTime - now
        if (remaining <= 0) {
          setCountdown('Expired')
          clearInterval(interval)
        } else {
          const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
          setCountdown(`${hours}h ${minutes}m ${seconds}s`)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [submitted])

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Appointment Booked!</h2>
          <p className="mt-2 text-slate-600">
            Your appointment has been scheduled. You can edit within 24 hours.
          </p>
          
          {countdown && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-700">
              <span className="text-sm font-medium">Edit window: </span>
              <span className="font-mono">{countdown}</span>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-left">
            <p className="text-sm font-medium text-slate-700">Appointment Details</p>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p><span className="font-medium">Name:</span> {formData.name}</p>
              <p><span className="font-medium">Age:</span> {formData.age}</p>
              <p><span className="font-medium">Issue:</span> {formData.medicalIssue}</p>
              <p><span className="font-medium">Emergency:</span> {EMERGENCY_LEVELS.find(e => e.value === formData.emergencyLevel)?.label}</p>
              <p><span className="font-medium">Duration:</span> {selectedDuration?.label}</p>
              <p><span className="font-medium">Price:</span> ${selectedDuration?.price}</p>
              <p><span className="font-medium">Date:</span> {formData.date}</p>
              <p><span className="font-medium">Time:</span> {formData.time}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-4 justify-center">
            <button className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Approve
            </button>
            <button className="rounded-full border border-red-200 px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50">
              Cancel
            </button>
          </div>

          <button
            onClick={() => {
              setSubmitted(false)
              setFormData({ name: '', age: '', medicalIssue: '', emergencyLevel: 'low', duration: 30, date: '', time: '' })
              setStep(1)
            }}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700"
          >
            Book Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Book an Appointment</h1>
        <p className="mt-2 text-slate-600">Fill in your details to schedule a visit.</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step >= s ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`h-1 w-12 ${step > s ? 'bg-slate-900' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Step 1: Personal Info */}
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
                className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-slate-700">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                required
                min="1"
                max="150"
                className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Your age"
              />
            </div>

            <div>
              <label htmlFor="medicalIssue" className="block text-sm font-medium text-slate-700">
                Medical Issue <span className="text-red-500">*</span>
              </label>
              <textarea
                id="medicalIssue"
                name="medicalIssue"
                value={formData.medicalIssue}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Describe your dental issue..."
                className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label htmlFor="emergencyLevel" className="block text-sm font-medium text-slate-700">
                Emergency Level <span className="text-red-500">*</span>
              </label>
              <select
                id="emergencyLevel"
                name="emergencyLevel"
                value={formData.emergencyLevel}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {EMERGENCY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              Continue to Calendar
            </button>
          </div>
        )}

        {/* Step 2: Calendar & Time Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Select Date & Time</h2>
            <p className="text-sm text-slate-500">Mon-Fri, 8:00 AM - 4:00 PM (Lebanon Time)</p>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Duration</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, duration: d.value }))}
                    className={`rounded-lg border p-4 text-center transition ${
                      formData.duration === d.value
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <p className="font-medium">{d.label}</p>
                    <p className="text-sm text-slate-500">${d.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Select Date</label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                {businessDays.slice(0, 10).map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, date, time: '' }))}
                    className={`rounded-lg border p-2 text-center text-sm transition ${
                      formData.date === date
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {formData.date && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Select Time</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {WORKING_HOURS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, time }))}
                      className={`rounded-lg border p-2 text-center text-sm transition ${
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
                disabled={!formData.date || !formData.time}
                className="flex-1 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export const PATIENT_PROFILES_STORAGE_KEY = 'dentistPatientProfiles'

export const emptyPatientProfile = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  guardianName: '',
  guardianRelationship: '',
  guardianPhone: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  allergies: '',
  notes: '',
  preferredContactMethod: 'Phone',
  communicationPreference: 'WhatsApp',
  language: 'English',
}

export function getStoredPatientProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PATIENT_PROFILES_STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function saveStoredPatientProfiles(profiles) {
  localStorage.setItem(PATIENT_PROFILES_STORAGE_KEY, JSON.stringify(profiles))
}

export function getFullName(profile) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
}

export function getAge(dateOfBirth) {
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

export function splitList(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function createProfileFromForm(form, userId) {
  const now = new Date().toISOString()

  return {
    ...emptyPatientProfile,
    ...form,
    communicationPreference: form.communicationPreference === 'SMS' ? 'WhatsApp' : form.communicationPreference,
    id: form.id || crypto.randomUUID(),
    userId,
    createdAt: form.createdAt || now,
    updatedAt: now,
  }
}

export function profileToBookingFields(profile) {
  return {
    profileId: profile.id,
    name: getFullName(profile),
    dateOfBirth: profile.dateOfBirth,
    guardianContact: '',
  }
}

export function assignMissingBookingProfiles(bookings, profiles) {
  let changed = false
  const firstProfileByUser = profiles.reduce((profilesByUser, profile) => {
    if (profile.userId && !profilesByUser[profile.userId]) {
      profilesByUser[profile.userId] = profile
    }
    return profilesByUser
  }, {})

  const nextBookings = bookings.map((booking) => {
    if (booking.profileId) return booking

    const firstProfile = firstProfileByUser[booking.userId]
    if (!firstProfile) return booking

    changed = true
    return {
      ...booking,
      ...profileToBookingFields(firstProfile),
      updatedAt: booking.updatedAt || new Date().toISOString(),
    }
  })

  return { bookings: nextBookings, changed }
}

export function findProfileForBooking(profiles, booking) {
  if (booking.profileId) {
    return profiles.find((profile) => profile.id === booking.profileId)
  }

  return profiles.find(
    (profile) =>
      getFullName(profile).toLowerCase() === (booking.name || '').toLowerCase() &&
      profile.dateOfBirth === booking.dateOfBirth,
  )
}

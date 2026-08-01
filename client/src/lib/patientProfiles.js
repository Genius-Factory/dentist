export const emptyPatientProfile = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  profilePicture: '',
  profilePictureType: '',
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

export function getProfilePictureSrc(profile) {
  if (!profile?.profilePicture) return ''
  if (String(profile.profilePicture).startsWith('data:')) return profile.profilePicture
  if (!profile.profilePictureType) return ''
  return `data:${profile.profilePictureType};base64,${profile.profilePicture}`
}


export function getFullName(profile) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
}

export function getAge(dateOfBirth) {
  if (!dateOfBirth) return ''
  const dateValue = dateOfBirth instanceof Date
    ? dateOfBirth.toISOString().slice(0, 10)
    : String(dateOfBirth).slice(0, 10)
  const birthDate = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return ''
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
    dateOfBirth: profile.dateOfBirth instanceof Date
      ? profile.dateOfBirth.toISOString().slice(0, 10)
      : String(profile.dateOfBirth || '').slice(0, 10),
    guardianContact: '',
  }
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

/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { ArrowLeft, Calendar, ClipboardList, Contact, Edit3, ImagePlus, Mail, MapPin, Phone, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getBookingStatus,
  getStatusClasses,
  getStatusLabel,
  isArchivedBooking,
  isStaffRole,
  normalizeRole,
} from '../lib/bookings'
import {
  createProfileFromForm,
  emptyPatientProfile,
  findProfileForBooking,
  getAge,
  getFullName,
  getProfilePictureSrc,
  splitList,
} from '../lib/patientProfiles'
import { createProfile, deleteProfilePicture, getAppointments, getProfiles, updateProfile, uploadProfilePicture } from '../lib/recordsApi'

function formatDate(dateValue) {
  if (!dateValue) return 'Not set'
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function appointmentTime(booking) {
  return new Date(`${booking.date}T${booking.time || '00:00'}`).getTime()
}

const fieldClass = 'mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-4 sm:col-span-2">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

function ProfileForm({ initialProfile, onCancel, onSave, onRemovePicture, onSavePicture }) {
  const [form, setForm] = useState(initialProfile)
  const [saving, setSaving] = useState(false)
  const [savingPicture, setSavingPicture] = useState(false)
  const todayValue = new Date().toISOString().split('T')[0]
  const age = getAge(form.dateOfBirth)
  const isMinor = Number.isInteger(age) && age < 18
  const update = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const imagePreview = getProfilePictureSrc(form)
  const handleProfilePictureChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, WebP, or GIF image')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile picture must be smaller than 2 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      console.log('[profile-picture] selected file', { name: file.name, size: file.size, type: file.type, profileId: form.id || null })
      setForm((prev) => ({
        ...prev,
        profilePicture: reader.result,
        profilePictureType: file.type,
        profilePictureFile: file,
        removeProfilePicture: false,
      }))
    }
    reader.onerror = () => toast.error('Unable to read that image')
    reader.readAsDataURL(file)
  }
  const savePicture = async () => {
    if (!form.id) {
      toast.error('Save the profile details first, then save the photo')
      return
    }

    if (!form.profilePictureFile) {
      toast.error('Choose a new photo before saving')
      return
    }

    setSavingPicture(true)
    try {
      console.log('[profile-picture] Save Photo clicked', { profileId: form.id, size: form.profilePictureFile.size, type: form.profilePictureFile.type })
      const savedProfile = await onSavePicture(form.id, form.profilePictureFile)
      console.log('[profile-picture] Save Photo response', {
        profileId: savedProfile.id,
        hasProfilePicture: Boolean(savedProfile.profilePicture),
        profilePictureType: savedProfile.profilePictureType || '',
        profilePictureBase64Length: savedProfile.profilePicture?.length || 0,
      })
      setForm((prev) => ({ ...prev, ...savedProfile, profilePictureFile: null, removeProfilePicture: false }))
      toast.success('Profile photo saved')
    } catch (error) {
      console.error('[profile-picture] save failed', error)
      toast.error(error.message || 'Unable to save profile photo')
    } finally {
      setSavingPicture(false)
    }
  }
  const removePicture = async () => {
    if (!form.id) {
      setForm((prev) => ({
        ...prev,
        profilePicture: '',
        profilePictureType: '',
        profilePictureFile: null,
        removeProfilePicture: true,
      }))
      return
    }

    setSavingPicture(true)
    try {
      console.log('[profile-picture] Remove clicked', { profileId: form.id })
      const savedProfile = await onRemovePicture(form.id)
      console.log('[profile-picture] Remove response', {
        profileId: savedProfile.id,
        hasProfilePicture: Boolean(savedProfile.profilePicture),
        profilePictureType: savedProfile.profilePictureType || '',
      })
      setForm((prev) => ({ ...prev, ...savedProfile, profilePictureFile: null, removeProfilePicture: false }))
      toast.success('Profile photo removed')
    } catch (error) {
      console.error('[profile-picture] remove failed', error)
      toast.error(error.message || 'Unable to remove profile photo')
    } finally {
      setSavingPicture(false)
    }
  }
  const hasValue = (value) => String(value || '').trim().length > 0
  const isFormComplete =
    hasValue(form.firstName) &&
    hasValue(form.lastName) &&
    hasValue(form.dateOfBirth) &&
    hasValue(form.gender) &&
    hasValue(form.phone) &&
    hasValue(form.email) &&
    hasValue(form.address) &&
    hasValue(form.emergencyContactName) &&
    hasValue(form.emergencyContactRelationship) &&
    hasValue(form.emergencyContactPhone) &&
    hasValue(form.preferredContactMethod) &&
    hasValue(form.communicationPreference) &&
    hasValue(form.language) &&
    (!isMinor || (hasValue(form.guardianName) && hasValue(form.guardianRelationship) && hasValue(form.guardianPhone)))

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
          await onSave(form)
          toast.success('Patient profile saved')
        } catch (error) {
          toast.error(error.message || 'Unable to save the patient profile')
        } finally {
          setSaving(false)
        }
      }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-cyan-200 text-2xl font-semibold text-cyan-800">
            {imagePreview ? <img src={imagePreview} alt="Profile preview" className="h-full w-full object-cover" /> : <User size={36} />}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-medium text-slate-800">Profile Picture</p>
              <p className="mt-1 text-sm text-slate-500">Upload a clear face photo. JPEG, PNG, WebP, or GIF, max 2 MB.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50">
                <ImagePlus size={16} />
                Upload Photo
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleProfilePictureChange} className="sr-only" />
              </label>
              {form.profilePictureFile && (
                <button
                  type="button"
                  onClick={savePicture}
                  disabled={savingPicture}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPicture ? 'Saving Photo...' : 'Save Photo'}
                </button>
              )}
              {imagePreview && (
                <button
                  type="button"
                  onClick={removePicture}
                  disabled={savingPicture}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  {savingPicture ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        </div>
        <SectionDivider label="Personal Details" />
        <label className="text-sm font-medium text-slate-700">First Name<input name="firstName" value={form.firstName} onChange={update} required className={fieldClass} /></label>
        <label className="text-sm font-medium text-slate-700">Last Name<input name="lastName" value={form.lastName} onChange={update} required className={fieldClass} /></label>
        <label className="text-sm font-medium text-slate-700">Date of Birth<input type="date" name="dateOfBirth" value={form.dateOfBirth} max={todayValue} onChange={update} required className={fieldClass} /></label>
        <label className="text-sm font-medium text-slate-700">Gender<select name="gender" value={form.gender} onChange={update} required className={fieldClass}><option value="">Select gender</option><option>Male</option><option>Female</option></select></label>
        <SectionDivider label="Contact Information" />
        <label className="text-sm font-medium text-slate-700">Phone<input name="phone" value={form.phone} onChange={update} required className={fieldClass} /></label>
        <label className="text-sm font-medium text-slate-700">Email<input type="email" name="email" value={form.email} onChange={update} required className={fieldClass} /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Address<input name="address" value={form.address} onChange={update} required className={fieldClass} /></label>
        {isMinor && (
          <>
            <SectionDivider label="Guardian Information" />
            <label className="text-sm font-medium text-slate-700">Guardian Name<input name="guardianName" value={form.guardianName || ''} onChange={update} required className={fieldClass} /></label>
            <label className="text-sm font-medium text-slate-700">Relationship<input name="guardianRelationship" value={form.guardianRelationship || ''} onChange={update} required className={fieldClass} /></label>
            <label className="text-sm font-medium text-slate-700">Guardian Phone<input name="guardianPhone" value={form.guardianPhone || ''} onChange={update} required className={fieldClass} /></label>
          </>
        )}
        <SectionDivider label="Emergency Contact" />
        <label className="text-sm font-medium text-slate-700">Emergency Contact<input name="emergencyContactName" value={form.emergencyContactName} onChange={update} required className={fieldClass} /></label>
        <label className="text-sm font-medium text-slate-700">Relationship<input name="emergencyContactRelationship" value={form.emergencyContactRelationship} onChange={update} required className={fieldClass} /></label>
        <label className="text-sm font-medium text-slate-700">Emergency Phone<input name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={update} required className={fieldClass} /></label>
        <SectionDivider label="Preferences" />
        <label className="text-sm font-medium text-slate-700">Preferred Contact<select name="preferredContactMethod" value={form.preferredContactMethod === 'SMS' ? 'WhatsApp' : form.preferredContactMethod} onChange={update} required className={fieldClass}><option>Phone</option><option>Email</option><option>WhatsApp</option></select></label>
        <label className="text-sm font-medium text-slate-700">Communication<select name="communicationPreference" value={form.communicationPreference === 'SMS' ? 'WhatsApp' : form.communicationPreference} onChange={update} required className={fieldClass}><option>WhatsApp</option><option>Email</option><option>Phone call</option></select></label>
        <label className="text-sm font-medium text-slate-700">Language<select name="language" value={form.language} onChange={update} required className={fieldClass}><option>English</option><option>French</option><option>Arabic</option></select></label>
        <SectionDivider label="Medical Notes" />
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Allergies <span className="font-normal text-slate-400">(optional)</span><input name="allergies" value={form.allergies} onChange={update} placeholder="Comma separated" className={fieldClass} /><span className="mt-2 block text-xs font-normal text-slate-500">Leave empty if you have no allergies.</span></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Notes <span className="font-normal text-slate-400">(optional)</span><textarea name="notes" value={form.notes} onChange={update} rows={3} className={fieldClass} /></label>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="w-full rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">Cancel</button>
        <button type="submit" disabled={!isFormComplete || saving} className="w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{saving ? 'Saving...' : 'Save Details'}</button>
      </div>
    </form>
  )
}

export default function PatientDetailsPage({ forceCreate = false }) {
  const navigate = useNavigate()
  const { profileId } = useParams()
  const [searchParams] = useSearchParams()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedId, setSelectedId] = useState(profileId || '')
  const [mode, setMode] = useState('view')
  const role = user?.publicMetadata?.role || 'member'
  const normalizedRole = normalizeRole(role)
  const isStaff = isStaffRole(role)
  const canCreateProfile = normalizedRole === 'member' || normalizedRole === 'admin'
  const profileHomePath = isStaff ? '/patients' : '/my-profile'

  useEffect(() => {
    if (!isLoaded || !user) return
    Promise.all([getProfiles(getToken), getAppointments(getToken)]).then(([visibleProfiles, appointments]) => {
    setProfiles(visibleProfiles)
    setBookings(appointments)
    if (profileId) setSelectedId(profileId)
    if (!profileId && visibleProfiles[0]) setSelectedId(visibleProfiles[0].id)
    if ((forceCreate || searchParams.get('create') === '1') && canCreateProfile) setMode('create')
    }).catch(console.error)
  }, [canCreateProfile, forceCreate, getToken, isLoaded, profileId, searchParams, user])

  const selectedProfile = profiles.find((profile) => profile.id === selectedId) || null
  const canEdit = Boolean(selectedProfile && !isStaff && selectedProfile.userId === user?.id)
  const profileBookings = useMemo(() => {
    if (!selectedProfile) return []
    return bookings
      .filter((booking) => (!isStaff ? booking.userId === user?.id : true) && findProfileForBooking([selectedProfile], booking))
      .sort((a, b) => appointmentTime(a) - appointmentTime(b))
  }, [bookings, isStaff, selectedProfile, user?.id])
  const now = Date.now()
  const activeProfileBookings = profileBookings.filter((booking) => !isArchivedBooking(booking, now))
  const archivedProfileBookings = profileBookings.filter((booking) => isArchivedBooking(booking, now)).reverse()
  const upcomingAppointment = activeProfileBookings.find((booking) => appointmentTime(booking) >= now)

  const saveProfile = async (form) => {
    const nextProfile = createProfileFromForm(form, user.id)
    console.log('[profile-picture] Save Details clicked', {
      profileId: nextProfile.id,
      hasPendingPhotoFile: Boolean(form.profilePictureFile),
      removeProfilePicture: Boolean(form.removeProfilePicture),
      profilePictureType: form.profilePictureType || '',
      profilePictureBase64Length: typeof form.profilePicture === 'string' ? form.profilePicture.length : 0,
    })
    const profilePayload = { ...nextProfile }
    delete profilePayload.profilePicture
    delete profilePayload.profilePictureType
    delete profilePayload.profilePictureFile
    delete profilePayload.removeProfilePicture

    let visibleSavedProfile = form.id ? await updateProfile(getToken, profilePayload) : await createProfile(getToken, profilePayload)

    if (form.profilePictureFile) {
      console.log('[profile-picture] Save Details uploading pending photo', {
        profileId: visibleSavedProfile.id,
        size: form.profilePictureFile.size,
        type: form.profilePictureFile.type,
      })
      visibleSavedProfile = await uploadProfilePicture(getToken, visibleSavedProfile.id, form.profilePictureFile)
    } else if (form.removeProfilePicture) {
      console.log('[profile-picture] Save Details removing photo', { profileId: visibleSavedProfile.id })
      visibleSavedProfile = await deleteProfilePicture(getToken, visibleSavedProfile.id)
    }

    console.log('[profile-picture] Save Details final profile', {
      profileId: visibleSavedProfile.id,
      hasProfilePicture: Boolean(visibleSavedProfile.profilePicture),
      profilePictureType: visibleSavedProfile.profilePictureType || '',
      profilePictureBase64Length: visibleSavedProfile.profilePicture?.length || 0,
    })

    setProfiles((items) => form.id ? items.map((profile) => profile.id === visibleSavedProfile.id ? visibleSavedProfile : profile) : [...items, visibleSavedProfile])
    setSelectedId(visibleSavedProfile.id)
    setMode('view')
  }

  const updateSavedProfile = (savedProfile) => {
    setProfiles((items) => items.map((profile) => profile.id === savedProfile.id ? savedProfile : profile))
    setSelectedId(savedProfile.id)
    return savedProfile
  }

  const saveProfilePicture = async (id, file) => {
    console.log('[profile-picture] parent uploadProfilePicture start', { profileId: id, size: file.size, type: file.type })
    const savedProfile = await uploadProfilePicture(getToken, id, file)
    console.log('[profile-picture] parent uploadProfilePicture done', {
      profileId: savedProfile.id,
      hasProfilePicture: Boolean(savedProfile.profilePicture),
      profilePictureType: savedProfile.profilePictureType || '',
      profilePictureBase64Length: savedProfile.profilePicture?.length || 0,
    })
    return updateSavedProfile(savedProfile)
  }

  const removeProfilePicture = async (id) => {
    console.log('[profile-picture] parent deleteProfilePicture start', { profileId: id })
    const savedProfile = await deleteProfilePicture(getToken, id)
    console.log('[profile-picture] parent deleteProfilePicture done', {
      profileId: savedProfile.id,
      hasProfilePicture: Boolean(savedProfile.profilePicture),
      profilePictureType: savedProfile.profilePictureType || '',
    })
    return updateSavedProfile(savedProfile)
  }

  if (!isLoaded) {
    return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Loading patient details...</div>
  }

  if (!user) return <Navigate to={`/sign-in?redirect_url=${profileHomePath}`} replace />

  if (mode === 'edit' || mode === 'create') {
    return (
        <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => setMode('view')} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"><ArrowLeft size={18} /> Patient Details</button>
        <ProfileForm initialProfile={mode === 'create' ? emptyPatientProfile : selectedProfile || emptyPatientProfile} onCancel={() => setMode('view')} onRemovePicture={removeProfilePicture} onSave={saveProfile} onSavePicture={saveProfilePicture} />
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{canCreateProfile ? 'Create your first patient profile' : 'No patient profiles yet'}</h1>
        <p className="mt-2 text-slate-600">{canCreateProfile ? 'Save details once, then reuse the profile while booking appointments.' : 'Profiles will appear here after members or admins create them.'}</p>
        {canCreateProfile && <button onClick={() => setMode('create')} className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Create Profile</button>}
      </div>
    )
  }

  if (!selectedProfile) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Patient profile not found</h1>
        <button onClick={() => navigate(profileHomePath)} className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Back to {isStaff ? 'Patients' : 'My Profile'}</button>
      </div>
    )
  }

  const allergies = splitList(selectedProfile.allergies)
  const initials = getFullName(selectedProfile).split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()
  const profilePictureSrc = getProfilePictureSrc(selectedProfile)
  const selectedAge = getAge(selectedProfile.dateOfBirth)
  const isSelectedMinor = Number.isInteger(selectedAge) && selectedAge < 18

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 overflow-x-hidden py-4 sm:px-2 sm:py-8 lg:px-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"><ArrowLeft size={18} /> Back</button>
          <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Patient Details</h1>
          <p className="mt-2 text-sm text-slate-500">Patients / Patient Details</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 sm:w-auto">
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{getFullName(profile)}</option>)}
          </select>
          {canEdit && (
            <button onClick={() => setMode('edit')} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 sm:w-auto"><Edit3 size={16} /> Edit Details</button>
          )}
          {canCreateProfile && (
            <button onClick={() => setMode('create')} className="w-full rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">
              Create Profile
            </button>
          )}
          <Link to="/reservation" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 sm:w-auto"><Calendar size={16} /> Book Appointment</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center self-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-cyan-200 text-3xl font-semibold text-cyan-800 sm:h-36 sm:w-36 sm:self-start sm:text-4xl">
              {profilePictureSrc ? <img src={profilePictureSrc} alt={getFullName(selectedProfile)} className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">{getFullName(selectedProfile)}</h2>
                  <p className="mt-2 text-sm text-slate-500">Member ID: {selectedProfile.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-[150px_1fr]">
                <dt className="flex items-center gap-2 font-medium text-slate-500"><Calendar size={16} /> Age</dt><dd>{selectedAge || 'Not set'} Years</dd>
                <dt className="flex items-center gap-2 font-medium text-slate-500"><User size={16} /> Gender</dt><dd>{selectedProfile.gender || 'Not set'}</dd>
                <dt className="flex items-center gap-2 font-medium text-slate-500"><Phone size={16} /> Phone</dt><dd className="text-blue-600">{selectedProfile.phone || 'Not set'}</dd>
                <dt className="flex items-center gap-2 font-medium text-slate-500"><Mail size={16} /> Email</dt><dd className="break-words text-blue-600">{selectedProfile.email || 'Not set'}</dd>
                <dt className="flex items-center gap-2 font-medium text-slate-500"><MapPin size={16} /> Address</dt><dd>{selectedProfile.address || 'Not set'}</dd>
                {isSelectedMinor && (
                  <>
                    <dt className="flex items-center gap-2 font-medium text-slate-500"><Contact size={16} /> Guardian</dt>
                    <dd>{selectedProfile.guardianName || 'Not set'}{selectedProfile.guardianRelationship ? ` (${selectedProfile.guardianRelationship})` : ''}{selectedProfile.guardianPhone ? <span className="block">{selectedProfile.guardianPhone}</span> : null}</dd>
                  </>
                )}
                <dt className="flex items-center gap-2 font-medium text-slate-500"><Contact size={16} /> Emergency</dt>
                <dd>{selectedProfile.emergencyContactName || 'Not set'}{selectedProfile.emergencyContactRelationship ? ` (${selectedProfile.emergencyContactRelationship})` : ''}{selectedProfile.emergencyContactPhone ? <span className="block">{selectedProfile.emergencyContactPhone}</span> : null}</dd>
              </dl>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-950"><Calendar className="text-blue-600" /> Upcoming Appointment</h2>
            <Link to="/booked" className="text-sm font-semibold text-blue-600 transition hover:text-blue-700">View Calendar</Link>
          </div>
          {upcomingAppointment ? (
            <div className="rounded-2xl border border-slate-200 p-5">
                <div className="grid gap-5 sm:grid-cols-[88px_1fr_auto] sm:items-center">
                  <div className="border-b border-slate-200 pb-4 text-center sm:border-b-0 sm:border-r sm:pb-0">
                  <p className="text-xs font-semibold uppercase text-slate-500">{new Date(`${upcomingAppointment.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-3xl font-semibold text-slate-950">{new Date(`${upcomingAppointment.date}T00:00:00`).getDate()}</p>
                  <p className="text-xs font-semibold uppercase text-slate-500">{new Date(`${upcomingAppointment.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                </div>
                <div className="space-y-2 text-sm text-slate-600"><p>{upcomingAppointment.time} / {upcomingAppointment.duration} minutes</p><p>{upcomingAppointment.medicalIssue}</p></div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(getBookingStatus(upcomingAppointment))}`}>{getStatusLabel(getBookingStatus(upcomingAppointment))}</span>
              </div>
            </div>
          ) : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No upcoming appointment.</div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><ClipboardList size={18} /> Archives</h2>
            <Link to="/booked" className="text-sm font-semibold text-blue-600 transition hover:text-blue-700">View Appointments</Link>
          </div>
          <div className="divide-y divide-slate-100 sm:hidden">
            {archivedProfileBookings.map((booking) => (
              <article key={booking.id} className="space-y-3 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</p>
                    <p className="mt-1 font-medium text-slate-800">{formatDate(booking.date)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(getBookingStatus(booking))}`}>{getStatusLabel(getBookingStatus(booking))}</span>
                </div>
                <div className="grid gap-3 xs:grid-cols-2">
                  <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Service</p><p className="mt-1 break-words text-slate-700">{booking.medicalIssue}</p></div>
                  <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dentist</p><p className="mt-1 text-slate-700">Dental Team</p></div>
                </div>
              </article>
            ))}
            {archivedProfileBookings.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No archived appointments yet.</p>}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-slate-500"><tr><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 font-medium">Service</th><th className="px-6 py-3 font-medium">Dentist</th><th className="px-6 py-3 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {archivedProfileBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-3 text-slate-600">{formatDate(booking.date)}</td>
                    <td className="px-6 py-3 text-slate-700">{booking.medicalIssue}</td>
                    <td className="px-6 py-3 text-slate-600">Dental Team</td>
                    <td className="px-6 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(getBookingStatus(booking))}`}>{getStatusLabel(getBookingStatus(booking))}</span></td>
                  </tr>
                ))}
                {archivedProfileBookings.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No archived appointments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-6 text-xl font-semibold text-slate-950">Notes & Preferences</h2>
          <div className="grid gap-5 border-b border-slate-200 pb-6 text-sm sm:grid-cols-3">
            <div><p className="text-slate-500">Preferred Contact Method</p><p className="mt-2 font-medium text-slate-800">{selectedProfile.preferredContactMethod || 'Phone'}</p></div>
            <div><p className="text-slate-500">Communication Preference</p><p className="mt-2 font-medium text-slate-800">{selectedProfile.communicationPreference === 'SMS' ? 'WhatsApp' : selectedProfile.communicationPreference || 'WhatsApp'}</p></div>
            <div><p className="text-slate-500">Language</p><p className="mt-2 font-medium text-slate-800">{selectedProfile.language || 'English'}</p></div>
          </div>
          <div className="mt-6">
            <p className="font-medium text-slate-700">Allergies / Important Notes</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {allergies.length ? allergies.map((allergy, index) => (
                <span key={allergy} className={`rounded-full px-4 py-2 text-sm font-semibold ${index % 3 === 0 ? 'bg-red-100 text-red-700' : index % 3 === 1 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{allergy}</span>
              )) : <span className="text-sm text-slate-500">No allergies recorded.</span>}
            </div>
          </div>
          <div className="mt-6"><p className="font-medium text-slate-700">Additional Notes</p><p className="mt-3 text-sm leading-6 text-slate-600">{selectedProfile.notes || 'No additional notes recorded.'}</p></div>
        </section>
      </div>
    </div>
  )
}

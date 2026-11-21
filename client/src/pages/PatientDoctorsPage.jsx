import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search, Stethoscope, BriefcaseMedical, CalendarDays } from 'lucide-react'
import PropTypes from 'prop-types'
import DatabaseLoading from '../components/DatabaseLoading'
import { getTeam } from '../lib/recordsApi'

function DoctorPhoto({ doctor }) {
  const [failed, setFailed] = useState(false)
  const initials = doctor.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <div className="directory-photo">
    {doctor.profileImageUrl && !failed
      ? <img src={doctor.profileImageUrl} alt={doctor.name} onError={() => setFailed(true)} />
      : <span aria-label={`${doctor.name} profile photo`}>{initials}</span>}
  </div>
}
DoctorPhoto.propTypes = { doctor: PropTypes.shape({ name: PropTypes.string.isRequired, profileImageUrl: PropTypes.string }).isRequired }

export default function PatientDoctorsPage() {
  const { getToken } = useAuth()
  const { doctorId } = useParams()
  const [team, setTeam] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [service, setService] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    getTeam(getToken).then(items => { if (active) setTeam(items) })
      .catch(e => { if (active) setError(e.message || 'Unable to load doctors.') })
    return () => { active = false }
  }, [getToken, attempt])

  if (error) return <main className="patient-directory"><div className="directory-empty" role="alert"><h1>Unable to load doctors</h1><p>{error}</p><button className="directory-primary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div></main>
  if (!team) return <DatabaseLoading label="Loading doctors…" />
  const services = [...new Set(team.flatMap(doctor => doctor.services))].sort()
  const query = search.trim().toLowerCase()
  const doctors = team.filter(doctor => doctorId
    ? (doctor.doctorId || doctor.id) === doctorId
    : (!service || doctor.services.includes(service)) && [doctor.name, doctor.specialty, ...doctor.services].join(' ').toLowerCase().includes(query))
  return <main className="patient-directory">
    {doctorId ? <Link to="/doctors" className="directory-back"><ArrowLeft size={16} /> All doctors</Link> :
      <header className="directory-heading"><div><p className="directory-eyebrow">Our dental team</p><h1>Find your dentist</h1><p>Get to know our team and choose the care that feels right for you.</p></div><span className="directory-team-count"><Stethoscope size={19} />{team.length} {team.length === 1 ? 'dentist' : 'dentists'}</span></header>}
    {!doctorId && <div className="directory-toolbar">
      <label className="directory-search"><Search size={19} /><span className="sr-only">Search doctors</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name, specialty, or service" /></label>
      <label className="directory-filter"><span>Service</span><select value={service} onChange={event => setService(event.target.value)}><option value="">All services</option>{services.map(name => <option key={name}>{name}</option>)}</select></label>
    </div>}
    {!doctorId && <p className="directory-results" role="status">{doctors.length} {doctors.length === 1 ? 'dentist' : 'dentists'}{search || service ? ' matching your search' : ' available to explore'}</p>}
    <div className={doctorId ? 'directory-profile' : 'directory-grid'}>{doctors.map(doctor =>
      <article key={doctor.id} className="directory-card">
        <div className="directory-identity"><DoctorPhoto key={doctor.profileImageUrl} doctor={doctor} /><div><p className="directory-specialty">{doctor.specialty || 'Dentist'}</p>{doctorId ? <h1>{doctor.name}</h1> : <h2>{doctor.name}</h2>}{doctor.yearsOfExperience > 0 && <p className="directory-experience"><BriefcaseMedical size={15} />{doctor.yearsOfExperience} years of experience</p>}</div></div>
        {doctorId && doctor.bio && <section className="directory-biography"><h2>About {doctor.name}</h2><p>{doctor.bio}</p></section>}
        {!doctorId && doctor.bio && <p className="directory-bio-preview">{doctor.bio}</p>}
        <section className="directory-services"><h3>Services</h3>{doctor.services.length ? <ul>{doctor.services.map(name => <li key={name}>{name}</li>)}</ul> : <p>Contact the clinic to discuss care with this dentist.</p>}</section>
        <footer className="directory-actions">
          {!doctorId && <Link className="directory-secondary" to={`/doctors/${encodeURIComponent(doctor.doctorId || doctor.id)}`}>View profile <ArrowRight size={16} /></Link>}
          {!!doctor.services.length && <Link className="directory-primary" to={`/reservation?dentistId=${encodeURIComponent(doctor.id)}`}><CalendarDays size={16} />Book appointment</Link>}
        </footer>
      </article>)}</div>
    {!doctors.length && <div className="directory-empty"><Stethoscope size={30} /><h2>{doctorId ? 'Profile unavailable' : 'No dentists found'}</h2><p>{doctorId ? 'Explore the directory to find another dentist.' : 'Try another name or service.'}</p>{!doctorId && (search || service) && <button className="directory-secondary" onClick={() => { setSearch(''); setService('') }}>Clear filters</button>}</div>}
  </main>
}

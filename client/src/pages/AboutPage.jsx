import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getServices } from '../lib/recordsApi'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import {
  ArrowRight, CalendarDays, Check, CirclePlay, HeartHandshake, ShieldCheck,
  Sparkles, Star, Stethoscope, UsersRound, BadgeCheck,
} from 'lucide-react'
import clinicVisit from '../assets/clinic-visit.png'
import clinicStillLife from '../assets/services/dental-services-hero.png'

// Replace this demo object with a clinic API response when multi-clinic data is available.
const clinic = {
  name: 'Dentist Care & Smile Clinic',
  heroTitle: 'Thoughtful dentistry with a human touch.',
  intro: 'We make room for questions, calm conversations, and treatment plans that fit real lives. Every visit is designed to feel personal from the first hello to the final follow-up.',
  stats: [
    { value: 'Demo 1,200+', label: 'patients cared for', icon: UsersRound },
    { value: 'Demo 4.9/5', label: 'patient feedback', icon: Star },
    { value: 'Demo 12 years', label: 'serving our community', icon: CalendarDays },
    { value: '4 care areas', label: 'specialized services', icon: Stethoscope },
  ],
}

const values = [
  { title: 'Compassionate care', copy: 'We listen first, answer plainly, and adapt each visit to your comfort.', icon: HeartHandshake },
  { title: 'Modern treatment', copy: 'Thoughtful technology and current methods help make care more precise.', icon: Sparkles },
  { title: 'Transparency', copy: 'You receive clear options, practical next steps, and no rushed decisions.', icon: ShieldCheck },
  { title: 'Comfortable experience', copy: 'A calm setting and friendly guidance help visits feel easier from arrival onward.', icon: UsersRound },
]

const reasons = [
  'Personalized care for children, adults, and families',
  'Online appointment requests that fit your schedule',
  'A calm, modern setting built around comfort',
  'Support and guidance before, during, and after your visit',
]

const testimonials = [
  { quote: 'The team explained the plan in a way I could actually understand. I left feeling calm and cared for.', name: 'Demo patient A.', initials: 'AP' },
  { quote: 'Booking was simple, and everyone made the visit feel unhurried from the moment I arrived.', name: 'Demo patient B.', initials: 'BP' },
  { quote: 'A warm space, kind people, and a thoughtful follow-up. This is the dental care I had hoped to find.', name: 'Demo patient C.', initials: 'CP' },
]

function Eyebrow({ children }) { return <p className="about-eyebrow">{children}</p> }

function StatCard({ item }) {
  const Icon = item.icon
  return <article className="about-stat-card"><span><Icon size={22} /></span><div><strong>{item.value}</strong><p>{item.label}</p></div></article>
}

function DoctorCard({ doctor }) {
  return <article className="doctor-card">
    <div className="doctor-avatar" aria-hidden="true"><Stethoscope size={36} /></div>
    <div><p>Dentist</p><h3>{doctor.name}</h3><span>{doctor.services.join(', ')}</span><Link to="/reservation">Book appointment <ArrowRight size={14} /></Link></div>
  </article>
}

function TestimonialCard({ testimonial }) {
  return <article className="testimonial-card"><div className="testimonial-top"><span className="avatar-initials">{testimonial.initials}</span><div><div className="stars" aria-label="Demo five-star rating">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill="currentColor" />)}</div><p>{testimonial.name}</p></div></div><blockquote>“{testimonial.quote}”</blockquote></article>
}

Eyebrow.propTypes = { children: PropTypes.node.isRequired }
StatCard.propTypes = { item: PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired, icon: PropTypes.elementType.isRequired }).isRequired }
DoctorCard.propTypes = { doctor: PropTypes.shape({ name: PropTypes.string.isRequired, services: PropTypes.arrayOf(PropTypes.string).isRequired }).isRequired }
TestimonialCard.propTypes = { testimonial: PropTypes.shape({ quote: PropTypes.string.isRequired, name: PropTypes.string.isRequired, initials: PropTypes.string.isRequired }).isRequired }

export default function AboutPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let active = true
    setLoading(true)
    setError('')
    getServices(getToken).then((services) => {
      const team = new Map()
      for (const service of services.filter((item) => item.status === 'active')) {
        for (const dentist of service.dentists || []) {
          if (!team.has(dentist.id)) team.set(dentist.id, { ...dentist, services: [] })
          const assignedServices = team.get(dentist.id).services
          if (!assignedServices.includes(service.name)) assignedServices.push(service.name)
        }
      }
      if (active) setDoctors([...team.values()].sort((a, b) => a.name.localeCompare(b.name)))
    }).catch(() => {
      if (active) setError('Unable to load our team. Please try again later.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [getToken, isLoaded, isSignedIn])

  return (
    <div className="about-page">
      <section className="about-hero" aria-labelledby="about-hero-title">
        <div className="about-hero-copy"><Eyebrow>About our clinic</Eyebrow><h1 id="about-hero-title">{clinic.heroTitle}</h1><p>{clinic.intro}</p><div className="about-actions"><Link to="/reservation" className="about-primary-action">Book your appointment <ArrowRight size={17} /></Link><a href="#our-story" className="about-secondary-action"><CirclePlay size={18} /> Watch our story</a></div><div className="about-trust"><BadgeCheck size={20} /><span><strong>Care that starts with listening</strong><small>Demo clinic information for this preview</small></span></div></div>
        <div className="about-hero-image"><img src={clinicVisit} alt="A dentist providing gentle care to a smiling patient" /><div className="hero-note"><HeartHandshake size={20} /><strong>More comfort.<br />More confidence.</strong></div></div>
      </section>

      <section className="about-stats" aria-label="Demo clinic statistics">{clinic.stats.map((item) => <StatCard key={item.label} item={item} />)}</section>

      <section className="about-story-values" id="our-story">
        <article className="story-panel"><div><Eyebrow>Our story</Eyebrow><h2>A clinic built around the people who walk through our doors.</h2><p>What began as a small local practice is now a place for care that feels considered. We bring together a welcoming team, a modern space, and time to talk through what matters to you.</p><a href="#team" className="about-text-link">Our journey <ArrowRight size={15} /></a></div><figure><img src={clinicStillLife} alt="Dental instruments in a bright, calm clinic" /><figcaption>Care that feels clear, calm, and personal.</figcaption></figure></article>
        <article className="values-panel"><Eyebrow>Our mission & values</Eyebrow><h2>Guided by a higher standard of care.</h2><p>We aim to make exceptional dental care feel accessible, comfortable, and personal at every stage.</p><div className="value-grid">{values.map(({ title, copy, icon: Icon }) => <div className="value-card" key={title}><span><Icon size={19} /></span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div></article>
      </section>

      <section className="team-reasons" id="team">
        <article className="team-panel"><div className="team-intro"><Eyebrow>Meet our team</Eyebrow><h2>Expert care from people who care.</h2><p>Meet the dentists providing our services and find the care that fits your needs.</p><Link to="/services" className="about-text-link">Explore our services <ArrowRight size={15} /></Link></div><div className="doctor-grid">{!isLoaded ? <p role="status">Loading our team?</p> : !isSignedIn ? <p><Link to="/sign-in?redirect_url=%2Fabout">Sign in to meet our dentists</Link></p> : loading ? <p role="status">Loading our team?</p> : error ? <p role="alert">{error}</p> : doctors.length ? doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />) : <p>No dentists are available for booking right now.</p>}</div></article>
        <article className="reasons-panel"><Eyebrow>Why choose us</Eyebrow><h2>More than a clinic — a better experience.</h2><p>From the first booking to continued care, our focus stays on making oral health feel more manageable.</p><ul>{reasons.map((reason) => <li key={reason}><Check size={16} />{reason}</li>)}</ul><Link to="/reservation" className="about-text-link">Start with an appointment <ArrowRight size={15} /></Link></article>
      </section>

      <section className="testimonial-section" aria-labelledby="testimonial-title"><div className="testimonial-heading"><Eyebrow>What patients say</Eyebrow><h2 id="testimonial-title">Real stories. Brighter smiles.</h2><p>Demo feedback cards, ready to be replaced by approved reviews from your patient platform.</p></div><div className="testimonial-grid">{testimonials.map((testimonial) => <TestimonialCard key={testimonial.name} testimonial={testimonial} />)}</div></section>

      <section className="about-cta" aria-labelledby="about-cta-title"><img src={clinicStillLife} alt="" /><div><Eyebrow>Your healthier smile starts here</Eyebrow><h2 id="about-cta-title">Ready for a healthier smile?</h2><p>Choose a time that works for you. We’ll take care of the next steps with warmth and clarity.</p></div><Link to="/reservation">Book your appointment <ArrowRight size={18} /></Link></section>
    </div>
  )
}

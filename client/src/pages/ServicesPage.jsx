import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, ChevronRight, ClipboardCheck,
  HeartHandshake, LoaderCircle, ShieldCheck, SmilePlus, Sparkles, Stethoscope, Syringe, X,
} from 'lucide-react'
import ServiceCard from '../components/ServiceCard'
import serviceHero from '../assets/services/dental-services-hero.png'
import clinicVisit from '../assets/clinic-visit.png'
import { getServices } from '../lib/recordsApi'

const categoryIcons = {
  'Preventive Care': Sparkles, Restorative: ShieldCheck, Cosmetic: SmilePlus,
  Orthodontics: BadgeCheck, 'Oral Surgery': Syringe, 'General Dentistry': ClipboardCheck,
}

// The database catalog does not require an image. This local clinic image is deliberately
// used whenever an entry has no image (or its supplied image cannot be loaded).
const placeholderServiceImage = clinicVisit

function catalogueService(service) {
  const name = service.name || 'Dental service'
  return {
    ...service,
    title: name,
    details: service.description || 'Ask our team about this service and the care options available to you.',
    duration: `${service.duration} min`,
    price: Number(service.price) || 0,
    image: service.imageUrl || service.image || service.photoUrl || service.photo || placeholderServiceImage,
    imageAlt: service.imageAlt || `${name} dental service`,
    icon: categoryIcons[service.category] || Stethoscope,
  }
}

const highlights = [
  { title: 'Modern technology', copy: 'Precise care with a gentler touch.', icon: Sparkles },
  { title: 'Experienced team', copy: 'Knowledgeable people who listen.', icon: HeartHandshake },
  { title: 'Personalized plans', copy: 'Care shaped around your priorities.', icon: ClipboardCheck },
]

export default function ServicesPage() {
  const { getToken } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All Services')
  const [selectedService, setSelectedService] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const categories = ['All Services', ...new Set(services.map((service) => service.category).filter(Boolean))]
  const visibleServices = selectedCategory === 'All Services' ? services : services.filter((service) => service.category === selectedCategory)

  useEffect(() => {
    let active = true
    getServices(getToken)
      .then((items) => active && setServices(items.filter((service) => service.status === 'active').map(catalogueService)))
      .catch((loadError) => active && setError(loadError.message || 'Could not load services.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [getToken])

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && setSelectedService(null)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="services-page">
      <section className="services-hero" aria-labelledby="services-hero-title">
        <img className="services-hero-image" src={serviceHero} alt="Ceramic tooth model in a calm modern dental clinic" />
        <div className="services-hero-copy">
          <p className="services-kicker"><ShieldCheck size={15} /> Care made for you</p>
          <h1 id="services-hero-title">Complete care for <span>every smile.</span></h1>
          <p className="services-intro">From routine prevention to thoughtful restorative care, our team makes every visit feel clear, comfortable, and personal.</p>
          <div className="services-highlights">
            {highlights.map(({ title, copy, icon: Icon }) => <div className="services-highlight" key={title}><span><Icon size={19} /></span><p><strong>{title}</strong>{copy}</p></div>)}
          </div>
        </div>
        <aside className="service-contact-card">
          <span className="contact-orb"><HeartHandshake size={20} /></span>
          <h2>Not sure where to start?</h2>
          <p>Tell us what you need and we’ll help you choose the right kind of care.</p>
          <Link to="/reservation">Contact us <ArrowRight size={16} /></Link>
        </aside>
      </section>

      <section className="services-catalogue" aria-labelledby="catalogue-title">
        <div className="catalogue-heading"><div><p className="section-label">Explore your options</p><h2 id="catalogue-title">Dental care that meets you where you are.</h2></div><p>Simple, transparent service information to help you plan your visit with confidence.</p></div>
        <div className="service-filters" aria-label="Filter services by category">
          {categories.map((category) => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={selectedCategory === category ? 'is-active' : ''} aria-pressed={selectedCategory === category}>{category}</button>)}
        </div>
        {loading ? <div className="services-empty"><LoaderCircle className="mx-auto animate-spin" size={32} /><h3>Loading services</h3><p>Getting the clinic's current service catalogue.</p></div> : error ? <div className="services-empty"><SmilePlus size={32} /><h3>Services are unavailable</h3><p>{error}</p></div> : visibleServices.length ? <div className="service-card-grid">{visibleServices.map((service) => <ServiceCard key={service.id} service={service} onLearnMore={setSelectedService} placeholderImage={placeholderServiceImage} />)}</div> : <div className="services-empty"><SmilePlus size={32} /><h3>No services found</h3><p>Try another category to explore our complete range of care.</p></div>}
      </section>

      <section className="appointment-banner" aria-labelledby="appointment-title">
        <img src={serviceHero} alt="" />
        <div><p className="section-label">Your next visit</p><h2 id="appointment-title">A healthier smile starts with one easy appointment.</h2><p>Choose a time that works for you. We’ll take care of the rest.</p></div>
        <Link to="/reservation">Book appointment <CalendarDays size={17} /></Link>
      </section>

      <section className="care-promises" aria-label="Our care promises">
        <div><span><ShieldCheck size={22} /></span><p><strong>Safe & hygienic</strong>Your comfort and safety guide every visit.</p></div>
        <div><span><HeartHandshake size={22} /></span><p><strong>Warm professionals</strong>A friendly team that takes time to listen.</p></div>
        <div><span><Sparkles size={22} /></span><p><strong>Comfort-forward care</strong>Modern, welcoming spaces designed for ease.</p></div>
      </section>

      {selectedService && <div className="service-modal-backdrop" role="presentation" onMouseDown={() => setSelectedService(null)}><section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="service-modal-close" onClick={() => setSelectedService(null)} aria-label="Close service details"><X size={20} /></button>
        <img src={selectedService.image} alt={selectedService.imageAlt} />
        <div className="service-modal-copy"><p className="section-label">{selectedService.category}</p><h2 id="service-modal-title">{selectedService.title}</h2><p>{selectedService.details}</p><div><span><Check size={17} /> {selectedService.duration}</span><strong>Starting from ${selectedService.price}</strong></div><Link to="/reservation" onClick={() => setSelectedService(null)}>Book this service <ChevronRight size={17} /></Link></div>
      </section></div>}
    </div>
  )
}

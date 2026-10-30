import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Award, BadgeCheck, CalendarDays, Check, ChevronRight, ClipboardCheck,
  HeartHandshake, ShieldCheck, SmilePlus, Sparkles, Stethoscope, Syringe, X,
} from 'lucide-react'
import ServiceCard from '../components/ServiceCard'
import serviceHero from '../assets/services/dental-services-hero.png'
import clinicVisit from '../assets/clinic-visit.png'

const categories = ['All Services', 'Preventive Care', 'Restorative', 'Cosmetic', 'Orthodontics', 'Oral Surgery', 'General Dentistry']

// An image is intentionally required for every new entry in this catalogue.
const services = [
  { id: 'checkup', title: 'Dental Check-up', description: 'A thorough examination designed around your everyday oral health.', details: 'A relaxed, comprehensive visit with a full assessment and practical next steps for your smile.', duration: '30 min', price: 45, category: 'General Dentistry', image: clinicVisit, imageAlt: 'Dentist consulting with a patient during a check-up', icon: ClipboardCheck },
  { id: 'cleaning', title: 'Teeth Cleaning', description: 'Professional cleaning that leaves your smile feeling refreshed.', details: 'We gently remove plaque and surface buildup, then share simple habits to help maintain your result.', duration: '45 min', price: 65, category: 'Preventive Care', image: serviceHero, imageAlt: 'Dental tools beside a ceramic tooth model', icon: Sparkles },
  { id: 'whitening', title: 'Teeth Whitening', description: 'A confidence-boosting treatment for a more luminous smile.', details: 'A tailored whitening plan using safe, clinician-guided methods and aftercare recommendations.', duration: '60 min', price: 125, category: 'Cosmetic', image: clinicVisit, imageAlt: 'Smiling patient at a dental clinic', icon: SmilePlus },
  { id: 'filling', title: 'Tooth Filling', description: 'Restore comfort and function with durable, natural-looking care.', details: 'We carefully treat the affected area and use modern restorative materials matched to your tooth.', duration: '45 min', price: 95, category: 'Restorative', image: serviceHero, imageAlt: 'Ceramic tooth model and dental instruments', icon: ShieldCheck },
  { id: 'ortho', title: 'Orthodontic Consultation', description: 'Clear guidance for braces, aligners, and your next best step.', details: 'Meet with our team to discuss alignment goals, treatment options, timelines, and suitability.', duration: '40 min', price: 85, category: 'Orthodontics', image: clinicVisit, imageAlt: 'Friendly dental consultation in a clinic', icon: BadgeCheck },
  { id: 'extraction', title: 'Tooth Extraction', description: 'Considerate, expert removal with your comfort at the center.', details: 'When removal is the right option, we explain the process clearly and support a smooth recovery.', duration: '60 min', price: 155, category: 'Oral Surgery', image: serviceHero, imageAlt: 'Sterile dental treatment instruments', icon: Syringe },
  { id: 'root-canal', title: 'Root Canal Treatment', description: 'Relieve discomfort and protect your natural tooth where possible.', details: 'Focused restorative treatment to remove infection, protect the tooth structure, and restore function.', duration: '90 min', price: 210, category: 'Restorative', image: serviceHero, imageAlt: 'Dental care tools on a bright clinical surface', icon: Stethoscope },
  { id: 'veneers', title: 'Dental Veneers', description: 'Refine your smile with custom-crafted cosmetic veneers.', details: 'Explore a personalized veneer plan shaped around your smile, preferences, and long-term oral health.', duration: '60 min', price: 260, category: 'Cosmetic', image: clinicVisit, imageAlt: 'Patient smiling after a dental consultation', icon: Award },
]

const highlights = [
  { title: 'Modern technology', copy: 'Precise care with a gentler touch.', icon: Sparkles },
  { title: 'Experienced team', copy: 'Knowledgeable people who listen.', icon: HeartHandshake },
  { title: 'Personalized plans', copy: 'Care shaped around your priorities.', icon: ClipboardCheck },
]

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Services')
  const [selectedService, setSelectedService] = useState(null)
  const visibleServices = selectedCategory === 'All Services' ? services : services.filter((service) => service.category === selectedCategory)

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
        {visibleServices.length ? <div className="service-card-grid">{visibleServices.map((service) => <ServiceCard key={service.id} service={service} onLearnMore={setSelectedService} />)}</div> : <div className="services-empty"><SmilePlus size={32} /><h3>No services found</h3><p>Try another category to explore our complete range of care.</p></div>}
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

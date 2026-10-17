import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { ArrowRight, CalendarDays, CirclePlay, Cross, Heart, MessageCircle, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import heroTooth from '../assets/hero-tooth.png'
import heroToothDark from '../assets/hero-tooth-dark-v2.png'
import clinicVisit from '../assets/clinic-visit.png'

const stats = [
  { value: '98%', label: 'Patient satisfaction', icon: UsersRound },
  { value: '1:1', label: 'Personalized care plans', icon: Heart },
  { value: '24h', label: 'Easy booking access', icon: CalendarDays },
  { value: '4+', label: 'Core dental services', icon: Cross },
]
const features = [
  { title: 'Clear communication', copy: 'We explain every step, so you always feel informed and in control.', icon: MessageCircle },
  { title: 'Gentle treatment', copy: 'Modern, minimally invasive techniques for a more comfortable experience.', icon: Heart },
  { title: 'Easy online booking', copy: 'Schedule your visit in seconds, whenever it works for you.', icon: CalendarDays },
]
const services = [
  { title: 'General Dentistry', copy: 'Preventive care & cleanings', icon: Cross },
  { title: 'Cosmetic Dentistry', copy: 'A brighter, more confident you', icon: Sparkles },
  { title: 'Restorative Dentistry', copy: 'Repair, restore, renew', icon: ShieldCheck },
  { title: 'Family Dentistry', copy: 'Quality care for all ages', icon: UsersRound },
]

function Button({ children, secondary = false, className = '', ...props }) {
  return <a className={`home-button ${secondary ? 'home-button-secondary' : ''} ${className}`} {...props}>{children}</a>
}
function SectionEyebrow({ children }) { return <p className="home-eyebrow">{children}</p> }

Button.propTypes = { children: PropTypes.node.isRequired, secondary: PropTypes.bool, className: PropTypes.string }
SectionEyebrow.propTypes = { children: PropTypes.node.isRequired }

export default function HomePage() {
  const [isDarkTheme, setIsDarkTheme] = useState(() => document.documentElement.dataset.theme === 'dark')
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDarkTheme(document.documentElement.dataset.theme === 'dark'))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return (
    <div className="home-page"><div className="home-wrap">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-copy"><div className="trust-chip"><ShieldCheck size={15} /> Trusted care for your smile</div><h1 id="hero-title">Every smile<br />deserves <span>expert care</span></h1><p>Gentle dental visits, clear treatment plans, and a calmer way to care for your oral health. Modern techniques. A warmer experience.</p><div className="hero-actions"><Button href="/reservation">Book now <ArrowRight size={17} /></Button><Button href="#about-clinic" secondary><CirclePlay size={18} /> Watch our video</Button></div></div>
        <div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><i className="bubble bubble-one" /><i className="bubble bubble-two" /><i className="leaf leaf-one" /><i className="leaf leaf-two" /><img src={isDarkTheme ? heroToothDark : heroTooth} alt="" /></div>
        <aside className="appointment-card"><span className="appointment-icon"><CalendarDays size={19} /></span><h2>Book your<br />appointment today</h2><p>A healthier, brighter smile is just a click away.</p><Button href="/reservation">Book now <ArrowRight size={16} /></Button></aside>
      </section>
      <section className="stats-panel" aria-label="Clinic statistics">{stats.map(({ value, label, icon: Icon }) => <div className="stat-card" key={label}><span className="stat-icon"><Icon size={25} /></span><div><strong>{value}</strong><p>{label}</p></div></div>)}</section>
      <div className="home-middle-grid"><section className="about-card" id="about-clinic" aria-labelledby="about-title"><div className="about-copy"><SectionEyebrow>About our clinic</SectionEyebrow><h2 id="about-title">Thoughtful dentistry<br />with a human touch.</h2><p>We combine modern techniques with genuinely compassionate care. Our experienced team takes time to listen, explain, and create a treatment plan that fits your needs — because great dental care is about people, not just procedures.</p><Button href="/reservation">Learn more <ArrowRight size={16} /></Button></div><div className="clinic-photo"><img src={clinicVisit} alt="Dentist providing a gentle examination to a smiling patient" /><span>“A more comfortable dental experience”</span></div></section><section className="why-card" aria-labelledby="why-title"><SectionEyebrow>Why patients choose us</SectionEyebrow><h2 id="why-title">More than a clinic — a better dental experience.</h2><div className="features">{features.map(({ title, copy, icon: Icon }) => <div className="feature" key={title}><span><Icon size={22} /></span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div></section></div>
      <section className="services-section" aria-labelledby="services-title"><div className="services-heading"><SectionEyebrow>Our services</SectionEyebrow><h2 id="services-title">Complete care for<br />a healthier, brighter smile.</h2></div><div className="services-list">{services.map(({ title, copy, icon: Icon }) => <article className="service-card" key={title}><span><Icon size={24} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div><a className="view-services" href="#services-title">View all services <ArrowRight size={15} /></a></section>
    </div></div>
  )
}

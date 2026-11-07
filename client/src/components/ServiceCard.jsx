import PropTypes from 'prop-types'
import { ArrowUpRight, Clock3 } from 'lucide-react'

export default function ServiceCard({ service, onLearnMore, placeholderImage }) {
  const Icon = service.icon

  return (
    <article className="service-page-card">
      <div className="service-card-image">
        <img src={service.image || placeholderImage} alt={service.imageAlt} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = placeholderImage }} />
        <span className="service-card-icon" aria-hidden="true"><Icon size={20} /></span>
      </div>
      <div className="service-card-content">
        <h3>{service.title}</h3>
        <p>{service.description}</p>
        <div className="service-card-meta">
          <span><Clock3 size={16} aria-hidden="true" /> {service.duration}</span>
          <strong>{service.price === 0 ? 'Free' : `From $${service.price}`}</strong>
        </div>
        <button type="button" className="service-learn-button" onClick={() => onLearnMore(service)} aria-label={`Learn more about ${service.title}`}>
          Learn more <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

ServiceCard.propTypes = {
  service: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    duration: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    image: PropTypes.string,
    imageAlt: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
  }).isRequired,
  onLearnMore: PropTypes.func.isRequired,
  placeholderImage: PropTypes.string.isRequired,
}

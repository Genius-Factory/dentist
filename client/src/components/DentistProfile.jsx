import PropTypes from 'prop-types'

export default function DentistProfile({ doctor }) {
  return <section aria-label={`${doctor.name} profile`} className="my-3 space-y-2 text-sm">
    {doctor.profileImageUrl && <img src={doctor.profileImageUrl} alt={doctor.name} className="h-20 w-20 rounded-full object-cover" />}
    <p>{doctor.specialty || 'Dentist'}</p>
    {doctor.yearsOfExperience > 0 && <p>{doctor.yearsOfExperience} years of experience</p>}
    {doctor.bio && <details><summary className="cursor-pointer font-semibold">Read biography</summary><p className="mt-2 whitespace-pre-wrap">{doctor.bio}</p></details>}
  </section>
}

DentistProfile.propTypes = {
  doctor: PropTypes.shape({
    name: PropTypes.string.isRequired,
    specialty: PropTypes.string,
    bio: PropTypes.string,
    yearsOfExperience: PropTypes.number,
    profileImageUrl: PropTypes.string,
  }).isRequired,
}

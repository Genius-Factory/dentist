import { CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react'
import heroTooth from '../assets/hero-tooth.png'

const stats = [
  { value: '98%', label: 'Patient satisfaction' },
  { value: '1:1', label: 'Personalized care plans' },
  { value: '24h', label: 'Easy booking access' },
  { value: '4+', label: 'Core dental services' },
]

export default function HomePage() {
  return (
    <div className="min-h-full" style={{
      background: `radial-gradient(circle at 8% 18%, rgba(125,211,252,0.18), transparent 22%), radial-gradient(circle at 92% 50%, rgba(59,130,246,0.10), transparent 28%), linear-gradient(180deg, #fbfdff 0%, #f7fbff 46%, #ffffff 100%)`
    }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section
          className="relative overflow-hidden bg-white"
          style={{ height: 680, borderRadius: '48px', boxShadow: '0 40px 120px -60px rgba(14,165,233,0.12)' }}
        >
          <div
            className="absolute z-0 overflow-hidden"
            style={{
              left: 40,
              right: 40,
              top: 40,
              bottom: 40,
              borderRadius: '40px',
              backgroundImage: `url(${heroTooth})`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
            }}
            role="img"
            aria-label="Glossy dental tooth illustration"
          />
          {/* soft glow behind the tooth for a gentle blue highlight */}
          <div
            className="absolute z-0 pointer-events-none"
            style={{
              right: 60,
              top: 80,
              width: '44%',
              height: '80%',
              borderRadius: '40%',
              background: 'radial-gradient(60% 60% at 65% 40%, rgba(125,211,252,0.38), rgba(59,130,246,0.12) 40%, transparent 70%)',
              filter: 'blur(32px)',
            }}
          />
          <div
            className="absolute z-10"
            style={{
              left: 40,
              right: 40,
              top: 40,
              bottom: 40,
              borderRadius: '40px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.62) 24%, rgba(255,255,255,0.0) 52%, rgba(255,255,255,0.6) 78%, rgba(255,255,255,0.88) 100%)'
            }}
          />
          <div className="absolute z-10 h-24 bg-gradient-to-t from-white/45 to-transparent" style={{ left: 40, right: 40, bottom: 40, borderBottomLeftRadius: '40px', borderBottomRightRadius: '40px' }} />

          <div className="relative z-20 h-full">
            <div
              className="absolute max-w-[340px]"
              style={{ left: 150, top: 120 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <ShieldCheck size={16} />
                Trusted care for your smile
              </div>

              <h1 className="mt-7 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
                Every smile deserves care,
              </h1>

              <p className="mt-4 max-w-[320px] text-base leading-8 text-slate-600 sm:text-lg">
                Gentle dental visits, clear<br />
                treatment plans, and a calmer way to<br />
                care for your oral health.
              </p>
            </div>

            <div
              className="absolute max-w-[300px] text-left"
              style={{ right: 140, top: 360 }}
            >
              <p className="text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
                Yours does too! <br />
                Book an appointment now<br />
                at Dentist Clinic!
              </p>

              <div className="mt-8">
                <a
                  href="/reservation"
                  className="inline-flex justify-center rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-[0_18px_35px_-20px_rgba(37,99,235,0.9)] transition hover:bg-blue-700"
                >
                  Book now
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="clinic-stats" className="rounded-[2rem] p-6 sm:p-8 lg:p-10" style={{ marginTop: '32px', boxShadow: '0 30px 90px -55px rgba(59, 130, 246, 0.25)' }}>
          {/* 2x2 Grid for main stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats.slice(0, 4).map((stat, index) => (
              <div
                key={stat.label}
                className="rounded-[2rem] p-8 text-center transition-transform hover:shadow-lg"
                style={{
                  backgroundColor: index === 0 ? '#FFFFFF' : index === 1 ? '#F0F9FF' : '#F8FAFC',
                  boxShadow: '0 20px 50px -35px rgba(59, 130, 246, 0.4)',
                }}
              >
                <p className="text-4xl sm:text-5xl font-bold text-blue-600">{stat.value}</p>
                <p className="mt-4 text-sm sm:text-base font-medium text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="about-clinic"
          style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '24px' }}
        >
          <div
            className="rounded-[2rem] p-8 flex flex-col justify-center"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 50px -35px rgba(59, 130, 246, 0.4)',
              minHeight: '360px',
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              About our clinic
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-black">
              Thoughtful dentistry with a refined, human touch.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-700">
              We combine modern techniques with a warm atmosphere so patients
              feel informed, comfortable, and cared for at every step.
            </p>
          </div>

          <div
            className="rounded-[2rem] p-8 flex flex-col justify-center"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 50px -35px rgba(59, 130, 246, 0.4)',
              minHeight: '360px',
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Why patients choose us
            </p>
            <h3 className="mt-4 text-xl font-semibold text-black">
              Clear communication, careful treatment, and elegant simplicity.
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              From preventive care to restorative solutions, we focus on making
              every visit feel calm and organized.
            </p>
          </div>
        </section>

        
      </div>
    </div>
  )
}

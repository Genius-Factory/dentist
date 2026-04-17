import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'

export default function HomePage() {
  const { user } = useUser()

  return (
    <div className="bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_35%),linear-gradient(180deg,_#f8fcff_0%,_#eef6f7_48%,_#ffffff_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white/90 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="grid gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Gentle care for every smile
              </div>

              <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Modern dental care in a calm, welcoming space.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Personalized treatments, attentive doctors, and a smoother
                experience from your first visit to your healthiest smile.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#about-clinic"
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Learn more
                </a>
                <a
                  href="#book-appointment"
                  className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                >
                  Explore services
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Preventive and cosmetic dentistry
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Comfortable treatment environment
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Flexible appointment scheduling
                </div>
              </div>

              <div className="mt-8">
                <SignedIn>
                  <p className="text-sm text-emerald-700">
                    Welcome back,{' '}
                    <span className="font-semibold">
                      {user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress}
                    </span>
                    .
                  </p>
                </SignedIn>
                <SignedOut>
                  <p className="text-sm text-slate-500">
                    Sign in to book faster and manage your upcoming visits.
                  </p>
                </SignedOut>
              </div>
            </div>

            <div className="relative min-h-[320px]">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-sky-100 via-cyan-50 to-white" />
              <div className="absolute -right-10 top-10 h-32 w-32 rounded-full bg-sky-200/70 blur-2xl" />
              <div className="absolute -left-6 bottom-8 h-28 w-28 rounded-full bg-emerald-100 blur-2xl" />

              <div className="relative flex h-full flex-col justify-between rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-[0_24px_60px_-35px_rgba(14,165,233,0.55)] backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
                      Premium care
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      Bright smiles start here
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    Since years of operation
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-900 p-5 text-white">
                    <p className="text-sm text-slate-300">Patient satisfaction</p>
                    <p className="mt-3 text-3xl font-semibold">98%</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Trusted by families for thoughtful and reliable care.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-sky-100 bg-white p-5">
                    <p className="text-sm text-slate-500">Available services</p>
                    <ul className="mt-3 space-y-3 text-sm font-medium text-slate-700">
                      <li>Routine checkups</li>
                      <li>Whitening and aesthetics</li>
                      <li>Emergency dental visits</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/80 bg-gradient-to-r from-sky-500 to-cyan-500 p-5 text-white">
                  <p className="text-sm uppercase tracking-[0.18em] text-sky-100">
                    Comfortable experience
                  </p>
                  <p className="mt-2 max-w-md text-lg font-medium leading-7">
                    Designed to feel less clinical, more caring, and easy to
                    trust from the moment you arrive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="about-clinic"
          className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-8 text-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.6)]">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm uppercase tracking-[0.2em] text-sky-200">
                About our clinic
              </p>
              <h2 className="mt-4 text-3xl font-semibold">
                Thoughtful dentistry with a refined, human touch.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-200">
                We combine modern techniques with a warm atmosphere so patients
                feel informed, comfortable, and cared for at every step.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Why patients choose us
            </p>
            <h3 className="mt-4 text-3xl font-semibold text-slate-900">
              Clear communication, careful treatment, and elegant simplicity.
            </h3>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              From preventive care to restorative solutions, we focus on making
              every visit feel calm and organized. The goal is simple: excellent
              dental care delivered in a space that feels reassuring and modern.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-2xl font-semibold text-slate-900">years of clinic opening</p>
                <p className="mt-2 text-sm text-slate-600">Years of trusted clinical experience</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-2xl font-semibold text-slate-900">1:1</p>
                <p className="mt-2 text-sm text-slate-600">Personalized attention for every patient</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-2xl font-semibold text-slate-900">Easy</p>
                <p className="mt-2 text-sm text-slate-600">Simple booking and smoother follow-up care</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-r from-slate-900 via-sky-900 to-cyan-700 px-6 py-8 text-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100">
                Ready to visit?
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Book your appointment
              </h2>
              <p className="mt-4 text-base leading-7 text-sky-50/90">
                Schedule your consultation or routine checkup with a booking flow
                designed to feel simple, calm, and convenient.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="#book-appointment"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Book your appointment
              </a>
            </div>
          </div>
        </section>

        <div id="book-appointment" className="h-px" />
      </div>
    </div>
  )
}

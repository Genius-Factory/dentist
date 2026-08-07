import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { UserButton, useUser, SignedIn, SignedOut } from '@clerk/clerk-react'
import { CalendarCheck, ClipboardCheck, Database, Home, LogIn, Menu, Users, X } from 'lucide-react'
import { isSecretaryRole, normalizeRole } from '../lib/bookings'
// import { useCart } from '../contexts/CartContext'

export default function Navbar() {
  const { user } = useUser()
  const role = normalizeRole(user?.publicMetadata?.role)
  const isAdmin = ['admin', 'superadmin'].includes(role)
  const isSecretary = isSecretaryRole(role)
  const loc = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const active = (path) =>
    loc.pathname === path
      ? 'bg-blue-50 text-blue-700 font-semibold'
      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'

  const labelClass = 'whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover/sidebar:max-w-40 md:group-hover/sidebar:opacity-100'

  const navLinks = (
    <div className="flex flex-col gap-1">
      <Link
        to="/"
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active('/')}`}
      >
        <Home size={18} className="shrink-0" />
        <span className={labelClass}>Home</span>
      </Link>
      <SignedIn>
        <Link
          to="/booked"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active('/booked')}`}
        >
          <CalendarCheck size={18} className="shrink-0" />
          <span className={labelClass}>Booked</span>
        </Link>
        <Link
          to={isAdmin || isSecretary ? '/patients' : '/my-profile'}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active(isAdmin || isSecretary ? '/patients' : '/my-profile')}`}
        >
          <Users size={18} className="shrink-0" />
          <span className={labelClass}>{isAdmin || isSecretary ? 'Patients' : 'My Profile'}</span>
        </Link>
        {isAdmin && <Link
          to="/users"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active('/users')}`}
        >
          <Database size={18} className="shrink-0" />
          <span className={labelClass}>User Records</span>
        </Link>}
        {isAdmin && <Link
          to="/db"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active('/db')}`}
        >
          <Database size={18} className="shrink-0" />
          <span className={labelClass}>DB</span>
        </Link>}
        {isSecretary && (
          <Link
            to="/secretary/appointments"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active('/secretary/appointments')}`}
          >
            <ClipboardCheck size={18} className="shrink-0" />
            <span className={labelClass}>Approvals</span>
          </Link>
        )}
      </SignedIn>
    </div>
  )

  const accountControls = (
    <div className="border-t pt-4">
      <SignedIn>
        <div className="flex items-center justify-between gap-3 md:justify-center md:group-hover/sidebar:justify-between">
          <span className="hidden text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize md:group-hover/sidebar:inline-block">{role}</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
      <SignedOut>
        <button
          onClick={() => {
            setMobileOpen(false)
            navigate('/sign-in')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <LogIn size={16} className="shrink-0" />
          <span className={labelClass}>Sign In</span>
        </button>
      </SignedOut>
    </div>
  )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm md:hidden">
        <Link to="/" className="text-lg font-bold text-blue-700">
          Dentist
        </Link>
        <div className="flex items-center gap-2">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <aside className="group/sidebar fixed inset-y-0 left-0 z-40 hidden w-20 flex-col overflow-hidden border-r bg-white px-4 py-5 shadow-sm transition-[width] duration-200 hover:w-64 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-3 px-2 text-xl font-bold text-blue-700">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-base text-white">D</span>
          <span className={labelClass}>Dentist</span>
        </Link>
        <nav className="flex flex-1 flex-col justify-between">
          {navLinks}
          {accountControls}
        </nav>
      </aside>

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="fixed inset-x-0 top-16 z-30 border-b border-gray-200 bg-white px-4 py-4 shadow-lg md:hidden"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-4">
            {navLinks}
            {accountControls}
          </nav>
        </div>
      )}
    </>
  )
}


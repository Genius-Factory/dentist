import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { UserButton, useUser, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Menu, X, LogIn } from 'lucide-react'
import { isSecretaryRole } from '../lib/bookings'
// import { useCart } from '../contexts/CartContext'

export default function Navbar() {
  const { user } = useUser()
  const role = user?.publicMetadata?.role || 'member'
  const isSecretary = isSecretaryRole(role)
  const loc = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const active = (path) =>
    loc.pathname === path
      ? 'text-blue-600 font-semibold'
      : 'text-gray-600 hover:text-blue-600'

  const navLinks = (
    <>
      <Link to="/" onClick={() => setMobileOpen(false)}
       className={`flex items-center gap-2 text-sm py-1 ${active('/')}`}>
         Home
      </Link>
      <SignedIn>
        <Link to="/booked" onClick={() => setMobileOpen(false)}
         className={`flex items-center gap-2 text-sm py-1 ${active('/booked')}`}>
           Booked
        </Link>
        {isSecretary && (
          <Link to="/secretary/appointments" onClick={() => setMobileOpen(false)}
           className={`flex items-center gap-2 text-sm py-1 ${active('/secretary/appointments')}`}>
             Approvals
          </Link>
        )}
      </SignedIn>
    </>
  )

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-blue-700 shrink-0">
          Dentist
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          <SignedIn>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">{role}</span>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <button
              onClick={() => navigate('/sign-in')}
              className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <LogIn size={15} /> Sign In
            </button>
          </SignedOut>
        </div>

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-2">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <button
              onClick={() => navigate('/sign-in')}
              className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <LogIn size={14} /> Sign In
            </button>
          </SignedOut>
          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t px-4 py-3 flex flex-col gap-3">
          {navLinks}
          <SignedIn>
            <div className="pt-2 border-t flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">{role}</span>
            </div>
          </SignedIn>
        </div>
      )}
    </nav>
  )
}


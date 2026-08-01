import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import ReservationPage from './pages/ReservationPage'
import BookedPage from './pages/BookedPage'
import SecretaryAppointmentsPage from './pages/SecretaryAppointmentsPage'
import PatientDetailsPage from './pages/PatientDetailsPage'
import PatientsPage from './pages/PatientsPage'
import DatabasePage from './pages/DatabasePage'
import DentalPageDecor from './components/DentalPageDecor'

function Footer() {
  return (
    <footer className="mt-auto py-5 text-center text-sm text-gray-400">
      Made with{' '}
      <span className="inline-block text-red-500 animate-pulse">heart</span>
      {' '}by{' '}
      <span className="font-semibold text-gray-500">Genius Factory</span>
      {' '}(c) 2026
    </footer>
  )
}

export default function App() {
  return (
    <div
      className="min-h-screen flex flex-col pt-16 md:pl-20 md:pt-0"
      style={{
        background:
          'radial-gradient(circle at 8% 18%, rgba(125,211,252,0.18), transparent 22%), radial-gradient(circle at 92% 50%, rgba(59,130,246,0.10), transparent 28%), linear-gradient(180deg, #fbfdff 0%, #f7fbff 46%, #ffffff 100%)',
      }}
    >
      <Toaster position="top-right" />
      <Navbar />
      <main className="relative mx-auto w-full max-w-7xl flex-1 px-[2px] py-1 sm:px-4 sm:py-6">
        <DentalPageDecor />
        <div className="relative z-10">
          <Routes>
            {/* Public - visible to everyone */}
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/reservation" element={<ReservationPage />} />
            <Route path="/booked" element={<BookedPage />} />
            <Route path="/my-profile" element={<PatientDetailsPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/create" element={<PatientDetailsPage forceCreate />} />
            <Route path="/patients/:profileId" element={<PatientDetailsPage />} />
            <Route path="/secretary/appointments" element={<SecretaryAppointmentsPage />} />
            <Route path="/users" element={<Navigate to="/db" replace />} />
            <Route path="/db" element={<DatabasePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  )
}

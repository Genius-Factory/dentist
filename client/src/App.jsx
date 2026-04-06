import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'

function Footer() {
  return (
    <footer className="mt-auto py-5 text-center text-sm text-gray-400">
      Made with{' '}
      <span className="inline-block text-red-500 animate-pulse">♥</span>
      {' '}by{' '}
      <span className="font-semibold text-gray-500">Genius Factory</span>
      {' '}© 2026
    </footer>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Routes>
          {/* Public — visible to everyone */}
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

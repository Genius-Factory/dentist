import { useState } from 'react'
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function HomePage() {
  const { user } = useUser()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function checkDb() {
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${API_URL}/healthz`, { credentials: 'include' })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow-sm rounded-xl p-6 border">
        <h1 className="text-2xl font-bold text-gray-800">Hello Home</h1>
        <p className="text-gray-600 mt-1">This is a minimal starter page.</p>

        <div className="mt-6 space-y-2">
          <SignedIn>
            <p className="text-green-700">Signed in as <span className="font-medium">{user?.primaryEmailAddress?.emailAddress || user?.fullName}</span></p>
          </SignedIn>
          <SignedOut>
            <p className="text-amber-700">You are signed out. Use the Sign In button in the navbar.</p>
          </SignedOut>
        </div>

        <div className="mt-8">
          <button
            onClick={checkDb}
            disabled={checking}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {checking ? 'Checking DB…' : 'Check DB connection'}
          </button>

          {result && (
            <pre className="mt-4 bg-gray-50 border rounded p-3 text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          )}
          {error && (
            <div className="mt-4 text-red-600 text-sm">{error}</div>
          )}
        </div>
      </div>
    </div>
  )
}

import { SignIn } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url') || '/'

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center w-full max-w-md px-4">
        <h1 className="text-3xl font-bold text-blue-700 mb-2"> Dentist </h1>
        <p className="text-gray-500 mb-8">Sign in to access the Dentist Application </p>
        <SignIn afterSignInUrl={redirectUrl} />
      </div>
    </div>
  )
}

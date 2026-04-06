import { SignIn } from '@clerk/clerk-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-700 mb-2"> Dentist </h1>
        <p className="text-gray-500 mb-8">Sign in to access the Dentist Application </p>
        <SignIn afterSignInUrl="/" />
      </div>
    </div>
  )
}

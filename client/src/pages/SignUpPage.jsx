import { SignUp } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url') || '/'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-700 mb-2"> Dentist</h1>
        <p className="text-gray-500 mb-8">Create your account</p>
        <SignUp afterSignUpUrl={redirectUrl} />
      </div>
    </div>
  )
}

import { SignUp } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url') || '/'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: `radial-gradient(circle at 8% 18%, rgba(125,211,252,0.18), transparent 22%), radial-gradient(circle at 92% 50%, rgba(59,130,246,0.10), transparent 28%), linear-gradient(180deg, #fbfdff 0%, #f7fbff 46%, #ffffff 100%)`
    }}>
      <div className="text-center w-full max-w-md px-4">
        <h1 className="text-3xl font-bold text-blue-700 mb-2"> Dentist</h1>
        <p className="text-gray-500 mb-8">Create your account</p>
        <SignUp afterSignUpUrl={redirectUrl} />
      </div>
    </div>
  )
}

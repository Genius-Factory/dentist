import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const root = ReactDOM.createRoot(document.getElementById('root'))
if (!PUBLISHABLE_KEY) {
  root.render(
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Missing Clerk publishable key</h1>
      <p>Create <code>client/.env.local</code> with:</p>
      <pre>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...\nVITE_API_URL=http://localhost:4000</pre>
    </div>
  )
} else {
  root.render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  )
}

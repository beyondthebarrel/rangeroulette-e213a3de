import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { OAuthConsent } from './pages/OAuthConsent.tsx'

const isConsentRoute = window.location.pathname === '/.lovable/oauth/consent'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {isConsentRoute ? <OAuthConsent /> : <App />}
    </AuthProvider>
  </StrictMode>,
)

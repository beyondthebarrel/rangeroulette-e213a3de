import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { OAuthConsent } from './pages/OAuthConsent.tsx'

registerSW({ immediate: true })

const isConsentRoute = window.location.pathname === '/.lovable/oauth/consent'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {isConsentRoute ? <OAuthConsent /> : <App />}
    </AuthProvider>
  </StrictMode>,
)

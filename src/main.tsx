import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { AppProvider } from './app/AppContext'
import './styles/global.css'

if (import.meta.env.VITE_ACCEPTANCE_MODE === 'true') {
  void import('./testing/acceptanceBridge').then(({ installAcceptanceBridge }) => {
    installAcceptanceBridge()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)

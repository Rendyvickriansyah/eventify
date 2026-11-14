import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './styles/index.css'
import App from './App.jsx'

// Agentation feedback toolbar (https://www.agentation.com) — dev only. Lazy-loaded inside
// the DEV branch so Vite drops it from production builds entirely.
const Agentation = import.meta.env.DEV
  ? lazy(() => import('agentation').then((m) => ({ default: m.Agentation })))
  : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {Agentation && (
      <Suspense fallback={null}>
        <Agentation />
      </Suspense>
    )}
  </StrictMode>,
)

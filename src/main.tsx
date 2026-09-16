import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
    <Analytics />
    <SpeedInsights />
  </ErrorBoundary>
);

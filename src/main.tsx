import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  addEventListener('load', () => { navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((e) => console.warn('SW failed', e)) })
}

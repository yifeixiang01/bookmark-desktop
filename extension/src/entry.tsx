import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './main'
document.documentElement.dataset.popup = new URLSearchParams(location.search).has('capture') ? 'capture' : 'account'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

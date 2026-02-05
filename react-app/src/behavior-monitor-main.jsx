import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BehaviorMonitorApp from './components/BehaviorMonitorApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BehaviorMonitorApp />
  </StrictMode>,
)

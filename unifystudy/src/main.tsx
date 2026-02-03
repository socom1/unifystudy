import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/design-system.css'; 
import './styles/themes.css';
import './index.css'
import './styles/_shared.scss'; // Global styles (Modals, etc.)
import './sentry'; // Initialize Sentry
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

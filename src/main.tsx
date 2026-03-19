import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/hooks/useTheme'
import { App } from '@/app/App'
import '@/styles/variables.css'
import '@/styles/reset.css'
import '@/styles/global.css'
import '@/features/crm/CrmPage.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

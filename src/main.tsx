import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/hooks/useTheme'
import { DataProvider } from '@/context/DataContext'
import { AlertProvider } from '@/components/ui/AlertDialog'
import { App } from '@/app/App'
import '@/styles/variables.css'
import '@/styles/reset.css'
import '@/styles/global.css'
import '@/styles/shared.css'
import '@/features/crm/CrmPage.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <DataProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </DataProvider>
    </ThemeProvider>
  </StrictMode>,
)


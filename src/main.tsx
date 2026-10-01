import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBackend } from './lib/backend'
import { StoreProvider } from './lib/store'
import { App } from './App'

const root = createRoot(document.getElementById('root')!)

createBackend()
  .then((be) =>
    root.render(
      <StrictMode>
        <StoreProvider be={be}>
          <App />
        </StoreProvider>
      </StrictMode>,
    ),
  )
  .catch((e) => {
    root.render(
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h2>Não foi possível iniciar o sistema</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(e?.message || e)}</pre>
      </div>,
    )
  })

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

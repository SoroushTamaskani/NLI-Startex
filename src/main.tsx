import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={() => (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: 'system-ui, sans-serif', color: '#2b2766', background: '#fffaf0', minHeight: '100%' }}>
          <p style={{ fontSize: 48, margin: 0 }}>🛠️</p>
          <h1 style={{ fontSize: 24 }}>Oops! NLI hit a bump.</h1>
          <p>Reloading the page usually fixes it.</p>
          <button type="button" onClick={() => location.reload()} style={{ padding: '10px 20px', borderRadius: 16, border: 0, background: '#f97316', color: 'white', fontWeight: 700, fontSize: 16 }}>
            Reload
          </button>
        </div>
      )}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

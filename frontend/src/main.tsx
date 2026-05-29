import './polyfills'; // Buffer shim — must run before any core parser call (ADR-0009)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DEBUG_LOGS_ENABLED } from './config/debug';

// Hide all console logs if debug is disabled
if (!DEBUG_LOGS_ENABLED) {
  const noop = () => {};
  // Overriding all major console methods
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker registration is now handled by UpdateManager in App.js

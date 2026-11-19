import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/funnel-display/600.css';
import '@fontsource/funnel-display/700.css';
import '@fontsource/funnel-display/800.css';
import '@fontsource/funnel-sans/400.css';
import '@fontsource/funnel-sans/500.css';
import '@fontsource/funnel-sans/600.css';
import '@fontsource/funnel-sans/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

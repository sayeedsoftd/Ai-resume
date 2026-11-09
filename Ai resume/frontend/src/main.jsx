import React from 'react';
import ReactDOMClient from 'react-dom/client';
import './i18n';
import App from './App.jsx';
import './styles/index.css';

ReactDOMClient.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

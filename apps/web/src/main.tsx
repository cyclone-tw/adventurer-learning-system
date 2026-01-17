import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AchievementPopup, TaskPopup, ToastContainer } from './components/notifications';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <AchievementPopup />
      <TaskPopup />
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>
);

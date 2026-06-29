import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import './index.css';

const Root = () => {
  const pathname = window.location.pathname;
  const isAdmin = pathname === '/admin' || pathname.endsWith('/admin') || pathname.includes('/admin/');
  return isAdmin ? <AdminDashboard /> : <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

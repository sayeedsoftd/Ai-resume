import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';

const AppLayout = ({ children, requireSidebar = false }) => {
  const { isAuthenticated } = useAuth();
  const showSidebar = requireSidebar && isAuthenticated;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {showSidebar && <Sidebar />}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${showSidebar ? 'overflow-x-hidden' : ''}`}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default AppLayout;

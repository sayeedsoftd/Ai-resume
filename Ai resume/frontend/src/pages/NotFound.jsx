import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFound = () => {
  return (
    <div className="text-center py-20 space-y-4">
      <h1 className="text-6xl font-black text-indigo-600 dark:text-indigo-400">404</h1>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Page Not Found</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        The page you are looking for doesn't exist or has been relocated.
      </p>
      <Link to="/" className="inline-block pt-2">
        <Button variant="primary">Return Home</Button>
      </Link>
    </div>
  );
};

export default NotFound;

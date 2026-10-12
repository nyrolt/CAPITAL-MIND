import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface AdminRouteProps {
  children: React.ReactElement;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-silver-light">
        <div className="w-8 h-8 border-2 border-graphite border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Must be authenticated and have the Admin role
  if (!isAuthenticated || user?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

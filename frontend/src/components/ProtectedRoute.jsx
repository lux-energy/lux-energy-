import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], loginPath = '/admin/login' }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-energy-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    const destination = ['admin', 'super_admin'].includes(user?.role)
      ? '/admin'
      : user?.role === 'agent' ? '/agent' : '/portal';
    return <Navigate to={destination} replace />;
  }

  return children;
};

export default ProtectedRoute;
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import LoadingScreen from './LoadingScreen';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivateRoute;
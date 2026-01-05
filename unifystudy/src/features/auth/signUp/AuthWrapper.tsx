import React from 'react';
import { Navigate } from 'react-router-dom';

const AuthWrapper: React.FC<{ onSuccess?: (user?: any) => void }> = ({ onSuccess }) => {
  // Redirect unauthenticated users directly to Sign Up instead of Landing Page
  return <Navigate to="/signup" replace />;
};

export default AuthWrapper;

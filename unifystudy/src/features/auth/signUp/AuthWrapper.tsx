import React from 'react';
import { Navigate } from 'react-router-dom';

const AuthWrapper = ({ onSuccess }) => {
  // Redirect unauthenticated users directly to Sign Up instead of Landing Page
  return <Navigate to="/signup" replace />;
};

export default AuthWrapper;

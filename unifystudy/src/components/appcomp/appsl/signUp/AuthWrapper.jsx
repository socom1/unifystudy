import React from 'react';
import LandingPage from '../index/LandingPage';

const AuthWrapper = ({ onSuccess }) => {
  // AuthWrapper currently acts as the default unauthenticated view (Landing Page).
  // The 'onSuccess' prop is available if we want to add an inline login modal later.
  return <LandingPage />;
};

export default AuthWrapper;

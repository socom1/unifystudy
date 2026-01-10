import { useEffect, useState } from 'react';
import { auth, googleProvider } from '@/services/firebaseConfig';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function DesktopAuth() {
  const [status, setStatus] = useState("Initializing secure authentication...");

  useEffect(() => {
    const performAuth = async () => {
      try {
        setStatus("Waiting for Google Sign-In...");
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.idToken;
        
        if (token) {
            setStatus("Redirecting to UnifyStudy app...");
            // Redirect to deep link
            window.location.href = `unifystudy://auth/callback?token=${token}`;
            
            // Optional: Close window after short delay
            setTimeout(() => {
               setStatus("You can now close this tab.");
            }, 2000);
        } else {
            setStatus("Failed to retrieve Google credentials.");
        }
      } catch (error: any) {
        console.error("Auth failed", error);
        setStatus(`Authentication failed: ${error.message}`);
      }
    };
    
    performAuth();
  }, []);

  return (
    <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0c1214',
        color: '#e8f3f7',
        fontFamily: 'sans-serif'
    }}>
        <h2>UnifyStudy Desktop Auth</h2>
        <p style={{ marginTop: '1rem', color: '#8fd2ff' }}>{status}</p>
    </div>
  );
}

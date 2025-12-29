// @ts-nocheck
import React from "react";
import { Hammer } from "lucide-react";

export default function StudyBuddy() {
  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%', 
      color: 'var(--color-text)',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <Hammer size={64} style={{ marginBottom: '1.5rem', opacity: 0.5, color: 'var(--color-primary)' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Find Study Buddy</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem' }}>
        We are crafting the perfect matchmaking experience for you. <br/>
        Check back soon!
      </p>
    </div>
  );
}

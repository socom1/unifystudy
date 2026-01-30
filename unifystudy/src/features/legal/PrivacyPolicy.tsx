import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Server, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="legal-page" style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto', 
      color: 'var(--color-text)',
      paddingBottom: '100px'
    }}>
      <Link to="/settings" style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '20px',
        color: 'var(--color-muted)',
        textDecoration: 'none',
        fontSize: '14px'
      }}>
        <ChevronLeft size={16} /> Back to Settings
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ 
            width: '48px', height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(99, 102, 241, 0.1)', 
            color: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield size={24} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>Privacy Policy</h1>
        </div>

        <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--color-text-dim)', marginBottom: '40px' }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>1. Introduction</h2>
          <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
            Welcome to UnifyStudy. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you as to how we look after your personal data when you visit our 
            application and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>2. Data We Collect</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ background: 'var(--bg-2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontWeight: 600 }}>
                <Eye size={18} color="#6366f1" /> Identity Data
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-dim)' }}>
                Includes first name, last name, username or similar identifier, and profile pictures provided via authentication.
              </p>
            </div>
            <div style={{ background: 'var(--bg-2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontWeight: 600 }}>
                <Server size={18} color="#a855f7" /> Usage Data
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-dim)' }}>
                Includes information about how you use our application, study timer durations, and task completion statistics.
              </p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>3. How We Use Your Data</h2>
          <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)', marginBottom: '15px' }}>
            We will only use your personal data when the law allows us to. Most commonly, we use your personal data in the following circumstances:
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
            <li style={{ marginBottom: '10px' }}>To register you as a new user (via Google Firebase Auth).</li>
            <li style={{ marginBottom: '10px' }}>To save your study progress, tasks, and settings across devices.</li>
            <li style={{ marginBottom: '10px' }}>To provide social features like Leaderboards and Chat (where you opt-in).</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>4. Data Security</h2>
          <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. 
            We use Google Cloud Firestore and Realtime Database with strict security rules to ensure only you can modify your personal data.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>5. Contact Us</h2>
            <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                If you have any questions about this privacy policy or our privacy practices, please contact us at support@unifystudy.com.
            </p>
        </section>

      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;

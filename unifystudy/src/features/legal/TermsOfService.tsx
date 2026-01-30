import React from 'react';
import { motion } from 'framer-motion';
import { ScrollText, AlertCircle, Scale, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
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
            background: 'rgba(240, 46, 101, 0.1)', 
            color: '#f02e65',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ScrollText size={24} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>Terms of Service</h1>
        </div>

        <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--color-text-dim)', marginBottom: '40px' }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>1. Acceptance of Terms</h2>
          <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
            By accessing and using UnifyStudy, you accept and agree to be bound by the terms and provision of this agreement. 
            In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>2. Use License</h2>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
            <li style={{ marginBottom: '10px' }}>
              Permission is granted to temporarily download one copy of the materials (information or software) on UnifyStudy's application for personal, non-commercial transitory viewing only.
            </li>
            <li style={{ marginBottom: '10px' }}>
              This is the grant of a license, not a transfer of title, and under this license you may not:
              <ul style={{ marginTop: '10px', listStyleType: 'circle' }}>
                <li>modify or copy the materials;</li>
                <li>use the materials for any commercial purpose, or for any public display;</li>
                <li>attempt to decompile or reverse engineer any software contained on UnifyStudy;</li>
              </ul>
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>3. User Content</h2>
          <div style={{ display: 'flex', gap: '15px', background: 'var(--bg-2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
             <AlertCircle size={24} color="var(--color-warning)" style={{ flexShrink: 0 }} />
             <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 5px 0' }}>Conduct & Content</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-dim)' }}>
                    You retain ownership of any content you create. However, you agree not to upload content that is illegal, offensive, or violates the rights of others. 
                    UnifyStudy reserves the right to remove any content that violates these terms.
                </p>
             </div>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>4. Termination</h2>
          <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
            We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, 
            including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive termination shall survive termination.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '15px', color: 'var(--color-text)' }}>5. Governing Law</h2>
            <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
        </section>

      </motion.div>
    </div>
  );
};

export default TermsOfService;

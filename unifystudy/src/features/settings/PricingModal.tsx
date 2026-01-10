import React, { useState } from 'react';
import { Check, X, Star, Crown, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './PricingModal.scss';

import { createPortal } from 'react-dom';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div 
        className="pricing-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh' }}
      >
        <motion.div 
          className="pricing-modal-content"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close-modal-btn" onClick={onClose}><X size={24} /></button>
          
          <div className="pricing-header">
            <div className="icon-wrapper">
                <Crown size={32} color="#ffd700" fill="#ffd700" />
            </div>
            <h2>Upgrade to Pro</h2>
            <p>Supercharge your study workflow with premium features designed for students.</p>
          </div>

          <div className="billing-toggle">
            <button 
                className={billingCycle === 'monthly' ? 'active' : ''} 
                onClick={() => setBillingCycle('monthly')}
            >
                Monthly
            </button>
            <button 
                className={billingCycle === 'yearly' ? 'active' : ''} 
                onClick={() => setBillingCycle('yearly')}
            >
                Yearly <span className="save-badge">SAVE 33%</span>
            </button>
          </div>

          <div className="pricing-cards">
            {/* FREE PLAN */}
            <div className="pricing-card free">
              <div className="card-top">
                  <h3>Free</h3>
                  <div className="price">$0<span>/forever</span></div>
                  <p className="description">Essential tools for basic studying.</p>
              </div>
              <ul className="features-list">
                  <li><Check size={16} /> Basic Task Management</li>
                  <li><Check size={16} /> 3 Active Projects</li>
                  <li><Check size={16} /> Pomodoro Timer</li>
                  <li><Check size={16} /> Basic Flashcards</li>
                  <li className="unavailable"><X size={16} /> Cloud Sync & Backup</li>
                  <li className="unavailable"><X size={16} /> Premium Themes</li>
                  <li className="unavailable"><X size={16} /> Advanced Analytics</li>
              </ul>
              <button className="plan-btn" disabled>Current Plan</button>
            </div>

            {/* PRO PLAN */}
            <div className="pricing-card pro">
              <div className="popular-tag">MOST POPULAR</div>
              <div className="card-top">
                  <h3>Pro Student</h3>
                  <div className="price">
                      {billingCycle === 'monthly' ? '$4.99' : '$39.99'}
                      <span>/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  <p className="description">Unlock full potential and limitless organization.</p>
              </div>
              <ul className="features-list">
                  <li><Check size={16} /> <strong>Unlimited</strong> Tasks & Projects</li>
                  <li><Check size={16} /> <strong>Cloud Sync</strong> Across Devices</li>
                  <li><Check size={16} /> Advanced Analytics & Insights</li>
                  <li><Check size={16} /> <strong>Unlimited</strong> AI Flashcards</li>
                  <li><Check size={16} /> All Premium Themes (Tokyo, Cozy...)</li>
                  <li><Check size={16} /> Priority Support</li>
                  <li><Check size={16} /> Early Access to New Features</li>
              </ul>
              <button className="plan-btn primary">
                  Upgrade Now 
                  <Zap size={16} style={{marginLeft: 6}} fill="currentColor" />
              </button>
            </div>
          </div>

          <p className="terms-tiny">
              Cancel anytime. Secure payment via Stripe. <br/>
              Special formatting for .edu / .ie emails automatically applied.
          </p>

        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

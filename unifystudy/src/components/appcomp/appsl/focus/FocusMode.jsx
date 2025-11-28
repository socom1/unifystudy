import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Focus, X, Music, Volume2, VolumeX, Clock } from 'lucide-react';
import './FocusMode.scss';

import Pomodoro from '../pomodoro/Pomdoro';

const FocusMode = ({ isActive, onClose }) => {
  if (!isActive) return null;

  return (
    <motion.div 
      className="focus-mode-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="focus-container">
        <header className="focus-header">
          <div className="focus-title">
            <Focus size={24} />
            <h2>Deep Focus Mode</h2>
          </div>
          <button className="close-focus" onClick={onClose}>
            <X size={20} />
            <span>Exit Focus</span>
          </button>
        </header>

        <div className="focus-content-wrapper">
          <Pomodoro />
          
          <div className="focus-quote">
            "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus."
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FocusMode;

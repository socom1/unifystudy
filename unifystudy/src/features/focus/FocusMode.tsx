// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, X, Music, Volume2, VolumeX, Wind, CloudRain, Coffee } from 'lucide-react';
import './FocusMode.scss';
import Pomodoro from '../pomodoro/Pomdoro';

import GlobalPlayer from '@/components/global/GlobalPlayer';

const FocusMode = ({ isActive, onClose }) => {
  // const [ambientSound, setAmbientSound] = useState(null); // REMOVED
  // const [isMuted, setIsMuted] = useState(false); // REMOVED
  // const audioRef = useRef(null); // REMOVED
  const [musicEnabled, setMusicEnabled] = useState(true);

  useEffect(() => {
      // Check settings
      const savedSetting = localStorage.getItem('disableFocusMusic');
      if (savedSetting === 'true') {
          setMusicEnabled(false);
      }
  }, []);



  // Breathing animation variants
  const backgroundVariants = {
    animate: {
      opacity: 1,
      background: [
        "linear-gradient(45deg, #1a2a3a, #131c23)",
        "linear-gradient(45deg, #131c23, #1a2a3a)",
        "linear-gradient(45deg, #1a2a3a, #131c23)"
      ],
      transition: {
        opacity: { duration: 0.8, ease: "easeInOut" },
        background: {
          duration: 15, // Slower, more calming
          repeat: Infinity,
          ease: "linear"
        }
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  if (!isActive) return null;

  return (
    <motion.div 
      className="focus-mode-overlay zen-mode"
      variants={backgroundVariants}
      animate="animate"
      initial={{ opacity: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeOut" } }}
    >
      {/* Dynamic Background Orb */}
      <motion.div 
        className="zen-orb"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: [0.8, 1.2, 0.8], 
          opacity: [0.3, 0.5, 0.3], 
        }}
        transition={{
          duration: 8, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div 
        className="zen-container"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Minimal Header */}
        <motion.header className="zen-header" variants={itemVariants}>
          {musicEnabled && (
            <div className="focus-controls">
                <GlobalPlayer 
                    idPrefix="zen_" 
                    disableDrag={true} 
                    className="zen-mode-player"
                    style={{ position: 'relative', transform: 'none', bottom: 'auto', right: 'auto', zIndex: 100 }}
                />
            </div>
          )}

          <button className="close-zen" onClick={onClose}>
            <span>End Session</span>
            <X size={20} />
          </button>
        </motion.header>

        {/* Main Content */}
        <div className="zen-content">
          <motion.div className="pomodoro-wrapper-zen" variants={itemVariants}>
              <Pomodoro zenMode={true} /> 
          </motion.div>
          
          <motion.div 
            className="zen-quote"
            variants={itemVariants}
          >
            "Flow is being completely involved in an activity for its own sake."
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FocusMode;

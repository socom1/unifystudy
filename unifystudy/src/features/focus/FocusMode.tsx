// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, X, Music, Volume2, VolumeX, Wind, CloudRain, Coffee } from 'lucide-react';
import './FocusMode.scss';

import Pomodoro from '../pomodoro/Pomdoro';

const AUDIO_URLS = {
    rain: 'https://cdn.pixabay.com/download/audio/2022/05/13/audio_257112181f.mp3?filename=rain-and-thunder-16705.mp3',
    wind: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1fb2c.mp3?filename=wind-arance-7053.mp3'
};

const FocusMode = ({ isActive, onClose }) => {
  const [ambientSound, setAmbientSound] = useState(null); // 'rain', 'forest', 'coffee'
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const [musicEnabled, setMusicEnabled] = useState(true);

  useEffect(() => {
      // Check settings
      const savedSetting = localStorage.getItem('disableFocusMusic');
      if (savedSetting === 'true') {
          setMusicEnabled(false);
      }
  }, []);

  useEffect(() => {
      // Cleanup audio on unmount or close
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, []);

  useEffect(() => {
     if (!isActive) {
          if (audioRef.current) audioRef.current.pause();
          return;
     }
     
     if (ambientSound && !isMuted) {
         const url = AUDIO_URLS[ambientSound];
         if (!url) return;

         if (!audioRef.current) {
             audioRef.current = new Audio(url);
             audioRef.current.loop = true;
         } else if (audioRef.current.src !== url) {
             audioRef.current.pause();
             audioRef.current = new Audio(url);
             audioRef.current.loop = true;
         }

         audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
     } else {
         if (audioRef.current) audioRef.current.pause();
     }
  }, [ambientSound, isMuted, isActive]);

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
            <motion.div 
              className="focus-controls"
              drag
              dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
              style={{ cursor: 'grab', display: 'flex', gap: '10px' }}
            >
              <div className="ambient-controls">
                <button 
                    className={`ambient-btn ${ambientSound === 'rain' ? 'active' : ''}`}
                    onClick={() => setAmbientSound(ambientSound === 'rain' ? null : 'rain')}
                    title="Rain Sounds"
                >
                    <CloudRain size={20} />
                </button>
                <button 
                    className={`ambient-btn ${ambientSound === 'wind' ? 'active' : ''}`}
                    onClick={() => setAmbientSound(ambientSound === 'wind' ? null : 'wind')}
                    title="White Noise"
                >
                    <Wind size={20} />
                </button>
                {ambientSound && (
                    <button className="mute-btn" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                )}
              </div>
            </motion.div>
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

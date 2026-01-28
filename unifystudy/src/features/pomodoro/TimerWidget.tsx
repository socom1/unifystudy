// @ts-nocheck
import React, { useRef } from 'react';
import { useTimer } from './TimerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TimerWidget = () => {
  const { running, secondsLeft, mode, formatTime } = useTimer();
  const location = useLocation();
  const navigate = useNavigate();
  const dragStartPos = useRef(null);

  // Don't show on the Pomodoro page itself to avoid redundancy
  if (location.pathname.startsWith('/pomodoro')) return null;

  // Only show if running
  if (!running) return null;

  const isBreak = mode === 'short' || mode === 'long';
  
  const handleDragStart = (event, info) => {
    dragStartPos.current = { x: info.point.x, y: info.point.y };
  };

  const handleDragEnd = (event, info) => {
    if (dragStartPos.current) {
      const dx = Math.abs(info.point.x - dragStartPos.current.x);
      const dy = Math.abs(info.point.y - dragStartPos.current.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If drag distance is less than 5 pixels, treat as click
      if (distance < 5) {
        navigate('/pomodoro');
      }
      
      dragStartPos.current = null;
    }
  };
  
  return (
    <AnimatePresence>
      {running && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          drag
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          whileHover={{ scale: 1.05 }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '100px',
            background: isBreak ? 'rgba(255, 77, 77, 0.9)' : 'rgba(12, 18, 20, 0.9)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isBreak ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '50px',
            padding: '0.8rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 1000,
            cursor: 'grab',
            color: '#fff'
          }}
        >
          <div style={{
            position: 'relative',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
             {/* Simple spinner or icon */}
             <div style={{
                 width: '100%',
                 height: '100%',
                 border: '3px solid rgba(255,255,255,0.3)',
                 borderTopColor: '#fff',
                 borderRadius: '50%',
                 animation: 'spin 1s linear infinite'
             }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(secondsLeft)}
            </span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {mode === 'work' ? 'Focus' : 'Break'}
            </span>
          </div>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimerWidget;

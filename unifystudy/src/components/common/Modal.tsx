// @ts-nocheck
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Reusable Modal Component
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - title: string
 * - children: ReactNode (body content)
 * - footer: ReactNode (buttons, etc.)
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 */
export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const maxWidths = {
    sm: '400px',
    md: '500px',
    lg: '800px'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            className="modal-backdrop" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
          <motion.div 
            className="modal-container"
            style={{ maxWidth: maxWidths[size] }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="modal-header">
              <h3>{title}</h3>
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {children}
            </div>

            {footer && (
              <div className="modal-footer">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

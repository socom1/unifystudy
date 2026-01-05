import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import './PatchNotesModal.scss';
import { ReleaseNote } from '@/data/releaseNotes';

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseNote: ReleaseNote;
}

const PatchNotesModal: React.FC<PatchNotesModalProps> = ({ isOpen, onClose, releaseNote }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="patch-notes-overlay">
          <motion.div
            className="patch-notes-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="patch-notes-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="modal-header">
              <div className="icon-wrapper">
                <Sparkles size={32} />
              </div>
              <div className="version-badge">v{releaseNote.version}</div>
              <h2>{releaseNote.title}</h2>
              <p className="date">{releaseNote.date}</p>
            </div>

            <div className="modal-content">
              <p className="description">{releaseNote.description}</p>
              
              <div className="features-list">
                <h3>What's New</h3>
                <ul>
                  {releaseNote.features.map((feature, index) => (
                    <li key={index}>
                      <CheckCircle2 size={16} className="feature-icon" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-btn" onClick={onClose}>
                Awesome!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PatchNotesModal;

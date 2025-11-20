// /mnt/data/Modal.jsx
// Modern terminal + full-coded modal component
// Drop-in replacement for your existing Modal.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./modal.scss";

export default function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  small = false,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`modal-panel ${small ? "small" : ""}`}
            initial={{ scale: 0.98, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <h3 id="modal-title">{title}</h3>
              <button
                className="close-x"
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">{children}</div>

            <div className="modal-actions">
              {actions ? (
                actions
              ) : (
                <>
                  <button className="ghost" onClick={onClose}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={onClose}>
                    OK
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

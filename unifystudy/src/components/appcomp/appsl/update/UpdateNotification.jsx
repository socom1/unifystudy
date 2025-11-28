import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, AlertCircle } from 'lucide-react';
import './UpdateNotification.scss';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    if (window.require) {
      const { ipcRenderer } = window.require('electron');

      ipcRenderer.on('update-available', () => {
        setUpdateAvailable(true);
      });

      ipcRenderer.on('download-progress', (event, percent) => {
        setDownloading(true);
        setProgress(percent);
      });

      ipcRenderer.on('update-downloaded', () => {
        setDownloading(false);
        setUpdateReady(true);
      });

      // Cleanup
      return () => {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('update-downloaded');
      };
    }
  }, []);

  const startDownload = () => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('start-download');
      setDownloading(true);
    }
  };

  const installUpdate = () => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('install-update');
    }
  };

  const closeNotification = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable && !downloading && !updateReady) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="update-notification-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="update-card"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
        >
          <div className="update-header">
            <div className="icon-wrapper">
              {updateReady ? <RefreshCw className="spin" /> : <Download />}
            </div>
            <h3>
              {updateReady ? "Update Ready to Install" : 
               downloading ? "Downloading Update..." : "New Update Available"}
            </h3>
            {!downloading && (
              <button className="close-btn" onClick={closeNotification}>
                <X size={18} />
              </button>
            )}
          </div>

          <div className="update-body">
            {downloading ? (
              <div className="progress-container">
                <div className="progress-bar">
                  <motion.div 
                    className="progress-fill" 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <span className="progress-text">{Math.round(progress)}%</span>
              </div>
            ) : updateReady ? (
              <p>The update has been downloaded. Restart the app to apply changes.</p>
            ) : (
              <p>A new version of UnifyStudy is available. Would you like to update now?</p>
            )}
          </div>

          <div className="update-actions">
            {updateReady ? (
              <button className="btn-primary" onClick={installUpdate}>
                Restart & Install
              </button>
            ) : downloading ? (
              <button className="btn-secondary" disabled>
                Please Wait...
              </button>
            ) : (
              <>
                <button className="btn-secondary" onClick={closeNotification}>
                  Later
                </button>
                <button className="btn-primary" onClick={startDownload}>
                  Update Now
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateNotification;

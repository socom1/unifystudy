import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Check, RefreshCw, Plus, X } from 'lucide-react';
import './CalendarSync.scss';

const CalendarSync = ({ onSync }) => {
  const [connected, setConnected] = useState({
    google: false,
    outlook: false
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleConnect = (provider) => {
    setIsSyncing(true);
    // Simulate API call/Auth flow
    setTimeout(() => {
      setConnected(prev => ({ ...prev, [provider]: true }));
      setIsSyncing(false);
      if (onSync) onSync(provider);
    }, 1500);
  };

  const handleDisconnect = (provider) => {
    setConnected(prev => ({ ...prev, [provider]: false }));
  };

  return (
    <>
      <button className="sync-btn" onClick={() => setShowModal(true)}>
        <Calendar size={16} />
        <span>Sync Calendar</span>
      </button>

      {showModal && (
        <div className="calendar-sync-overlay" onClick={() => setShowModal(false)}>
          <motion.div 
            className="calendar-sync-modal"
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="modal-header">
              <h3>Sync External Calendars</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="providers-list">
              {/* Google Calendar */}
              <div className={`provider-card ${connected.google ? 'connected' : ''}`}>
                <div className="provider-info">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" />
                  <div>
                    <h4>Google Calendar</h4>
                    <p>{connected.google ? 'Connected as user@gmail.com' : 'Import events from Google'}</p>
                  </div>
                </div>
                {connected.google ? (
                  <button className="action-btn disconnect" onClick={() => handleDisconnect('google')}>
                    Disconnect
                  </button>
                ) : (
                  <button 
                    className="action-btn connect" 
                    onClick={() => handleConnect('google')}
                    disabled={isSyncing}
                  >
                    {isSyncing ? <RefreshCw className="spin" size={16} /> : 'Connect'}
                  </button>
                )}
              </div>

              {/* Outlook Calendar */}
              <div className={`provider-card ${connected.outlook ? 'connected' : ''}`}>
                <div className="provider-info">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" alt="Outlook" />
                  <div>
                    <h4>Outlook Calendar</h4>
                    <p>{connected.outlook ? 'Connected' : 'Import events from Outlook'}</p>
                  </div>
                </div>
                {connected.outlook ? (
                  <button className="action-btn disconnect" onClick={() => handleDisconnect('outlook')}>
                    Disconnect
                  </button>
                ) : (
                  <button 
                    className="action-btn connect" 
                    onClick={() => handleConnect('outlook')}
                    disabled={isSyncing}
                  >
                    {isSyncing ? <RefreshCw className="spin" size={16} /> : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            <div className="sync-status">
              <p>
                <Check size={14} /> 
                Secure connection via OAuth 2.0
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default CalendarSync;

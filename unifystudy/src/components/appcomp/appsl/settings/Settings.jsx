import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Moon, Sun, Monitor, Trash2, LogOut, Save, Zap, Heart, Coffee, Leaf, Umbrella, Building2, ShoppingBag, Check } from 'lucide-react';
import './Settings.scss';

export default function Settings({ user, onSignOut }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accent') || '#4b6c82');

  // Initialize theme on mount
  React.useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const themes = [
      { id: 'dark', label: 'Dark', icon: <Moon size={18} />, pro: false, previewColor: '#1e1e1e' },
      { id: 'light', label: 'Light', icon: <Sun size={18} />, pro: false, previewColor: '#f8f9fa' },
      { id: 'tokyo', label: 'Tokyo', icon: <Zap size={18} />, pro: true, previewColor: 'linear-gradient(45deg, #100c24, #2a1b3d)' },
      { id: 'cozy', label: 'Cozy', icon: <Coffee size={18} />, pro: true, previewColor: 'rgb(50, 40, 35)' },
      { id: 'cute', label: 'Cute', icon: <Heart size={18} />, pro: true, previewColor: '#fff5fa' },
      { id: 'lofi', label: 'Lofi', icon: <Coffee size={18} />, pro: true, previewColor: '#3c2f29' },
      { id: 'nature', label: 'Nature', icon: <Leaf size={18} />, pro: true, previewColor: '#0f1e14' },
      { id: 'beach', label: 'Beach', icon: <Umbrella size={18} />, pro: true, previewColor: '#281428' },
      { id: 'city', label: 'City', icon: <Building2 size={18} />, pro: true, previewColor: '#141414' },
  ];

  const accents = [
      { id: 'ocean', color: '#4b6c82', label: 'Ocean' },
      { id: 'emerald', color: '#10b981', label: 'Emerald' },
      { id: 'purple', color: '#8b5cf6', label: 'Violet' },
      { id: 'rose', color: '#f43f5e', label: 'Rose' },
      { id: 'amber', color: '#f59e0b', label: 'Amber' },
  ];

  const handleThemeChange = (newTheme) => {
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleAccentChange = (color) => {
      setAccentColor(color);
      localStorage.setItem('accent', color);
      document.documentElement.style.setProperty('--primary-color', color);
  };

  return (
    <div className="settings-container">
      <motion.div 
        className="settings-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Settings</h1>
        <p>Manage your preferences and account.</p>
      </motion.div>

      <div className="settings-grid">
          {/* Profile Section */}
          <motion.div 
             className="settings-card"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
          >
              <div className="card-header">
                  <User size={20} />
                  <h2>Profile</h2>
              </div>
              <div className="card-content profile-content">
                  <div className="avatar-large">
                      {user?.photoURL ? <img src={user.photoURL} alt="Profile" /> : "U"}
                  </div>
                  <div className="profile-details">
                      <h3>{user?.displayName || "Student"}</h3>
                      <p>{user?.email}</p>
                      <button className="btn-secondary" disabled>Edit Profile (Coming Soon)</button>
                  </div>
              </div>
          </motion.div>

          {/* Appearance / Theme Shop Section */}
          <motion.div 
             className="settings-card"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
          >
              <div className="card-header">
                  <ShoppingBag size={20} />
                  <h2>Theme Shop</h2>
              </div>
              <div className="card-content">
                  <div className="shop-grid">
                      {themes.map(t => (
                          <div 
                            key={t.id}
                            className={`shop-item ${theme === t.id ? 'active' : ''} ${t.pro ? 'pro' : ''}`}
                            onClick={() => handleThemeChange(t.id)}
                          >
                              <div className="preview-box" style={{ background: t.previewColor }}>
                                  {t.icon}
                                  {t.pro && <span className="pro-badge">PRO</span>}
                                  {theme === t.id && <div className="equipped-badge"><Check size={12} /> Equipped</div>}
                              </div>
                              <div className="item-info">
                                  <span className="item-name">{t.label}</span>
                                  <span className="item-price">{t.pro ? 'Unlock' : 'Free'}</span>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="setting-group" style={{ marginTop: '1rem' }}>
                      <label>Accent Color</label>
                      <div className="accent-options">
                          {accents.map(a => (
                              <button 
                                key={a.id}
                                className={`accent-btn ${accentColor === a.color ? 'active' : ''}`}
                                style={{ backgroundColor: a.color }}
                                onClick={() => handleAccentChange(a.color)}
                                title={a.label}
                              >
                                  {accentColor === a.color && <Save size={14} color="white" />}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </motion.div>

          {/* Data Zone */}
          <motion.div 
             className="settings-card danger-zone"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
          >
              <div className="card-header">
                  <Trash2 size={20} />
                  <h2>Data & Account</h2>
              </div>
              <div className="card-content">
                  <p className="warning-text">Clear local data (cache, theme preferences). Firebase data is safe.</p>
                  <div className="danger-actions">
                      <button className="btn-danger" onClick={() => localStorage.clear()}>
                          Clear Local Cache
                      </button>
                      
                      <button className="btn-danger-outline" onClick={onSignOut}>
                          <LogOut size={16} />
                          Sign Out
                      </button>
                  </div>
              </div>
          </motion.div>

          <div className="app-version">
              UnifyStudy v1.2.0 • Build 2024
          </div>
      </div>
    </div>
  );
}

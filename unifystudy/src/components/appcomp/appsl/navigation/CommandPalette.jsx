import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, Zap, BookOpen, CheckSquare, Settings, Calendar, Plus, StickyNote } from 'lucide-react';
import { db } from '../firebase';
import { ref, push, get, query, limitToFirst } from 'firebase/database';
import './CommandPalette.scss';

export default function CommandPalette({ isOpen, onClose, user }) {
  const [queryText, setQueryText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg: '' }
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Define Commands
  const allCommands = [
      { id: 'dashboard', label: 'Go to Dashboard', icon: <Command size={18}/>, action: () => navigate('/') },
      { id: 'grades', label: 'View Grades / Subject Hub', icon: <BookOpen size={18}/>, action: () => navigate('/grades') },
      { id: 'todo', label: 'Open To-Do List', icon: <CheckSquare size={18}/>, action: () => navigate('/todo') },
      { id: 'calendar', label: 'Open Calendar', icon: <Calendar size={18}/>, action: () => navigate('/timetable') },
      { id: 'flashcards', label: 'Study Flashcards', icon: <Zap size={18}/>, action: () => navigate('/flashcards') },
      { id: 'analytics', label: 'Check Analytics', icon: <ArrowRight size={18}/>, action: () => navigate('/analytics') },
      { id: 'settings', label: 'Settings', icon: <Settings size={18}/>, action: () => navigate('/settings') },
      // Pomodoro Actions
      { id: 'pomo-25', label: 'Start 25m Pomodoro', icon: <Zap size={18}/>, action: () => navigate('/pomodoro?time=25') },
      { id: 'pomo-50', label: 'Start 50m Focus Session', icon: <Zap size={18}/>, action: () => navigate('/pomodoro?time=50') },
  ];

  // Detect "Quick Action" modes
  const isTaskMode = queryText.toLowerCase().startsWith('task ');
  const isNoteMode = queryText.toLowerCase().startsWith('note ');
  
  // Dynamic Commands for Quick Actions
  let dynamicCommands = [];
  if (isTaskMode) {
      const content = queryText.slice(5);
      dynamicCommands = [{
          id: 'quick-task',
          label: `Create Task: "${content}"`,
          icon: <Plus size={18} className="text-green-400"/>,
          action: () => handleQuickTask(content)
      }];
  } else if (isNoteMode) {
      const content = queryText.slice(5);
      dynamicCommands = [{
          id: 'quick-note',
          label: `Post Note: "${content}"`,
          icon: <StickyNote size={18} className="text-yellow-400"/>,
          action: () => handleQuickNote(content)
      }];
  }

  const filteredCommands = isTaskMode || isNoteMode 
      ? dynamicCommands 
      : allCommands.filter(cmd => cmd.label.toLowerCase().includes(queryText.toLowerCase()));

  useEffect(() => {
      if (isOpen) {
          setQueryText('');
          setSelectedIndex(0);
          setFeedback(null);
          setTimeout(() => inputRef.current?.focus(), 50);
      }
  }, [isOpen]);

  useEffect(() => {
      // Reset selection when query changes
      setSelectedIndex(0);
  }, [queryText]);

  const handleQuickTask = async (text) => {
      if (!user || !text.trim()) return;
      try {
          // Find first folder
          const foldersRef = query(ref(db, `users/${user.uid}/folders`), limitToFirst(1));
          const snap = await get(foldersRef);
          
          let targetFolderId = null;
          if (snap.exists()) {
              targetFolderId = Object.keys(snap.val())[0];
          } else {
              // Create default Inbox if no folders exist
              const newFolderRef = push(ref(db, `users/${user.uid}/folders`));
              await newFolderRef.set({ name: "Inbox", color: "#3b82f6", order: 0 });
              targetFolderId = newFolderRef.key;
          }

          if (targetFolderId) {
            const newTaskRef = push(ref(db, `users/${user.uid}/folders/${targetFolderId}/tasks`));
            await newTaskRef.set({
                text: text.trim(),
                isActive: false,
                order: Date.now(),
                dueDate: new Date().toLocaleDateString('en-CA'),
                color: '#3b82f6'
            });
            showFeedback('success', 'Task added to list!');
            setTimeout(onClose, 800);
          }
      } catch (err) {
          console.error(err);
          showFeedback('error', 'Failed to add task');
      }
  };

  const handleQuickNote = async (text) => {
      if (!user || !text.trim()) return;
      try {
          const notesRef = ref(db, `users/${user.uid}/sticky_notes`);
          await push(notesRef, {
              text: text.trim(),
              color: "#f59e0b", // Default sticky color
              x: 100 + Math.random() * 50,
              y: 100 + Math.random() * 50,
              rotation: Math.random() * 6 - 3,
          });
          showFeedback('success', 'Sticky note posted!');
          setTimeout(onClose, 800);
      } catch (err) {
          console.error(err);
          showFeedback('error', 'Failed to post note');
      }
  };

  const showFeedback = (type, msg) => {
      setFeedback({ type, msg });
  };

  const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
              performAction(filteredCommands[selectedIndex]);
          }
      } else if (e.key === 'Escape') {
          onClose();
      }
  };

  const performAction = (cmd) => {
      cmd.action();
      if (!cmd.id.startsWith('quick-')) {
          onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
        <motion.div 
            className="command-palette-container"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.1 }}
        >
            <div className="cp-input-wrapper">
                <Search className="search-icon" size={20} />
                <input 
                    ref={inputRef}
                    placeholder="Type 'task Do X' or search..."
                    value={queryText}
                    onChange={e => setQueryText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
                <span className="esc-hint">ESC</span>
            </div>
            
            <div className="cp-results">
                {feedback ? (
                    <div className={`cp-feedback ${feedback.type}`}>
                        {feedback.type === 'success' ? <CheckSquare size={18}/> : <Zap size={18}/>}
                        {feedback.msg}
                    </div>
                ) : filteredCommands.length > 0 ? (
                    filteredCommands.map((cmd, i) => (
                        <div 
                            key={cmd.id} 
                            className={`cp-item ${i === selectedIndex ? 'selected' : ''}`}
                            onClick={() => performAction(cmd)}
                            onMouseEnter={() => setSelectedIndex(i)}
                        >
                            <span className="cp-icon">{cmd.icon}</span>
                            <span className="cp-text">{cmd.label}</span>
                            {i === selectedIndex && <span className="cp-shortcut">↵</span>}
                        </div>
                    ))
                ) : (
                    <div className="cp-empty">
                        <p>No results found.</p>
                        <small>Try typing "task Buy milk" or "note Remember this"</small>
                    </div>
                )}
            </div>
        </motion.div>
    </div>
  );
}

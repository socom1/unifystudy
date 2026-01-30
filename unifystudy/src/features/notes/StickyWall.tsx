// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { Palette } from "lucide-react";
import "./StickyWall.scss";

const colors = ["#2d3436", "#0984e3", "#6c5ce7", "#00b894", "#d63031", "#e17055"];

export default function StickyWall() {
  const [notes, setNotes] = useState([]);
  const [userId, setUserId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) return;
    const notesRef = ref(db, `users/${userId}/sticky_notes`);
    const unsubscribe = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setNotes(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setNotes([]);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const addNote = () => {
    if (!userId) return;
    const notesRef = ref(db, `users/${userId}/sticky_notes`);
    const newNoteRef = push(notesRef);
    set(newNoteRef, {
      text: "",
      color: colors[Math.floor(Math.random() * colors.length)],
      x: Math.random() * 200,
      y: Math.random() * 200,
      rotation: Math.random() * 6 - 3, 
    });
  };

  const updateNote = (id, updates) => {
    if (!userId) return;
    update(ref(db, `users/${userId}/sticky_notes/${id}`), updates);
  };

  const deleteNote = (id) => {
    if (!userId) return;
    remove(ref(db, `users/${userId}/sticky_notes/${id}`));
  };

  return (
    <div className="sticky-wall">
      {/* Floating Toolbar */}
      <div className="floating-toolbar">
         <div className="toolbar-actions">
            <button onClick={addNote}>+ New Note</button>
         </div>
      </div>

      <div 
        className="wall-area" 
        ref={containerRef}
        onDoubleClick={(e) => {
            if (e.target === containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left - 100; // Center the 200px note
                const y = e.clientY - rect.top - 100;
                
                if (!userId) return;
                const notesRef = ref(db, `users/${userId}/sticky_notes`);
                const newNoteRef = push(notesRef);
                set(newNoteRef, {
                  text: "",
                  color: colors[Math.floor(Math.random() * colors.length)],
                  x: Math.max(0, x),
                  y: Math.max(0, y),
                  rotation: Math.random() * 6 - 3, 
                });
            }
        }}
      >
        <AnimatePresence>
          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              containerRef={containerRef}
              onUpdate={updateNote}
              onDelete={deleteNote}
            />
          ))}
        </AnimatePresence>
        {notes.length === 0 && (
          <div className="empty-state">
            <p>Double-click anywhere to add a sticky note!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StickyNote({ note, containerRef, onUpdate, onDelete }) {
  const [size, setSize] = useState({ width: 240, height: 240 });
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dragControls = useDragControls();

  const renderText = (text) => {
    if (!text) return <span className="empty-note-hint">Double click to edit...</span>;

    const parts = text.split(/(\[\[.*?\]\])/g);

    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkContent = part.slice(2, -2);
        return (
          <span
            key={index}
            className="wiki-link"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {linkContent}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      className="sticky-note"
      drag
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={undefined} // Fix jump issue by handling bounds manually
      dragMomentum={false}
      dragElastic={0} // Fix "ice" feeling
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isEditing ? 1.05 : 1, // Slight pop when editing
        opacity: 1,
        x: note.x,
        y: note.y,
        width: size.width,
        height: size.height,
        backgroundColor: note.color || '#2d3436',
        rotate: isEditing ? 0 : (note.rotation || 0), // Straighten when editing
        zIndex: isEditing ? 100 : 20, // Bring to front when editing
      }}
      exit={{ scale: 0, opacity: 0 }}
      whileDrag={{ scale: 1.05, zIndex: 100, cursor: "grabbing" }}
      onDragEnd={(e, info) => {
        const parentRect = containerRef.current?.getBoundingClientRect();
        if (!parentRect) return;

        let newX = note.x + info.offset.x;
        let newY = note.y + info.offset.y;

        // Manual Clamping
        const maxX = parentRect.width - size.width;
        const maxY = parentRect.height - size.height;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        onUpdate(note.id, {
          x: newX,
          y: newY,
        });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onClick={(e) => {
          if (showColorPicker) setShowColorPicker(false);
      }}
    >
      <div
        className="note-header"
        onPointerDown={(e) => dragControls.start(e)}
        style={{ height: '30px', width: '100%', cursor: 'grab', position: 'absolute', top: 0, left: 0, zIndex: 10 }}
      />
      
      {/* ... rest of component ... */}
      
      <div className="note-actions">
        <button 
            className="action-btn"
            onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
            }}
            title="Change Color"
        >
            <Palette size={14} />
        </button>
        <button className="action-btn" onClick={() => onDelete(note.id)}>×</button>
      </div>

      {showColorPicker && (
          <div 
            className="color-palette" 
            style={{
                position: 'absolute',
                top: '30px',
                right: '10px',
                padding: '6px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: '8px',
                display: 'flex',
                gap: '4px',
                zIndex: 20,
                backdropFilter: 'blur(4px)'
            }}
            onPointerDown={(e) => e.stopPropagation()} 
          >
              {colors.map(c => (
                  <div 
                    key={c}
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(note.id, { color: c });
                        setShowColorPicker(false);
                    }}
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: c,
                        cursor: 'pointer',
                        border: note.color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                        transform: note.color === c ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
              ))}
          </div>
      )}

      <div className="note-content">
        {isEditing ? (
          <textarea
            autoFocus
            value={note.text}
            placeholder="Type here..."
            onChange={(e) => onUpdate(note.id, { text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onPointerDown={(e) => e.stopPropagation()}
            className="note-textarea"
            style={{ 
                background: 'transparent', 
                color: 'inherit' 
            }}
          />
        ) : (
          <div className="note-view" style={{ color: 'inherit' }}>
            {renderText(note.text)}
          </div>
        )}
      </div>

      <div
        className="resize-handle"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startW = size.width;
          const startH = size.height;

          const onMove = (moveEvent) => {
            setSize({
              width: Math.max(200, startW + (moveEvent.clientX - startX)),
              height: Math.max(200, startH + (moveEvent.clientY - startY)),
            });
          };

          const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
          };

          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
        }}
      />
    </motion.div >
  );
}

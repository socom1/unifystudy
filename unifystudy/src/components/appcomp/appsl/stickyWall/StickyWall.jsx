import React, { useState, useEffect, useRef } from "react";
// Force reload
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { db, auth } from "../firebase";
import { ref, onValue, push, set, remove, update } from "firebase/database";
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
      rotation: Math.random() * 6 - 3, // Random tilt
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
    <div className="sticky-wall" ref={containerRef}>
      <header className="wall-header">
        <h1>Sticky Wall</h1>
        <button onClick={addNote}>+ New Note</button>
      </header>

      <div className="wall-area">
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
                <p>Click "+ New Note" to add a sticky note!</p>
            </div>
        )}
      </div>
    </div>
  );
}

function StickyNote({ note, containerRef, onUpdate, onDelete }) {
  const [size, setSize] = useState({ width: 240, height: 240 });
  const [isEditing, setIsEditing] = useState(false);
  const dragControls = useDragControls();

  // Parse text for [[links]]
  const renderText = (text) => {
    if (!text) return "Double click to edit...";
    
    // Regex to find [[link]]
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
              console.log(`Navigating to: ${linkContent}`);
              // Future: Implement actual navigation/search
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
      dragConstraints={containerRef}
      dragMomentum={false}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        x: note.x,
        y: note.y,
        width: size.width,
        height: size.height,
      }}
      exit={{ scale: 0, opacity: 0 }}
      whileDrag={{ zIndex: 100, cursor: "grabbing" }}
      onDragEnd={(e, info) => {
        onUpdate(note.id, {
          x: note.x + info.offset.x,
          y: note.y + info.offset.y,
        });
      }}
      style={{ backgroundColor: "rgba(30, 30, 40, 0.6)" }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <div 
        className="note-header" 
        onPointerDown={(e) => dragControls.start(e)}
        style={{ height: '24px', width: '100%', cursor: 'grab', position: 'absolute', top: 0, left: 0, zIndex: 10 }}
      />
      <div className="note-actions">
        <button onClick={() => onDelete(note.id)}>×</button>
      </div>
      
      <div className="note-content" style={{ marginTop: '20px', height: 'calc(100% - 30px)', overflow: 'auto' }}>
        {isEditing ? (
          <textarea
            autoFocus
            value={note.text}
            placeholder="Type here... Use [[Link]] to link notes."
            onChange={(e) => onUpdate(note.id, { text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: 'inherit', resize: 'none', outline: 'none' }} 
          />
        ) : (
          <div className="note-view">
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
    </motion.div>
  );
}

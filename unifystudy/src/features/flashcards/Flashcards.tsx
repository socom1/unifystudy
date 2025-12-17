// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db, auth } from '@/services/firebaseConfig';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowLeft, Layers, Zap, MoreVertical, Edit2, Play } from 'lucide-react';
import './Flashcards.scss';

export default function Flashcards() {
  const [userId, setUserId] = useState(null);
  const [decks, setDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null); // null = list view
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'study' | 'edit'

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');

  // Study State
  const [studyQueue, setStudyQueue] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };
   
  // Edit State
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const decksRef = ref(db, `users/${userId}/flashcards`);
    const unsub = onValue(decksRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, val]) => ({
          id,
          name: val.name,
          cards: val.cards ? Object.entries(val.cards).map(([cid, c]) => ({ 
            id: cid, 
            ...c,
            // Migration / Defaults
            state: c.state || 'new', // new, learning, review, relearning
            step: c.step || 0,
            interval: c.interval || 0, // days (for review)
            ease: c.ease || 2.5,
            dueDate: c.dueDate || c.nextReview || Date.now() // Support old 'nextReview' migration
          })) : []
        }));
        setDecks(arr);
        
        if (activeDeck) {
            const updated = arr.find(d => d.id === activeDeck.id);
            if (updated) {
                setActiveDeck(updated);
            }
        }
      } else {
        setDecks([]);
      }
    });
    return () => unsub();
  }, [userId, activeDeck?.id]); 

  // Queue Generation for Study Mode
  useEffect(() => {
      if (viewMode === 'study' && activeDeck) {
          const now = Date.now();
          
          // Separate queues
          const learning = [];
          const review = [];
          const newCards = [];

          activeDeck.cards.forEach(card => {
              // If due in future, skip (unless it's 'new' which is always available potentially, 
              // but standard Anki limits new cards. Here we show all available new cards)
              if (card.dueDate > now && card.state !== 'new') return;

              if (card.state === 'learning' || card.state === 'relearning') {
                  learning.push(card);
              } else if (card.state === 'review') {
                  review.push(card);
              } else {
                  // New cards
                  newCards.push(card);
              }
          });

          // Sort by due date (ascending)
          learning.sort((a,b) => a.dueDate - b.dueDate);
          review.sort((a,b) => a.dueDate - b.dueDate);
          // New cards usually order by creation or random. Creation default is fine.
          
          // Priority: Learning > Review > New
          const queue = [...learning, ...review, ...newCards];
          
          setStudyQueue(queue);
          setCurrentCardIndex(0);
          setIsFlipped(false);
          setShowCompleteModal(false);
      }
  }, [viewMode, activeDeck?.id]); // Note: In real app, might want to debounce or be careful with updates during study.

  const createDeck = async (e) => {
    e.preventDefault();
    if (!newDeckName.trim() || !userId) return;
    const newRef = push(ref(db, `users/${userId}/flashcards`));
    await set(newRef, { name: newDeckName, cards: {} });
    setNewDeckName('');
    setShowCreateModal(false);
  };

  const deleteDeck = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this deck?")) return;
    await remove(ref(db, `users/${userId}/flashcards/${id}`));
    if (activeDeck?.id === id) setActiveDeck(null);
  };

  const openDeck = (deck) => {
    setActiveDeck(deck);
    setViewMode('study');
  };

  const addCard = async (e) => {
      e.preventDefault();
      if (!activeDeck || !newFront.trim() || !newBack.trim()) return;
      const cardsRef = ref(db, `users/${userId}/flashcards/${activeDeck.id}/cards`);
      
      const now = Date.now();
      await push(cardsRef, {
          front: newFront,
          back: newBack,
          dueDate: now,
          state: 'new',
          step: 0,
          interval: 0,
          ease: 2.5,
          repetitions: 0
      });
      setNewFront('');
      setNewBack('');
  };

  const deleteCard = async (cardId) => {
      if (!activeDeck) return;
      await remove(ref(db, `users/${userId}/flashcards/${activeDeck.id}/cards/${cardId}`));
  };

  const handleRate = async (rating) => {
      // rating: 'again', 'hard', 'good', 'easy'
      const card = studyQueue[currentCardIndex];
      if (!card || !userId) return;

      const now = Date.now();
      let newState = card.state;
      let newStep = card.step;
      let newInterval = card.interval; // days
      let newEase = card.ease;
      let nextDue = now;

      // Logic constants
      const MINUTE = 60 * 1000;
      const DAY = 24 * 60 * 60 * 1000;

      if (card.state === 'new' || card.state === 'learning' || card.state === 'relearning') {
          // Learning Phase
          if (rating === 'again') {
              newStep = 0;
              nextDue = now + 1 * MINUTE; // 1m
          } else if (rating === 'good') {
              // Steps: 1m (step 0) -> 10m (step 1) -> Graduate (1d)
              if (newStep === 0) {
                   newStep = 1;
                   nextDue = now + 10 * MINUTE; // 10m
              } else {
                   // Graduate
                   newState = 'review';
                   newInterval = 1; // 1 day
                   newStep = 0;
                   nextDue = now + 1 * DAY;
              }
          } else if (rating === 'easy') {
              // Graduate immediately usually with bonus
              newState = 'review';
              newInterval = 4; // 4 days (default easy interval)
              newStep = 0;
              nextDue = now + 4 * DAY;
          }
      } else if (card.state === 'review') {
          // Review Phase
          if (rating === 'again') {
              // Lapse
              newState = 'relearning';
              newStep = 0;
              newEase = Math.max(1.3, newEase - 0.2);
              newInterval = 1; // reset interval to 1 day (for after relearning)
              nextDue = now + 10 * MINUTE; // Relearn step (10m) - simplified to single step for lapse
          } else if (rating === 'hard') {
              newInterval = Math.max(1, newInterval * 1.2);
              newEase = Math.max(1.3, newEase - 0.15);
              nextDue = now + newInterval * DAY;
          } else if (rating === 'good') {
              newInterval = Math.max(1, newInterval * newEase);
              nextDue = now + newInterval * DAY;
          } else if (rating === 'easy') {
              newInterval = Math.max(1, newInterval * newEase * 1.3);
              newEase += 0.15;
              nextDue = now + newInterval * DAY;
          }
      }

      // Update Firebase
      const cardRef = ref(db, `users/${userId}/flashcards/${activeDeck.id}/cards/${card.id}`);
      await update(cardRef, {
          state: newState,
          step: newStep,
          interval: newInterval,
          ease: newEase,
          dueDate: nextDue
      });

      // Move to next
      if (currentCardIndex < studyQueue.length - 1) {
          setIsFlipped(false);
          setCurrentCardIndex(prev => prev + 1);
      } else {
          // Only show complete if we didn't just re-queue something for THIS session.
          // But since we are sorting upfront, newly "Again" cards (1m due) might not appear immediately 
          // unless we re-fetch or re-sort. 
          // For this MVP, we finish the linear queue. 
          // Ideally, 'Again' (1m) should be re-inserted into the current session if possible.
          // Let's verify: If nextDue is < now + session length? 
          // Implementing dynamic queue is complex. 
          // Let's stick to "Finish Queue -> Reload to see Again cards" or just finish.
          setShowCompleteModal(true);
      }
  };

  return (
    <div className="flashcards-root">
       {/* Global Header (only in list view) */}
       {!activeDeck && (
        <header className="flashcards-header">
            <h1>Flashcards</h1>
            <button className="create-deck-btn" onClick={() => setShowCreateModal(true)}>
                <Plus size={18} /> New Deck
            </button>
        </header>
       )}

       {/* Deck List View */}
       {!activeDeck && (
           <motion.div 
             className="decks-grid"
             variants={containerVariants}
             initial="hidden"
             animate="show"
           >
               {decks.length === 0 && (
                   <motion.div className="empty-state" variants={itemVariants}>
                       <Layers size={48} />
                       <p>No decks yet. Create one to start studying!</p>
                   </motion.div>
               )}
               {decks.map(deck => (
                   <motion.div 
                    key={deck.id} 
                    className="deck-card"
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => openDeck(deck)}
                   >
                       <div className="deck-icon"><Zap size={24}/></div>
                       <div className="deck-info">
                           <h3>{deck.name}</h3>
                           <p>{deck.cards.length} cards</p>
                       </div>
                       <button className="delete-deck" onClick={(e) => deleteDeck(deck.id, e)}><Trash2 size={16}/></button>
                   </motion.div>
               ))}
           </motion.div>
       )}

       {/* Study / Edit View */}
       {activeDeck && (
           <div className="study-view">
               <div className="study-header">
                   <button onClick={() => { setActiveDeck(null); setViewMode('list'); }}>
                       <ArrowLeft size={24} />
                   </button>
                   <h2>{activeDeck.name}</h2>
                   <div className="deck-actions">
                       <button onClick={() => setViewMode(viewMode === 'study' ? 'edit' : 'study')}>
                           {viewMode === 'study' ? <><Edit2 size={16}/> Edit Cards</> : <><Play size={16}/> Study</>}
                       </button>
                   </div>
               </div>

                {viewMode === 'study' ? (
                    <div className="study-container">
                        {studyQueue.length > 0 && studyQueue[currentCardIndex] ? (
                            <>
                                <div 
                                 className={`flashcard ${isFlipped ? 'flipped' : ''}`} 
                                 onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    <div className="card-face front">
                                        {studyQueue[currentCardIndex].front}
                                        <span className="hint">Click to flip</span>
                                    </div>
                                    <div className="card-face back">
                                        {studyQueue[currentCardIndex].back}
                                    </div>
                                </div>

                                <div className="controls">
                                    {(() => {
                                        const card = studyQueue[currentCardIndex];
                                        const isNewOrLearning = card.state === 'new' || card.state === 'learning' || card.state === 'relearning';
                                        
                                        // Calculate upcoming intervals for button labels (preview)
                                        let againTimeMinutes, hardTimeMinutes, goodTimeMinutes, easyTimeMinutes;

                                        // Helper to format time label
                                        const formatTimeLabel = (minutes) => {
                                            if (minutes < 60) return `${Math.round(minutes)}m`;
                                            const days = minutes / 1440;
                                            if (days >= 365) return `${(days / 365).toFixed(1)}y`;
                                            if (days >= 1) return `${Math.round(days)}d`;
                                            return `${Math.round(minutes / 60)}h`;
                                        };

                                        if (isNewOrLearning) {
                                            // New/Learning/Relearning logic preview
                                            againTimeMinutes = 1; // 1m
                                            
                                            // Good: 10m or 1d (if step >= 1)
                                            goodTimeMinutes = card.step === 0 ? 10 : 24 * 60; // 10m or 1d
                                            
                                            // Easy: 4d
                                            easyTimeMinutes = 4 * 24 * 60; 
                                        } else {
                                            // Review logic preview
                                            againTimeMinutes = 1; // 1m (for relearning)
                                            hardTimeMinutes = Math.max(1, card.interval * 1.2) * 24 * 60;
                                            goodTimeMinutes = Math.max(1, card.interval * card.ease) * 24 * 60;
                                            easyTimeMinutes = Math.max(1, card.interval * card.ease * 1.3) * 24 * 60;
                                        }

                                        return (
                                            <>
                                                <button className="rate-btn again" onClick={() => handleRate('again')}>
                                                    Again <br/><span className="btn-time">{formatTimeLabel(againTimeMinutes)}</span>
                                                </button>
                                                
                                                {!isNewOrLearning && ( // Hard button only for review cards
                                                    <button className="rate-btn hard" onClick={() => handleRate('hard')}>
                                                        Hard <br/><span className="btn-time">{formatTimeLabel(hardTimeMinutes)}</span>
                                                    </button>
                                                )}

                                                <button className="rate-btn good" onClick={() => handleRate('good')}>
                                                    Good <br/><span className="btn-time">{formatTimeLabel(goodTimeMinutes)}</span>
                                                </button>

                                                <button className="rate-btn easy" onClick={() => handleRate('easy')}>
                                                    Easy <br/><span className="btn-time">{formatTimeLabel(easyTimeMinutes)}</span>
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                                <p style={{marginTop: '2rem', color: 'var(--color-muted)'}}>
                                    Card {currentCardIndex + 1} of {studyQueue.length} 
                                    <span style={{marginLeft: '10px', fontSize: '0.8em', opacity: 0.7}}>
                                        ({studyQueue[currentCardIndex].state})
                                    </span>
                                </p>
                            </>
                        ) : (
                            <div className="empty-state">
                                {studyQueue.length > 0 ? (
                                    <p>Loading card...</p>
                                ) : (
                                    <>
                                        <p>🎉 All caught up!</p>
                                        <p style={{fontSize: '0.9rem', color: 'var(--color-muted)'}}>No more cards due right now.</p>
                                        <button className="create-deck-btn" onClick={() => { setViewMode('list'); setActiveDeck(null); }} style={{marginTop: '1rem'}}>Back to Decks</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="edit-container">
                        <form onSubmit={addCard} className="add-card-form" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                            <input placeholder="Front (Question)" value={newFront} onChange={e => setNewFront(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-2)', color: 'white', flex: 1 }} autoFocus />
                            <input placeholder="Back (Answer)" value={newBack} onChange={e => setNewBack(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-2)', color: 'white', flex: 1 }} />
                            <button type="submit" style={{ padding: '0 1.5rem', borderRadius: '8px', background: 'var(--color-primary)', border: 'none', color: 'white', cursor: 'pointer' }}>Add</button>
                        </form>

                        <div className="cards-list">
                            {activeDeck.cards.map((card, i) => (
                                <div key={card.id} className="card-row">
                                    <div className="card-text">
                                        <div>{card.front}</div>
                                        <div>{card.back}</div>
                                    </div>
                                    <div style={{fontSize: '0.8rem', color: 'var(--color-muted)', marginRight: '1rem'}}>
                                        {card.state} / Due: {new Date(card.dueDate).toLocaleDateString()}
                                    </div>
                                    <button onClick={() => deleteCard(card.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
           </div>
       )}

       {/* Create Modal */}
       <AnimatePresence>
            {showCreateModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="modal-content"
                        style={{ background: 'var(--bg-2)', padding: '2rem', borderRadius: '16px', width: '400px', border: '1px solid var(--glass-border)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 style={{ marginTop: 0 }}>Create New Deck</h2>
                        <form onSubmit={createDeck}>
                            <input 
                                placeholder="Deck Name (e.g. Biology 101)" 
                                value={newDeckName} 
                                onChange={e => setNewDeckName(e.target.value)}
                                style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-1)', color: 'white' }}
                                autoFocus 
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ background: 'var(--color-primary)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Create</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showCompleteModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCompleteModal(false)}>
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="modal-content"
                        style={{ background: 'var(--bg-2)', padding: '2rem', borderRadius: '16px', width: '400px', border: '1px solid var(--glass-border)', textAlign: 'center' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ marginTop: 0 }}>Session Complete!</h2>
                        <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>You've reviewed all cards in the queue.</p>
                        
                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'center' }}>
                            <button onClick={() => { setShowCompleteModal(false); setViewMode('list'); setActiveDeck(null); }} style={{ background: 'var(--color-primary)', border: 'none', padding: '0.8rem 2rem', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                Back to Decks
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
       </AnimatePresence>
    </div>
  );
}

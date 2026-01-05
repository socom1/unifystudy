// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/services/firebaseConfig';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { toast } from 'sonner';
import { AnkiScheduler, Card, CardType, Rating, DEFAULT_DECK_CONFIG } from "./ankiScheduler";
import Modal from "@/components/common/Modal";
import { Trash2 } from "lucide-react";
import { recordStudySession } from "@/services/leaderboardService";
import { useGamification } from "@/context/GamificationContext";

const scheduler = new AnkiScheduler(DEFAULT_DECK_CONFIG);

export default function Flashcards() {
    const [userId, setUserId] = useState(null);
    const [decks, setDecks] = useState([]);
    const [activeDeck, setActiveDeck] = useState(null); // null = Dashboard
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'study'

    // Dashboard State
    const [deckStats, setDeckStats] = useState({}); // { deckId: { new: 0, learn: 0, review: 0 } }

    // Study State
    const [studyQueue, setStudyQueue] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCreateDeck, setShowCreateDeck] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    
    // Card List Modal State
    // Card List Modal State
    const [showCardList, setShowCardList] = useState(false);
    const [activeListDeck, setActiveListDeck] = useState(null);
    const [cardListTitle, setCardListTitle] = useState('');
    const [cardList, setCardList] = useState([]);


    // Session Tracking
    const sessionStartTimeRef = useRef(0);
    const { addXP } = useGamification();

    // Reset explanation on new card


    // Auth
    useEffect(() => {
        const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!userId) return;
        const decksRef = ref(db, `users/${userId}/flashcards`);
        onValue(decksRef, (snap) => {
            const data = snap.val();
            if (data) {
                const loadedDecks = Object.entries(data).map(([id, val]) => {
                    const rawCards = (val as any).cards || {};
                    const cardsArr = Object.entries(rawCards).map(([cid, c]) =>
                        scheduler.migrateLegacyCard({ id: cid, ...(c as any) })
                    );
                    return { id, name: (val as any).name, cards: cardsArr };
                });

                setDecks(loadedDecks);

                // Stats Calculation
                const stats = {};
                loadedDecks.forEach(d => {
                    stats[d.id] = scheduler.getDeckCounts(d.cards);
                    console.log(`Deck [${d.name}] Stats:`, stats[d.id]); // DEBUG LOG
                });
                setDeckStats(stats);

                if (activeDeck) {
                    const updated = loadedDecks.find(d => d.id === activeDeck.id);
                    if (updated) setActiveDeck(updated);
                }
            } else {
                setDecks([]);
                setDeckStats({});
            }
            setLoading(false);
        });
    }, [userId]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== 'study' || sessionComplete) return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (!showAnswer) {
                    setShowAnswer(true);
                } else {
                    handleAnswer(Rating.Good);
                }
            } else if (showAnswer) {
                switch (e.key) {
                    case '1': handleAnswer(Rating.Again); break;
                    case '2': handleAnswer(Rating.Hard); break;
                    case '3': handleAnswer(Rating.Good); break;
                    case '4': handleAnswer(Rating.Easy); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, showAnswer, sessionComplete]);

    // Computed Values (Must be top level)
    const card = viewMode === 'study' && !sessionComplete ? studyQueue[currentCardIndex] : null;

    const formattedFront = React.useMemo(() =>
        card ? scheduler.formatCardContent(card.front, 'front', card.modelType) : '',
        [card]);

    const formattedBack = React.useMemo(() =>
        card ? scheduler.formatCardContent(card.front, 'back', card.modelType) + '<br/><br/>' + (card.back || '') : '',
        [card]);


    
    const handleShowCards = (deck, category) => {
        const now = Math.floor(Date.now() / 1000);
        let filtered = [];
        
        if (category === 'new') {
            filtered = deck.cards.filter(c => c.ctype === CardType.New);
        } else if (category === 'learn') {
            // "Learn" stats count usually means due learning cards
             filtered = deck.cards.filter(c => (c.ctype === CardType.Learn || c.ctype === CardType.Relearn));
             // In Scheduler getDeckCounts logic: 
             // if (card.ctype === CardType.Learn || card.ctype === CardType.Relearn) { if (card.due <= now) counts.learn++; }
             // So for stats consistency we should filter by due <= now. 
             // But if user clicks "Learn", maybe they want to see ALL learning cards? 
             // The number shows what is ready. Seeing what is ready makes most sense.
             // UPDATE: Match the "Learn Ahead" logic (now + 1200s)
             filtered = filtered.filter(c => c.due <= now + 1200);
        } else if (category === 'due') {
             filtered = deck.cards.filter(c => c.ctype === CardType.Review && c.due <= now);
        }
        
        setCardList(filtered);
        setActiveListDeck(deck);
        setCardListTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Cards (${filtered.length})`);
        setShowCardList(true);
    };

    // --- Actions ---

    // Create new deck
    const handleCreateDeck = async (name) => {
        if (!name.trim()) return;
        const newDeckRef = push(ref(db, `users/${userId}/flashcards`));
        await set(newDeckRef, { name: name.trim() });
        toast.success(`Deck "${name}" created!`);
        setShowCreateDeck(false);
    };



    // Create new card
    const handleCreateCard = async (deckId, front, back, modelType) => {
        const newCard = {
            front,
            back,
            modelType,
            ctype: CardType.New,
            queue: 0,
            due: Math.floor(Date.now() / 1000),
            interval: 0,
            ease_factor: 2500,
            reps: 0,
            lapses: 0,
            remaining_steps: 0
        };
        await push(ref(db, `users/${userId}/flashcards/${deckId}/cards`), newCard);
        toast.success("Card added!");
        setShowAddModal(false);
    };

    const handleDeleteDeck = async (e, deckId) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this deck? This cannot be undone.")) {
            await remove(ref(db, `users/${userId}/flashcards/${deckId}`));
            toast.success("Deck deleted");
        }
    };

    const handleDeleteCard = async (deck, cardId) => {
        if (confirm("Delete this card?")) {
            await remove(ref(db, `users/${userId}/flashcards/${deck.id}/cards/${cardId}`));
            // Update local list if open
            setCardList(prev => prev.filter(c => c.id !== cardId));
            toast.success("Card deleted");
        }
    };

    const startStudy = (deck) => {
        setActiveDeck(deck);
        const now = Math.floor(Date.now() / 1000);
        const queue = deck.cards.filter(c => {
            // If New, always avail. If Review/Learn, check due (plus 20 mins for learn ahead)
            return (c.ctype === CardType.New) || (c.due <= now + 1200);
        });

        if (queue.length === 0) {
            toast('No cards due for this deck!', { description: 'Great job!' });
            return;
        }

        // Sort: Due date ascending, then New cards last
        queue.sort((a, b) => {
            // Priority 1: Due Review/Learn cards
            if (a.ctype !== CardType.New && b.ctype === CardType.New) return -1;
            if (a.ctype === CardType.New && b.ctype !== CardType.New) return 1;

            // Priority 2: Due Date
            return a.due - b.due;
        });

        setStudyQueue(queue);
        setCurrentCardIndex(0);
        setSessionComplete(false);
        setViewMode('study');
        setShowAnswer(false);
        sessionStartTimeRef.current = Date.now();
    };

    const handleAnswer = async (rating: Rating) => {
        if (sessionComplete || !studyQueue[currentCardIndex]) return;

        const card = studyQueue[currentCardIndex];
        const nextCard = scheduler.answerCard(card, rating);

        if (userId && activeDeck) {
            const updates = {
                ctype: nextCard.ctype,
                queue: nextCard.queue,
                due: nextCard.due,
                interval: nextCard.interval,
                ease_factor: nextCard.ease_factor,
                reps: nextCard.reps,
                lapses: nextCard.lapses,
                remaining_steps: nextCard.remaining_steps
            };
            const cardRef = ref(db, `users/${userId}/flashcards/${activeDeck.id}/cards/${card.id}`);
            await update(cardRef, updates);
        }

        const now = Math.floor(Date.now() / 1000);
        // If card is still in learning path loop, requeue it for this session?
        // Simple logic: if due < now + 20 mins, put at end of queue
        const q = [...studyQueue];
        // If card is still in learning path loop, requeue it for this session?
        // Simple logic: if due < now + 3 mins (180s), put at end of queue
        // This allows cards with >3m steps (like Good=10m or Hard=5.5m) to exit the session.
        if (nextCard.due <= now + 180) {
            q.push({ ...card, ...nextCard });
            setStudyQueue(q);
        }

        if (currentCardIndex < q.length - 1) {
            setShowAnswer(false);
            setCurrentCardIndex(prev => prev + 1);
        } else {
            setSessionComplete(true);
            // Record Session Stats
            const durationMinutes = (Date.now() - sessionStartTimeRef.current) / 1000 / 60;
            // Only record if > 0.1 mins (6 seconds) to avoid accidental clicks
            if (durationMinutes > 0.1 && userId) {
                recordStudySession(userId, durationMinutes, 'flashcards')
                    .then(({ earnedCoins, unlocked }) => {
                         // Toast handled by addXP mostly, but coins logic separate? 
                         // Actually recordStudySession awards coins.
                         // addXP handles XP.
                         addXP(Math.floor(durationMinutes * 5) + 10, "Flashcard Master");
                    });
            }
        }
    };

    // --- Renders ---

    // Modern Dashboard
    if (viewMode === 'dashboard') {
        const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
        // Mock streak for now, or pull from leaderboard context if available
        const streak = 0; 

        return (
            <div className="flashcards-dashboard" style={{ padding: '2rem', height: '100%', overflowY: 'auto', color: 'var(--color-text)' }}>
                {/* Hero / Stats Section */}
                <div style={{ 
                    marginBottom: '3rem', 
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)', 
                    borderRadius: '24px', 
                    padding: '3rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div>
                        <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
                            Flashcards
                        </h1>
                        
                    </div>
                    
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#6366f1' }}>{decks.length}</div>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.6, fontWeight: '600', letterSpacing: '0.05em' }}>Decks</div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#a855f7' }}>{totalCards}</div>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.6, fontWeight: '600', letterSpacing: '0.05em' }}>Cards</div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#22c55e' }}>{streak}</div>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.6, fontWeight: '600', letterSpacing: '0.05em' }}>Day Streak</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Your Decks</h2>
                    <button 
                        onClick={() => setShowCreateDeck(true)} 
                        style={{ 
                            padding: '0.8rem 1.5rem', 
                            background: 'var(--color-primary)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            cursor: 'pointer', 
                            fontWeight: 600, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        + New Deck
                    </button>
                </div>

                {/* Modals */}
                <CreateDeckModal 
                    isOpen={showCreateDeck} 
                    onClose={() => setShowCreateDeck(false)} 
                    onSave={handleCreateDeck} 
                />
                
                <AddCardModal
                    isOpen={showAddModal}
                    decks={decks}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleCreateCard}
                />
                
                <CardListModal
                    isOpen={showCardList}
                    title={cardListTitle}
                    cards={cardList}
                    onClose={() => setShowCardList(false)}
                    onDelete={(cid) => handleDeleteCard(activeListDeck, cid)}
                />

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                    gap: '2rem',
                    paddingBottom: '2rem'
                }}>
                    {decks.map(deck => {
                        const stats = deckStats[deck.id] || { new: 0, learn: 0, review: 0 };
                        const hasCards = stats.new + stats.learn + stats.review > 0;

                        return (
                            <div
                                key={deck.id}
                                onClick={() => startStudy(deck)}
                                style={{
                                    background: 'var(--glass-bg)', // Use theme var
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '24px',
                                    padding: '2rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1.5rem',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={e => { 
                                    e.currentTarget.style.transform = 'translateY(-6px)'; 
                                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)'; 
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseLeave={e => { 
                                    e.currentTarget.style.transform = 'none'; 
                                    e.currentTarget.style.boxShadow = 'none'; 
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>{deck.name}</h2>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem' }}
                                            title="Add Card"
                                        >
                                            + Add
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteDeck(e, deck.id)}
                                            style={{ 
                                                background: 'transparent', 
                                                border: 'none', 
                                                color: 'var(--color-muted)', 
                                                cursor: 'pointer', 
                                                padding: '6px', 
                                                borderRadius: '8px',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-muted)'}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Nice dividing line */}
                                <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%' }}></div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); handleShowCards(deck, 'new'); }}
                                        style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', background: 'rgba(34, 197, 94, 0.05)' }}
                                    >
                                        <div style={{ color: '#22c55e', fontWeight: '800', fontSize: '1.5rem' }}>{stats.new}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7, color: '#22c55e', fontWeight: '600', letterSpacing: '0.05em' }}>NEW</div>
                                    </div>
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); handleShowCards(deck, 'learn'); }}
                                        style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', background: 'rgba(239, 68, 68, 0.05)' }}
                                    >
                                        <div style={{ color: '#ef4444', fontWeight: '800', fontSize: '1.5rem' }}>{stats.learn}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7, color: '#ef4444', fontWeight: '600', letterSpacing: '0.05em' }}>LEARN</div>
                                    </div>
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); handleShowCards(deck, 'due'); }}
                                        style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', background: 'rgba(59, 130, 246, 0.05)' }}
                                    >
                                        <div style={{ color: '#3b82f6', fontWeight: '800', fontSize: '1.5rem' }}>{stats.review}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7, color: '#3b82f6', fontWeight: '600', letterSpacing: '0.05em' }}>DUE</div>
                                    </div>
                                </div>
                                <button style={{
                                    width: '100%',
                                    padding: '1rem',
                                    marginTop: '0.5rem',
                                    background: hasCards ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                    color: hasCards ? 'white' : 'var(--color-muted)',
                                    border: 'none',
                                    borderRadius: '16px',
                                    fontWeight: '700',
                                    cursor: hasCards ? 'pointer' : 'default',
                                    opacity: hasCards ? 1 : 0.5,
                                    transition: 'all 0.2s',
                                    letterSpacing: '0.02em',
                                }}>
                                    {hasCards ? 'STUDY NOW' : 'ALL CAUGHT UP'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {decks.length === 0 && !loading && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '6rem', 
                        color: 'var(--color-muted)',
                        border: '2px dashed var(--glass-border)',
                        borderRadius: '24px',
                        marginTop: '2rem'
                    }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>It's quiet here...</h3>
                        <p style={{ marginBottom: '2rem' }}>Create your first deck to get started!</p>
                        <button 
                            onClick={() => setShowCreateDeck(true)} 
                            style={{ padding: '0.8rem 1.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            + Create Deck
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Modern Reviewer
    if (viewMode === 'study') {
        if (sessionComplete) {
            return (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Session Complete!</h2>
                    <p style={{ opacity: 0.7, marginBottom: '2rem' }}>You've reviewed all cards pending for now.</p>
                    <button
                        onClick={() => setViewMode('dashboard')}
                        style={{ padding: '1rem 2rem', background: 'var(--color-primary, #6366f1)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            );
        }

        if (!card) return <div style={{ padding: '2rem' }}>Loading card...</div>;

        // If Basic, Front is Front. If Cloze, Front is Parsed Front.

        // If Basic, Front is Front. If Cloze, Front is Parsed Front.
        // If Basic, Back is Back. If Cloze, Back is Parsed Front + Extra.

        const displayFront = card.modelType === 'cloze' ? formattedFront : card.front;
        // For basic, displayBack is just card.back usually shown relative to front.
        // But in our UI, we show the "Back" section.
        // Using dangerouslySetInnerHTML.



        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--glass-border, #333)', marginBottom: '2rem' }}>
                    <div style={{ fontWeight: 600 }}>{activeDeck.name}</div>
                    <div style={{ opacity: 0.7 }}>{currentCardIndex + 1} / {studyQueue.length}</div>
                </div>

                {/* Card Area - CLICKABLE */}
                <div
                    onClick={() => !showAnswer && setShowAnswer(true)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3rem',
                        fontSize: '1.8rem',
                        textAlign: 'center',
                        cursor: !showAnswer ? 'pointer' : 'default',
                        userSelect: 'text', // Allow selecting text
                    }}
                >
                    {/* Front */}
                    <div
                        style={{ fontWeight: 500 }}
                        dangerouslySetInnerHTML={{ __html: displayFront }}
                    />

                    {showAnswer ? (
                        <div style={{
                            borderTop: '2px solid var(--glass-border, #333)',
                            paddingTop: '3rem',
                            width: '100%',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            {/* If Cloze, show Full Text + Extra. If Basic, show Back. */}
                            <div dangerouslySetInnerHTML={{ __html: card.modelType === 'cloze' ? formattedBack : card.back }} />

                            {/* AI Explanation Area */}

                        </div>
                    ) : (
                        <div style={{
                            padding: '1rem 2rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '50px',
                            fontSize: '1rem',
                            opacity: 0.5,
                            marginTop: '2rem'
                        }}>
                            Click or Space to Show Answer
                        </div>
                    )}
                </div>

                {/* Footer Controls - MASSIVE BUTTONS */}
                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    {!showAnswer ? (
                        <button
                            onClick={() => setShowAnswer(true)}
                            style={{
                                width: '100%',
                                padding: '1.5rem',
                                fontSize: '1.2rem',
                                background: 'var(--color-primary, #6366f1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            Show Answer
                        </button>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                            <RatingButton label="Again" sub="1m" color="#ef4444" onClick={() => handleAnswer(Rating.Again)} shortcut="1" />
                            <RatingButton label="Hard" sub="6m" color="#f59e0b" onClick={() => handleAnswer(Rating.Hard)} shortcut="2" />
                            <RatingButton label="Good" sub="10m" color="#22c55e" onClick={() => handleAnswer(Rating.Good)} shortcut="3" />
                            <RatingButton label="Easy" sub="4d" color="#3b82f6" onClick={() => handleAnswer(Rating.Easy)} shortcut="4" />
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
}

// ... Small components



// Only ReactMarkdown is missing, I will replace it with simple text rendering or dangerouslySetInnerHTML for now since I don't want to install new deps yet.
// Replacing <ReactMarkdown> with simple div.

function CreateDeckModal({ isOpen, onClose, onSave }) {
    const [name, setName] = useState('');
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Deck"
            footer={(
                <>
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={() => onSave(name)}>Create Deck</button>
                </>
            )}
        >
                <div className="form-group">
                    <label>Deck Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                        placeholder="e.g. Biology 101"
                    />
                </div>
        </Modal>
    );
}

function AddCardModal({ isOpen, decks, onClose, onSave }) {
    const [deckId, setDeckId] = useState(decks[0]?.id || '');
    const [type, setType] = useState('basic');
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    
    // Reset when opened
    useEffect(() => {
        if (isOpen && decks.length > 0 && !deckId) setDeckId(decks[0].id);
    }, [isOpen, decks, deckId]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Flashcard"
            footer={(
                <>
                     <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={() => onSave(deckId, front, back, type)}>Save Card</button>
                </>
            )}
        >
                <div className="form-group">
                    <label>Deck</label>
                    <select value={deckId} onChange={e => setDeckId(e.target.value)}>
                        {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Type</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setType('basic')} style={{ flex: 1, padding: '0.8rem', background: type === 'basic' ? '#6366f1' : '#333', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Basic</button>
                        <button onClick={() => setType('cloze')} style={{ flex: 1, padding: '0.8rem', background: type === 'cloze' ? '#6366f1' : '#333', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cloze</button>
                    </div>
                </div>

                <div className="form-group">
                    <label>
                        {type === 'cloze' ? 'Text (Use {{c1::answer}})' : 'Front'}
                    </label>
                    <textarea
                        value={front}
                        onChange={e => setFront(e.target.value)}
                        rows={4}
                        placeholder={type === 'cloze' ? 'The capital of France is {{c1::Paris}}.' : 'Question'}
                    />
                </div>

                <div className="form-group">
                    <label>
                        {type === 'cloze' ? 'Extra (Back)' : 'Back'}
                    </label>
                    <textarea
                        value={back}
                        onChange={e => setBack(e.target.value)}
                        rows={3}
                        placeholder="Extra info or Answer"
                    />
                </div>
        </Modal>
    );
}

function CardListModal({ isOpen, title, cards, onClose, onDelete }) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="lg"
            footer={(
                <button className="btn-secondary" onClick={onClose}>Close</button>
            )}
        >
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', maxHeight: '60vh' }}>
                    {cards.length === 0 ? (
                        <p style={{ opacity: 0.6, textAlign: 'center', padding: '1rem' }}>No cards in this category.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {cards.map(card => {
                                const now = Math.floor(Date.now() / 1000);
                                const dueDiff = card.due - now;
                                let dueText = "Ready";
                                if (dueDiff > 0) {
                                    const mins = Math.ceil(dueDiff / 60);
                                    dueText = `in ${mins}m`;
                                }

                                return (
                                <div key={card.id} style={{ background: 'var(--bg-1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#fff', flex: 1 }}>{card.front}</div>
                                        <span style={{ fontSize: '0.8rem', color: dueDiff > 0 ? '#f59e0b' : '#22c55e', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                                            {dueText}
                                        </span>
                                    </div>
                                    <div style={{ opacity: 0.7, fontSize: '0.9rem', color: '#ddd' }}>{card.back}</div>
                                    {card.modelType === 'cloze' && <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>[Cloze]</div>}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                        <button 
                                            onClick={() => onDelete(card.id)}
                                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
        </Modal>
    );
}

// Helper Component for consistency
function RatingButton({ label, sub, color, onClick, shortcut }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: color, // `${color}20` for transparent? No, user wants visible.
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'transform 0.1s',
                boxShadow: `0 4px 12px ${color}40`
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{label}</span>
            {/* <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{sub}</span> */}
            <span style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>({shortcut})</span>
        </button>
    );
}

// Global style for fade in
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

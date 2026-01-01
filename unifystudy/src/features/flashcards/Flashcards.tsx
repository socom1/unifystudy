// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '@/services/firebaseConfig';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { toast } from 'sonner';
import { AnkiScheduler, Card, CardType, Rating, DEFAULT_DECK_CONFIG } from "./ankiScheduler";

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
    const [showSmartGen, setShowSmartGen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [explanation, setExplanation] = useState(null);

    // Reset explanation on new card
    useEffect(() => {
        setExplanation(null);
    }, [currentCardIndex, studyQueue]);

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

    const saveApiKey = (key) => {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        setShowSettings(false);
        toast.success("API Key Saved");
    };

    const fetchExplanation = async (front, back) => {
        if (!apiKey) {
            toast.error("Please set your Gemini API Key in Settings");
            setShowSettings(true);
            return null;
        }

        try {
            const prompt = `Explain this flashcard concept briefly and simply:\nFront: ${front}\nBack: ${back}\n\nExplanation:`;
            // Call Gemini API (Client-side for demo)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            console.error(e);
            toast.error("AI Error: " + e.message);
            return null;
        }
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

    // Smart Gen / Import
    const handleSmartGen = async (deckId, text) => {
        if (!text.trim()) return;
        const newCards = [];
        const now = Math.floor(Date.now() / 1000);

        // 1. Try JSON parsing (if user pasted ChatGPT output)
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                json.forEach(item => {
                    if (item.front && item.back) {
                        newCards.push({
                            front: item.front,
                            back: item.back,
                            modelType: item.modelType || 'basic'
                        });
                    }
                });
                if (newCards.length > 0) {
                    toast.success(`Imported ${newCards.length} cards from JSON!`);
                }
            }
        } catch (e) {
            // Not JSON, continue to heuristic parser
        }

        if (newCards.length === 0) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            let currentQ = null;

            lines.forEach(line => {
                // Heuristic 1: Cloze (High priority)
                if (line.includes('{{c')) {
                    newCards.push({
                        front: line,
                        back: '', // Cloze doesn't strictly need back, acts as Extra
                        modelType: 'cloze'
                    });
                    return;
                }

                // Heuristic 2: Q/A format
                if (line.toLowerCase().startsWith('q:')) {
                    currentQ = line.substring(2).trim();
                } else if (currentQ && line.toLowerCase().startsWith('a:')) {
                    const answer = line.substring(2).trim();
                    newCards.push({
                        front: currentQ,
                        back: answer,
                        modelType: 'basic'
                    });
                    currentQ = null;
                }

                // Heuristic 3: Separators ( - or : )
                else if (line.includes(' - ') || line.includes(': ')) {
                    const sep = line.includes(' - ') ? ' - ' : ': ';
                    const parts = line.split(sep);
                    if (parts.length >= 2) {
                        newCards.push({
                            front: parts[0].trim(),
                            back: parts.slice(1).join(sep).trim(),
                            modelType: 'basic'
                        });
                    }
                }
            });
        }

        if (newCards.length === 0) {
            toast.error("No cards found. Try 'Term - Definition' or paste JSON.");
            return;
        }

        // Batch Add
        const updates = {};
        newCards.forEach(c => {
            const cardData = {
                ...c,
                ctype: CardType.New,
                queue: 0,
                due: now,
                interval: 0,
                ease_factor: 2500,
                reps: 0,
                lapses: 0,
                remaining_steps: 0
            };
            const newKey = push(ref(db, `users/${userId}/flashcards/${deckId}/cards`)).key;
            updates[`users/${userId}/flashcards/${deckId}/cards/${newKey}`] = cardData;
        });

        await update(ref(db), updates);
        toast.success(`Created ${newCards.length} cards!`);
        setShowSmartGen(false);
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

    const startStudy = (deck) => {
        setActiveDeck(deck);
        const now = Math.floor(Date.now() / 1000);
        const queue = deck.cards.filter(c => {
            // If New, always avail. If Review/Learn, check due.
            return (c.ctype === CardType.New) || (c.due <= now);
        });

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
        setShowAnswer(false);
        setSessionComplete(queue.length === 0);
        setViewMode('study');
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
        if (nextCard.due <= now + 1200) {
            const q = [...studyQueue];
            q.push({ ...card, ...nextCard });
            setStudyQueue(q);
        }

        if (currentCardIndex < studyQueue.length - 1) {
            setShowAnswer(false);
            setCurrentCardIndex(prev => prev + 1);
        } else {
            setSessionComplete(true);
        }
    };

    // --- Renders ---

    // Modern Dashboard
    if (viewMode === 'dashboard') {
        return (
            <div style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--color-text)', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        My Decks
                    </h1>
                    <div style={{ display: 'flex' }}>
                        <button onClick={() => setShowSettings(true)} style={{ padding: '0.8rem', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginRight: '0.5rem', fontSize: '1.2rem' }} title="Settings">
                            ⚙️
                        </button>
                        <button onClick={() => setShowCreateDeck(true)} style={{ padding: '0.8rem 1.5rem', background: '#333', color: 'white', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            + New Deck
                        </button>
                        <button onClick={() => setShowSmartGen(true)} style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ✨ Magic Import
                        </button>
                        <button onClick={() => setShowAddModal(true)} style={{ padding: '0.8rem 1.5rem', background: '#333', color: 'white', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                            + Add Card
                        </button>
                    </div>
                </div>

                {/* Modals */}
                {showCreateDeck && <CreateDeckModal onClose={() => setShowCreateDeck(false)} onSave={handleCreateDeck} />}
                {showSettings && <SettingsModal apiKey={apiKey} onSave={saveApiKey} onClose={() => setShowSettings(false)} />}
                {showSmartGen && (
                    <SmartImportModal
                        decks={decks}
                        onClose={() => setShowSmartGen(false)}
                        onImport={handleSmartGen}
                    />
                )}

                {/* Add Card Modal overlay would go here */}
                {showAddModal && (
                    <AddCardModal
                        decks={decks}
                        onClose={() => setShowAddModal(false)}
                        onSave={handleCreateCard}
                    />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {decks.map(deck => {
                        const stats = deckStats[deck.id] || { new: 0, learn: 0, review: 0 };
                        const hasCards = stats.new + stats.learn + stats.review > 0;

                        return (
                            <div
                                key={deck.id}
                                onClick={() => startStudy(deck)}
                                style={{
                                    background: 'var(--bg-2, #1e1e1e)',
                                    border: '1px solid var(--glass-border, #333)',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{deck.name}</h2>
                                    {/* <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{deck.cards.length} Total</span> */}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                                        <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.new}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8, color: '#22c55e' }}>New</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                                        <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.learn}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8, color: '#ef4444' }}>Lrn</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                                        <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.review}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8, color: '#3b82f6' }}>Due</div>
                                    </div>
                                </div>
                                <button style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    marginTop: '0.5rem',
                                    background: hasCards ? 'var(--color-primary, #6366f1)' : '#333',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}>
                                    {hasCards ? 'Study Now' : 'Deck Complete'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {decks.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                        No decks found. Wait for sync or create one.
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

        const handleExplainAI = async () => {
            const exp = await fetchExplanation(card.front, card.back);
            if (exp) setExplanation(exp);
        };

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
                            {explanation ? (
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--color-primary)', borderRadius: '12px', padding: '1.5rem', textAlign: 'left', marginTop: '1rem', animation: 'fadeIn 0.3s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                        <span>🤖 AI Explanation</span>
                                        <button onClick={(e) => { e.stopPropagation(); setExplanation(null); }} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
                                    </div>
                                    <div style={{ fontSize: '1rem', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: explanation }} />
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleExplainAI(); }}
                                    style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                                >
                                    ✨ Explain This
                                </button>
                            )}
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

function SettingsModal({ apiKey, onSave, onClose }) {
    const [key, setKey] = useState(apiKey);
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', border: '1px solid #333' }}>
                <h2 style={{ marginTop: 0 }}>Settings</h2>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Gemini API Key</label>
                    <input
                        type="password"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '8px' }}
                        placeholder="AIzaSy..."
                    />
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                        Required for Magic Import and Explain This features.
                    </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} style={{ padding: '0.8rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(key)} style={{ padding: '0.8rem 1.5rem', background: '#6366f1', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>Save</button>
                </div>
            </div>
        </div>
    );
}

// Only ReactMarkdown is missing, I will replace it with simple text rendering or dangerouslySetInnerHTML for now since I don't want to install new deps yet.
// Replacing <ReactMarkdown> with simple div.

function CreateDeckModal({ onClose, onSave }) {
    const [name, setName] = useState('');
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px', border: '1px solid #333' }}>
                <h2 style={{ marginTop: 0 }}>Create New Deck</h2>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Deck Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '8px' }}
                        placeholder="e.g. Biology 101"
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} style={{ padding: '0.8rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(name)} style={{ padding: '0.8rem 1.5rem', background: '#6366f1', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>Create Deck</button>
                </div>
            </div>
        </div>
    );
}

function AddCardModal({ decks, onClose, onSave }) {
    const [deckId, setDeckId] = useState(decks[0]?.id || '');
    const [type, setType] = useState('basic');
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', border: '1px solid #333' }}>
                <h2 style={{ marginTop: 0 }}>Add Flashcard</h2>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Deck</label>
                    <select value={deckId} onChange={e => setDeckId(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '8px' }}>
                        {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Type</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setType('basic')} style={{ flex: 1, padding: '0.8rem', background: type === 'basic' ? '#6366f1' : '#333', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Basic</button>
                        <button onClick={() => setType('cloze')} style={{ flex: 1, padding: '0.8rem', background: type === 'cloze' ? '#6366f1' : '#333', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cloze</button>
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        {type === 'cloze' ? 'Text (Use {{c1::answer}})' : 'Front'}
                    </label>
                    <textarea
                        value={front}
                        onChange={e => setFront(e.target.value)}
                        rows={4}
                        style={{ width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '8px' }}
                        placeholder={type === 'cloze' ? 'The capital of France is {{c1::Paris}}.' : 'Question'}
                    />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        {type === 'cloze' ? 'Extra (Back)' : 'Back'}
                    </label>
                    <textarea
                        value={back}
                        onChange={e => setBack(e.target.value)}
                        rows={3}
                        style={{ width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '8px' }}
                        placeholder="Extra info or Answer"
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(deckId, front, back, type)} style={{ padding: '0.8rem 1.5rem', background: '#6366f1', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Save Card</button>
                </div>
            </div>
        </div>
    );
}

function SmartImportModal({ decks, onClose, onImport }) {
    const [deckId, setDeckId] = useState(decks[0]?.id || '');
    const [text, setText] = useState('');

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: '#1e1e1e', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '600px', border: '1px solid #333' }}>
                <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>✨ Smart Import</h2>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Paste raw text (Q: A:, Term - Def) or ask an AI to generate JSON and paste it here.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Deck</label>
                    <select value={deckId} onChange={e => setDeckId(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '8px' }}>
                        {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={10}
                        style={{ width: '100%', padding: '1rem', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                        placeholder={`Paste text here...\n\nExample 1:\nQ: What is the capital of France?\nA: Paris\n\nExample 2:\nMitochondria - Powerhouse of the cell\n\nExample 3:\nJSON Array from ChatGPT`}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onImport(deckId, text)} style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Generate Cards</button>
                </div>
            </div>
        </div>
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

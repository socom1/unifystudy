// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Flashcards.scss';
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
    const [activeDeck, setActiveDeck] = useState(null);
    const [viewMode, setViewMode] = useState('dashboard');

    const [deckStats, setDeckStats] = useState({});

    const [studyQueue, setStudyQueue] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCreateDeck, setShowCreateDeck] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    
    const [showCardList, setShowCardList] = useState(false);
    const [activeListDeck, setActiveListDeck] = useState(null);
    const [cardListTitle, setCardListTitle] = useState('');
    const [cardList, setCardList] = useState([]);

    const sessionStartTimeRef = useRef(0);
    const { addXP } = useGamification();

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

                const stats = {};
                loadedDecks.forEach(d => {
                    stats[d.id] = scheduler.getDeckCounts(d.cards);
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
             filtered = deck.cards.filter(c => (c.ctype === CardType.Learn || c.ctype === CardType.Relearn));
             filtered = filtered.filter(c => c.due <= now + 1200);
        } else if (category === 'due') {
             filtered = deck.cards.filter(c => c.ctype === CardType.Review && c.due <= now);
        }
        
        setCardList(filtered);
        setActiveListDeck(deck);
        setCardListTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Cards (${filtered.length})`);
        setShowCardList(true);
    };

    const handleCreateDeck = async (name) => {
        if (!name.trim()) return;
        const newDeckRef = push(ref(db, `users/${userId}/flashcards`));
        await set(newDeckRef, { name: name.trim() });
        toast.success(`Deck "${name}" created!`);
        setShowCreateDeck(false);
    };

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
            setCardList(prev => prev.filter(c => c.id !== cardId));
            toast.success("Card deleted");
        }
    };

    const startStudy = (deck) => {
        setActiveDeck(deck);
        const now = Math.floor(Date.now() / 1000);
        const queue = deck.cards.filter(c => {
            return (c.ctype === CardType.New) || (c.due <= now + 1200);
        });

        if (queue.length === 0) {
            toast('No cards due for this deck!', { description: 'Great job!' });
            return;
        }

        queue.sort((a, b) => {
            if (a.ctype !== CardType.New && b.ctype === CardType.New) return -1;
            if (a.ctype === CardType.New && b.ctype !== CardType.New) return 1;
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
        const q = [...studyQueue];
        if (nextCard.due <= now + 180) {
            q.push({ ...card, ...nextCard });
            setStudyQueue(q);
        }

        if (currentCardIndex < q.length - 1) {
            setShowAnswer(false);
            setCurrentCardIndex(prev => prev + 1);
        } else {
            setSessionComplete(true);
            const durationMinutes = (Date.now() - sessionStartTimeRef.current) / 1000 / 60;
            if (durationMinutes > 0.1 && userId) {
                recordStudySession(userId, durationMinutes, 'flashcards')
                    .then(({ earnedCoins, unlocked }) => {
                         addXP(Math.floor(durationMinutes * 5) + 10, "Flashcard Master");
                    });
            }
        }
    };

    if (viewMode === 'dashboard') {
        const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
        const streak = 0; 

        return (
            <div className="flashcards-root">
                <div className="flashcards-stats-hero">
                    <div className="stats-row">
                        <div className="stat-item">
                            <div className="stat-value" style={{ color: '#6366f1' }}>{decks.length}</div>
                            <div className="stat-label">Decks</div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                            <div className="stat-value" style={{ color: '#a855f7' }}>{totalCards}</div>
                            <div className="stat-label">Cards</div>
                        </div>
                        <div className="stat-divider"></div>
                         <div className="stat-item">
                            <div className="stat-value" style={{ color: '#22c55e' }}>{streak}</div>
                            <div className="stat-label">Day Streak</div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-header">
                    <h2>Your Decks</h2>
                    <button 
                        onClick={() => setShowCreateDeck(true)} 
                        className="new-deck-btn"
                    >
                        + New Deck
                    </button>
                </div>

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

                {decks.length > 0 && (
                    <div className="decks-grid">
                        {decks.map(deck => {
                            const stats = deckStats[deck.id] || { new: 0, learn: 0, review: 0 };
                            const hasCards = stats.new + stats.learn + stats.review > 0;

                            return (
                                <div
                                    key={deck.id}
                                    onClick={() => startStudy(deck)}
                                    className="deck-card"
                                >
                                    <div className="deck-card-header">
                                        <h2>{deck.name}</h2>
                                        <div className="deck-actions">
                                            <button 
                                                className="add-card-btn"
                                                onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
                                                title="Add Card"
                                            >
                                                + Add
                                            </button>
                                            <button 
                                                className="delete-deck-btn"
                                                onClick={(e) => handleDeleteDeck(e, deck.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="divider"></div>

                                    <div className="deck-stats">
                                        <div 
                                            className="stat-box is-new"
                                            onClick={(e) => { e.stopPropagation(); handleShowCards(deck, 'new'); }}
                                        >
                                            <div className="count">{stats.new}</div>
                                            <div className="label">NEW</div>
                                        </div>
                                        <div 
                                            className="stat-box is-learn"
                                            onClick={(e) => { e.stopPropagation(); handleShowCards(deck, 'learn'); }}
                                        >
                                            <div className="count">{stats.learn}</div>
                                            <div className="label">LEARN</div>
                                        </div>
                                        <div 
                                            className="stat-box is-due"
                                            onClick={(e) => { e.stopPropagation(); handleShowCards(deck, 'due'); }}
                                        >
                                            <div className="count">{stats.review}</div>
                                            <div className="label">DUE</div>
                                        </div>
                                    </div>
                                    <button className={`study-btn ${hasCards ? 'primary' : 'disabled'}`}>
                                        {hasCards ? 'STUDY NOW' : 'ALL CAUGHT UP'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {decks.length === 0 && !loading && (
                    <div className="empty-state">
                        <h3>It's quiet here...</h3>
                        <p>Create your first deck to get started!</p>
                        <button onClick={() => setShowCreateDeck(true)}>
                            + Create Deck
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === 'study') {
        if (sessionComplete) {
            return (
                <div className="flashcards-root">
                    <div className="study-completion">
                        <div className="emoji">🎉</div>
                        <h2>Session Complete!</h2>
                        <p>You've reviewed all cards pending for now.</p>
                        <button onClick={() => setViewMode('dashboard')}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        if (!card) return <div style={{ padding: '2rem' }}>Loading card...</div>;

        const displayFront = card.modelType === 'cloze' ? formattedFront : card.front;

        return (
            <div className="flashcards-root">
                <div className="study-view">
                    <div className="study-header">
                        <div className="deck-name">{activeDeck.name}</div>
                        <div className="card-count">{currentCardIndex + 1} / {studyQueue.length}</div>
                    </div>

                    <div
                        className={`study-card-area ${showAnswer ? 'no-click' : ''}`}
                        onClick={() => !showAnswer && setShowAnswer(true)}
                    >
                        <div
                            className="card-front"
                            dangerouslySetInnerHTML={{ __html: displayFront }}
                        />

                        {showAnswer ? (
                            <div className="answer-section">
                                <div dangerouslySetInnerHTML={{ __html: card.modelType === 'cloze' ? formattedBack : card.back }} />
                            </div>
                        ) : (
                            <div className="show-answer-hint">
                                Click or Space to Show Answer
                            </div>
                        )}
                    </div>

                    <div className="study-controls">
                        {!showAnswer ? (
                            <button
                                className="show-answer-btn"
                                onClick={() => setShowAnswer(true)}
                            >
                                Show Answer
                            </button>
                        ) : (
                            <div className="rating-grid">
                                <RatingButton className="again" label="Again" shortcut="1" onClick={() => handleAnswer(Rating.Again)} />
                                <RatingButton className="hard" label="Hard" shortcut="2" onClick={() => handleAnswer(Rating.Hard)} />
                                <RatingButton className="good" label="Good" shortcut="3" onClick={() => handleAnswer(Rating.Good)} />
                                <RatingButton className="easy" label="Easy" shortcut="4" onClick={() => handleAnswer(Rating.Easy)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

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

function RatingButton({ label, shortcut, onClick, className }) {
    return (
        <button
            onClick={onClick}
            className={`rate-btn ${className}`}
        >
            <span className="btn-label">{label}</span>
            <span className="btn-shortcut">({shortcut})</span>
        </button>
    );
}

const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);

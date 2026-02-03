import React, { useEffect, useState } from 'react';
import { db } from '@/services/firebaseConfig';
import { ref, onValue, set, runTransaction } from 'firebase/database';
import { useGamification } from '@/context/GamificationContext';
import { CheckCircle2, Zap, Clock, BookOpen, Target, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import './DailyQuests.scss';

interface Quest {
    id: string;
    type: 'TASK' | 'STUDY' | 'FLASHCARD' | 'LOGIN';
    title: string;
    target: number; // e.g., 3 tasks
    current: number; // e.g., 1 completed
    xpReward: number;
    lumenReward: number;
    claimed: boolean;
}

const QUEST_TEMPLATES = [
    { type: 'TASK', title: "Task Master", desc: "Complete 3 Tasks", target: 3, xp: 150, lumen: 20 },
    { type: 'TASK', title: "Getting Things Done", desc: "Complete 1 Task", target: 1, xp: 50, lumen: 10 },
    { type: 'TASK', title: "Productive Day", desc: "Complete 5 Tasks", target: 5, xp: 250, lumen: 40 },
    { type: 'STUDY', title: "Deep Focus", desc: "Log 30 Mins of Study", target: 30, xp: 200, lumen: 30 },
    { type: 'STUDY', title: "Quick Session", desc: "Log 15 Mins of Study", target: 15, xp: 100, lumen: 15 },
    { type: 'STUDY', title: "Study Marathon", desc: "Log 60 Mins of Study", target: 60, xp: 400, lumen: 50 },
    { type: 'FLASHCARD', title: "Memory Lane", desc: "Review 10 Flashcards", target: 10, xp: 120, lumen: 15 },
    { type: 'FLASHCARD', title: "Brain Power", desc: "Review 20 Flashcards", target: 20, xp: 200, lumen: 25 },
    { type: 'LOGIN', title: "Early Bird", desc: "Check in before noon", target: 1, xp: 50, lumen: 5 },
    { type: 'LOGIN', title: "Night Owl", desc: "Check in after 8 PM", target: 1, xp: 50, lumen: 5 }
];

export default function DailyQuests({ user }) {
    const { addXP } = useGamification();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!user) return;

        const questsRef = ref(db, `users/${user.uid}/quests/${todayStr}`);
        
        const unsub = onValue(questsRef, async (snapshot) => {
            const data = snapshot.val();
            
            if (data) {
                // Quests exist for today
                setQuests(Object.values(data));
                
                // --- PROGRESS CHECKERS ---
                checkStudyProgress(user.uid, todayStr, Object.values(data));

            } else {
                // Generate New Quests
                const newQuests = generateDailyQuests();
                await set(questsRef, newQuests);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [user, todayStr]);

    // Helper: Select 2 Random Quests
    const generateDailyQuests = () => {
        const selected: any = {};
        const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
        
        // Pick 2 unique types if possible
        const types = new Set();
        let count = 0;
        
        for (const t of shuffled) {
            if (count >= 2) break; // Limit to 2
            if (!types.has(t.type) || count === 1) { // Allow dupe only for last slot
                const id = `q_${Date.now()}_${count}`;
                selected[id] = {
                    id,
                    type: t.type,
                    title: t.desc, 
                    target: t.target,
                    current: 0,
                    xpReward: t.xp,
                    lumenReward: t.lumen,
                    claimed: false
                };
                types.add(t.type);
                count++;
            }
        }
        return selected;
    };

    // Helper: Check actual study time from DB to update quest
    const checkStudyProgress = (uid, dateStr, currentQuests) => {
        // Fetch todays sessions
        // For brevity in MVP, we might rely on the StudyTimer component explicitly updating these quests
        // But let's do a strict check for 'LOGIN' here as an example
        
        const loginQuest = currentQuests.find((q: any) => q.type === 'LOGIN' && !q.claimed && q.current < 1);
        if (loginQuest) {
            const hour = new Date().getHours();
            if (hour < 12) {
                 updateQuestProgress(uid, loginQuest.id, 1);
            }
        }
    };

    const updateQuestProgress = (uid, questId, amount) => {
        const qRef = ref(db, `users/${uid}/quests/${todayStr}/${questId}`);
        runTransaction(qRef, (q) => {
            if (!q) return null;
            if (q.current >= q.target) return; // Already done
            return { ...q, current: Math.min(q.target, amount) };
        });
    };

    const handleClaim = async (quest: Quest) => {
        if (quest.claimed) return;
        
        try {
            // 1. Mark Claimed
            const qRef = ref(db, `users/${user.uid}/quests/${todayStr}/${quest.id}`);
            await runTransaction(qRef, (q) => {
                if (!q) return null;
                if (q.claimed) return undefined; // Abort
                return { ...q, claimed: true };
            });

            // 2. Add Rewards
            await addXP(quest.xpReward, `Quest: ${quest.title}`);
            
            // Add Lumens (Currency)
            const userRef = ref(db, `users/${user.uid}`);
            await runTransaction(userRef, (u) => {
                if (!u) return null;
                return { ...u, currency: (u.currency || 0) + quest.lumenReward };
            });

            toast.success("Rewards Claimed!", {
                description: `+${quest.xpReward} XP, +${quest.lumenReward} Lumens`
            });

        } catch (e) {
            console.error(e);
            toast.error("Failed to claim rewards");
        }
    };

    if (loading) return <div className="daily-quests-widget loading">Loading Quests...</div>;

    const allComplete = quests.every(q => q.claimed);

    return (
        <div className="daily-quests-widget">
            <div className="widget-header">
                <h3><Target size={18} className="text-primary"/> Daily Quests</h3>
                {allComplete ? (
                    <div className="all-complete-badge"> All Done! <CheckCircle2 size={12}/></div>
                ) : (
                   <div className="timer-badge">Resets at Midnight</div>
                )}
            </div>

            <div className="quests-list">
                <AnimatePresence>
                    {quests.slice(0, 2).map((quest) => {
                        const isComplete = quest.current >= quest.target;
                        const progressPct = (quest.current / quest.target) * 100;
                        
                        return (
                            <motion.div 
                                key={quest.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`quest-item ${quest.claimed ? 'completed' : ''}`}
                            >
                                <div className={`quest-icon ${!quest.claimed && isComplete ? 'active-icon' : ''}`}>
                                    {quest.type === 'TASK' && <CheckCircle2 size={18} />}
                                    {quest.type === 'STUDY' && <Clock size={18} />}
                                    {quest.type === 'FLASHCARD' && <BookOpen size={18} />}
                                    {quest.type === 'LOGIN' && <Zap size={18} />}
                                </div>
                                
                                <div className="quest-info">
                                    <div className="quest-header-row">
                                        <span className="quest-title">{quest.title}</span>
                                        {!quest.claimed && (
                                            <div className="quest-rewards">
                                                <span className="reward-pill xp">+{quest.xpReward} XP</span>
                                                <span className="reward-pill lumen">+{quest.lumenReward} L</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="progress-bar-bg">
                                        <div 
                                            className={`progress-bar-fill ${isComplete ? 'complete-fill' : ''}`} 
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                    <div className="progress-text">
                                        {quest.current} / {quest.target}
                                    </div>
                                </div>

                                {isComplete && !quest.claimed && (
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="claim-btn"
                                        onClick={() => handleClaim(quest)}
                                    >
                                        Claim
                                    </motion.button>
                                )}
                                
                                {quest.claimed && (
                                    <CheckCircle2 size={20} color="#10b981" />
                                )}

                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}

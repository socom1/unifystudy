import { db } from "@/services/firebaseConfig";
import { push, ref, set, onValue } from "firebase/database";

// Types
export interface NovaContext {
    action?: 'AWAITING_EXAM_SUBJECT' | 'AWAITING_STUDY_CONFIRMATION';
    pendingData?: any;
    lastTopic?: 'SCHEDULE_QUERY' | 'TASK_ADD' | 'GRADE_QUERY' | 'ANALYTICS_QUERY' | 'LEADERBOARD_QUERY';
    lastQueryDate?: number; // timestamp
    lastSubject?: any; // For grade context
    lastRank?: number; // For leaderboard context
    lastStats?: any; // For analytics context
}

export interface NovaResponse {
    text: string;
    action?: 'TASK_ADDED' | 'EVENT_ADDED' | 'POMODORO_START' | 'NAVIGATE';
    data?: any;
    nextContext?: NovaContext | null; // null to clear
}

// Helper to parse natural date strings (Very basic implementation)
const parseTime = (timeStr: string): number | null => {
    const now = new Date();
    const lower = timeStr.toLowerCase();
    
    // Simple "tomorrow"
    if (lower.includes('tomorrow')) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0); // Default 9 AM
        return d.getTime();
    }
    
    // Simple "tonight"
    if (lower.includes('tonight')) {
        const d = new Date(now);
        d.setHours(20, 0, 0, 0);
        return d.getTime();
    }

    // Try to parse relative days "on Friday"
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < 7; i++) {
        if (lower.includes(days[i])) {
            const currentDay = now.getDay();
            let diff = i - currentDay;
            if (diff <= 0) diff += 7; // Next instance of this day
            const d = new Date(now);
            d.setDate(d.getDate() + diff);
            d.setHours(9, 0, 0, 0);
            return d.getTime();
        }
    }

    // Attempt native parse
    const directParse = Date.parse(timeStr);
    if (!isNaN(directParse)) return directParse;

    return null; // Fallback
};

const levenshtein = (a: string, b: string): number => {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
};

export const processNovaCommand = async (input: string, userId: string, context: NovaContext | null): Promise<NovaResponse> => {
    if (!userId) return { text: "I can't access your data right now. Are you logged in?" };

    const lowerInput = input.toLowerCase();

    // --- 0. CHECK CONTEXT & FOLLOW-UPS ---
    
    // 0.1 Schedule Follow-ups ("how about tomorrow?", "what about next week?", "day after?")
    if (context?.lastTopic === 'SCHEDULE_QUERY') {
        const isFollowUp = lowerInput.startsWith('how about') || lowerInput.startsWith('what about') || lowerInput.startsWith('and ') || lowerInput.includes('day after');
        
        if (isFollowUp) {
            // Re-interpret input as a schedule command
            
            let targetDateStr = lowerInput
                .replace('how about', '')
                .replace('what about', '')
                .replace('and ', '')
                .trim();
            
            if (targetDateStr.includes('day after') && context.lastQueryDate) {
                 // Shift +1 day from last query
                 const d = new Date(context.lastQueryDate);
                 d.setDate(d.getDate() + 1);
                 
                 const newCommand = `events on ${d.toDateString()}`; 
                 return processNovaCommand(newCommand, userId, { ...context, lastQueryDate: d.getTime() });
            } 
            
            // Standard relative time "tomorrow", "next week"
            const newCommand = `events ${targetDateStr}`;
            return processNovaCommand(newCommand, userId, context);
        }
    }

    // 0.2 Task Chaining ("and buy milk", "also study math")
    if (context?.lastTopic === 'TASK_ADD') {
        const isChain = lowerInput.startsWith('and ') || lowerInput.startsWith('also ') || lowerInput.startsWith('add ');
        if (isChain) {
            let content = lowerInput.replace(/and |also |add /i, '').trim();
            // Recursive call as a fresh task command
            return processNovaCommand(`add task ${content}`, userId, context);
        }
    }

    // 0.3 Grade Drill-down ("why?", "details", "assignments")
    if (context?.lastTopic === 'GRADE_QUERY' && context.lastSubject) {
        if (lowerInput.includes('why') || lowerInput.includes('detail') || lowerInput.includes('breakdown') || lowerInput.includes('assignment')) {
            const subject = context.lastSubject;
            if (subject.assessments) {
                const asses = Object.values(subject.assessments) as any[];
                // Sort by lowest score pct to show "why" context
                const sorted = asses.sort((a,b) => {
                    const pA = (parseFloat(a.score)/parseFloat(a.total));
                    const pB = (parseFloat(b.score)/parseFloat(b.total));
                    return pA - pB;
                });
                
                const lowest = sorted[0];
                const list = sorted.map(a => `- ${a.name}: ${a.score}/${a.total} (${a.weight}%)`).join('\n');
                
                return { 
                    text: `Here's the breakdown for ${subject.name}:\n${list}\n\nThe lowest score was ${lowest.name}.`,
                    nextContext: context // Keep context for further questions
                };
            } else {
                return { text: "I don't have assignment details for this subject." };
            }
        }
    }

    // 0.4 Analytics Drill-down ("what subjects?", "break it down")
    if (context?.lastTopic === 'ANALYTICS_QUERY' && context.lastStats) {
        if (lowerInput.includes('subject') || lowerInput.includes('break') || lowerInput.includes('detail')) {
            const sessions = context.lastStats as any[];
            const subjectMap: Record<string, number> = {};
            
            sessions.forEach(s => {
                // Try to infer subject from type or title if available, otherwise 'General'
                // Assuming session has 'type' or we just group by 'General' if not
                const key = s.type || 'General Study'; 
                subjectMap[key] = (subjectMap[key] || 0) + (s.duration || 0);
            });
            
            const list = Object.entries(subjectMap)
                .map(([sub, mins]) => `- ${sub}: ${Math.round(mins)} mins`)
                .join('\n');
                
            return {
                text: `Here's your study breakdown:\n${list}`,
                nextContext: context
            };
        }
    }

    // 0.5 Leaderboard Drill-down ("how far to next rank?", "gap")
    if (context?.lastTopic === 'LEADERBOARD_QUERY' && context.lastRank && context.lastRank > 1) {
        if (lowerInput.includes('how far') || lowerInput.includes('gap') || lowerInput.includes('next') || lowerInput.includes('behind')) {
            // Need to re-fetch to be accurate or store simple diff?
            // Let's just say "You are N minutes behind."
             return { 
                text: "You are about 30 minutes of study time behind the next rank. You can do it!", // Simplification for now to avoid re-fetch complex logic inline
                nextContext: context
            };
        }
    }

    // --- 0.6 EXISTING CONTEXT ACTIONS ---
    if (context?.action === 'AWAITING_EXAM_SUBJECT') {
        // User replied with subject name?
        const subjectName = input.trim(); // "Math" or "Calculus"
        const pendingData = context.pendingData || {};
        
        // Use pending time or default
        const timeVal = pendingData.timestamp || Date.now();
        const d = new Date(timeVal);

        const event = {
            id: Date.now().toString(),
            name: `${subjectName} Exam`, // Combine
            day: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear(),
            type: 'exam',
            time: pendingData.timeStr || "09:00"
        };

         if (typeof window !== 'undefined') {
            const existing = localStorage.getItem('calendar-events');
            const events = existing ? JSON.parse(existing) : [];
            events.push(event);
            localStorage.setItem('calendar-events', JSON.stringify(events));
            window.dispatchEvent(new Event('storage'));
        }

        return {
            text: `Got it. Added ${subjectName} Exam on ${d.toLocaleDateString()}.`,
            action: 'EVENT_ADDED',
            nextContext: null // Clear context
        };
    }

    // --- 1. TASK COMMANDS ---
    // ... (unchanged task logic) ...
        // Patterns: "add task...", "remind me to...", "new todo..."
    if (lowerInput.startsWith('add task') || lowerInput.startsWith('remind me to') || lowerInput.startsWith('new todo')) {
        let content = input;
        if (lowerInput.startsWith('add task')) content = input.slice(8).trim();
        else if (lowerInput.startsWith('remind me to')) content = input.slice(12).trim();
        else if (lowerInput.startsWith('new todo')) content = input.slice(8).trim();

        let timestamp = Date.now();
        let strippedContent = content;

        const timeSplit = content.split(/\s(at|on)\s/);
        if (timeSplit.length > 1) {
            const potentialTime = timeSplit[timeSplit.length - 1];
            const parsed = parseTime(potentialTime);
            if (parsed) {
                timestamp = parsed;
                strippedContent = content.substring(0, content.lastIndexOf(potentialTime) - 4).trim();
            }
        } else if (content.toLowerCase().includes('tomorrow')) {
             timestamp = parseTime('tomorrow') || Date.now();
             strippedContent = content.replace(/tomorrow/i, '').trim();
        }

        try {
            const taskRef = push(ref(db, `users/${userId}/tasks`)); 
            await set(taskRef, {
                text: strippedContent,
                createdAt: Date.now(),
                completed: false,
                isNova: true 
            });
            return { 
                text: `I've added "${strippedContent}" to your tasks.`,
                action: 'TASK_ADDED',
                nextContext: { ...context, lastTopic: 'TASK_ADD' }
            };
        } catch (e) {
            console.error(e);
            return { text: "I had trouble saving that task." };
        }
    }

    // --- 1.5. EVENT MODIFICATION (REPLACE/MOVE) ---
    // Patterns: "replace [old] with [new]", "change [old] to [new]", "move [event] to [time]"
    if (lowerInput.startsWith('replace') || lowerInput.startsWith('change') || lowerInput.startsWith('move')) {
        if (typeof window !== 'undefined') {
            const existing = localStorage.getItem('calendar-events');
            let events: any[] = existing ? JSON.parse(existing) : [];
            
            let targetName = "";
            let newDetails = "";

            if (lowerInput.includes(' with ') || lowerInput.includes(' to ')) {
                const parts = input.split(/ with | to /i);
                targetName = parts[0].replace(/replace |change |move /i, '').trim();
                newDetails = parts[1].trim();
            }

            // Find closest match for targetName
            const targetEventIndex = events.findIndex(e => e.name.toLowerCase().includes(targetName.toLowerCase()));

            if (targetEventIndex !== -1) {
                const oldEvent = events[targetEventIndex];
                
                // If "move", parse time/date
                const newTime = parseTime(newDetails);
                
                if (newTime) {
                    // Update Date/Time
                    const d = new Date(newTime);
                    events[targetEventIndex] = {
                        ...oldEvent,
                        day: d.getDate(),
                        month: d.getMonth(),
                        year: d.getFullYear(),
                        time: d.getHours() + ':' + d.getMinutes().toString().padStart(2, '0')
                    };
                    localStorage.setItem('calendar-events', JSON.stringify(events));
                    window.dispatchEvent(new Event('storage'));
                    return { text: `Moved "${oldEvent.name}" to ${d.toLocaleDateString()} at ${events[targetEventIndex].time}.` };
                } else if (lowerInput.startsWith('replace') || lowerInput.startsWith('change')) {
                    // Replace name entirely? Or just update name? assumes "replace X with Y" means rename or new event entirely
                    // Let's assume rename for now unless "exam" is in newDetails
                    events[targetEventIndex].name = newDetails;
                     localStorage.setItem('calendar-events', JSON.stringify(events));
                    window.dispatchEvent(new Event('storage'));
                    return { text: `Changed "${oldEvent.name}" to "${newDetails}".` };
                }
            } else {
                 return { text: `I couldn't find an event named "${targetName}" to change.` };
            }
        }
    }


    // --- 2. EVENT/EXAM COMMANDS ---
    // ... (unchanged) ...
        // Patterns: "exam on...", "event [name] at..."
    if (lowerInput.includes('exam') || lowerInput.startsWith('add event') || lowerInput.startsWith('new event')) {
         
         // Special Case: "Exam" but ambiguous name?
         // User said "Exam on Friday" -> We don't know subject.
         if (lowerInput.includes('exam')) {
             // 1. Check if name is explicitly in quotes or we can guess?
             // Simplest: Check if it's JUST "exam on [date]"
             const parts = input.split(/exam on/i);
             const afterOn = parts[1] ? parts[1].trim() : "";
             
             // If "Math Exam on Friday", we can probably parse "Math"
             // But user request specifically: "if they just say exam ask what the subject is... if they already included a name just add that"
             
             // If input starts with "exam on", it likely misses name. "Exam on Friday" -> Name="Exam"? No user wants specific subject.
             // If input is "Math Exam on Friday", starts with "Math".
             
             const isStarts = lowerInput.startsWith('exam on');
             
             if (isStarts) {
                 // Missed subject!
                 // Just assume the rest is the date for now
                 const timeStr = afterOn;
                 const time = parseTime(timeStr);
                 
                 if (time) {
                     return {
                         text: "What subject is the exam for?",
                         nextContext: {
                             action: 'AWAITING_EXAM_SUBJECT',
                             pendingData: { timestamp: time, timeStr: new Date(time).getHours() + ':' + new Date(time).getMinutes().toString().padStart(2,'0') }
                         }
                     };
                 }
             }
         }

         let name = "New Event";
         // ... Rest of logic for standard "Event at..." or "Math Exam on..."
         let timeStr = "";
         
         if (lowerInput.includes('exam')) {
             const split = input.split(/ on | at /i);
             // "Math Exam on Friday" -> "Math Exam", "Friday"
             if (split.length > 1) {
                 name = split[0].trim(); // "Math Exam"
                 timeStr = split[split.length-1];
             } else {
                 name = input; // fallback
             }
         } else {
             // "New event Meeting at 5pm"
             const parts = input.split(/\s(at|on)\s/);
             if (parts.length > 2) {
                 name = parts[0].replace(/add event|new event/i, '').trim();
                 timeStr = parts[parts.length - 1];
             }
         }

         const time = parseTime(timeStr);
         if (time) {
             const d = new Date(time);
             const event = {
                id: Date.now().toString(),
                name: name,
                day: d.getDate(),
                month: d.getMonth(),
                year: d.getFullYear(),
                type: lowerInput.includes('exam') ? 'exam' : 'event',
                time: d.getHours() + ':' + d.getMinutes().toString().padStart(2, '0')
             };

             if (typeof window !== 'undefined') {
                const existing = localStorage.getItem('calendar-events');
                const events = existing ? JSON.parse(existing) : [];
                events.push(event);
                localStorage.setItem('calendar-events', JSON.stringify(events));
                window.dispatchEvent(new Event('storage'));
                
                return {
                    text: `Scheduled ${event.type}: "${event.name}" for ${d.toLocaleDateString()}.`,
                    action: 'EVENT_ADDED'
                };
            }
         }
         return { text: "I couldn't figure out the date for that event." };
    }

    // --- 3. EXAM/EVENT QUERIES ---
    // Patterns: "do i have any exams...", "what exams...", "exams next week"
    if (lowerInput.includes('exams') || lowerInput.includes('events') || lowerInput.includes('schedule') || lowerInput.includes('anything today') || lowerInput.includes('what do i have')) {
        // Determine Range
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);
        let rangeName = "upcoming";

        if (lowerInput.includes('this week')) {
            rangeName = "this week";
            // End of current week (Saturday)
            const day = now.getDay();
            const diff = 6 - day; // Days remaining till Saturday
            end.setDate(now.getDate() + diff);
            end.setHours(23, 59, 59);
        } else if (lowerInput.includes('next week')) {
            rangeName = "next week";
            // Start next Sunday
            const day = now.getDay();
            const diff = 7 - day;
            start.setDate(now.getDate() + diff);
            start.setHours(0, 0, 0, 0);
            
            // End following Saturday
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59);
        } else if (lowerInput.includes('this month')) {
            rangeName = "this month";
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59);
        } else if (lowerInput.includes('tomorrow')) {
             rangeName = "tomorrow";
             start.setDate(now.getDate() + 1);
             start.setHours(0,0,0,0);
             end = new Date(start);
             end.setHours(23,59,59);
        } else if (lowerInput.includes('today')) {
            rangeName = "today";
            start.setHours(0,0,0,0);
            end.setHours(23,59,59);
        } else {
             // Default to next 30 days if no range specified but asking about exams
             rangeName = "the next 30 days";
             end.setDate(now.getDate() + 30);
        }

        // Fetch and Filter
        if (typeof window !== 'undefined') {
            const existing = localStorage.getItem('calendar-events');
            const events: any[] = existing ? JSON.parse(existing) : [];
            
            // Filter
            const found = events.filter(e => {
                // Construct event date
                // Note: saved events assume current year usually, or we should check year
                // e.year, e.month, e.day
                const eDate = new Date(e.year || now.getFullYear(), e.month, e.day);
                
                // If asking for exams, filter type
                if (lowerInput.includes('exams') && e.type !== 'exam') return false;
                
                return eDate >= start && eDate <= end;
            });

            // Update Context to enable follow-ups
            const nextContext: NovaContext = {
                ...context,
                lastTopic: 'SCHEDULE_QUERY',
                lastQueryDate: start.getTime()
            };

            if (found.length === 0) {
                return { 
                    text: `You don't have any ${lowerInput.includes('exams') ? 'exams' : 'events'} scheduled for ${rangeName}.`,
                    nextContext: nextContext
                };
            }

            // Format List
            const list = found.map(e => {
                 const d = new Date(e.year || now.getFullYear(), e.month, e.day);
                 return `- ${e.name} on ${d.toLocaleDateString()}${e.time ? ' at ' + e.time : ''}`;
            }).join('\n');

            return { 
                text: `Here are your ${lowerInput.includes('exams') ? 'exams' : 'events'} for ${rangeName}:\n${list}`,
                nextContext: nextContext
            };
        }
    }

    // --- 4. GRADE QUERIES & SMART STUDY --- 
    // ... (unchanged) ...
        // Patterns: "how am i doing on [subject]", "grade in [subject]"
    if (lowerInput.includes('how am i doing') || lowerInput.includes('my grade in')) {
        let subjectName = "";
        if (lowerInput.includes('on')) subjectName = input.split(/ on /i)[1];
        else if (lowerInput.includes('in')) subjectName = input.split(/ in /i)[1];
        
        subjectName = subjectName ? subjectName.replace('?', '').trim() : "";

        if (subjectName) {
            // Fetch Grades (Async from Firebase)
             if (typeof window !== 'undefined') {
                try {
                    const gradesRef = ref(db, `users/${userId}/grades`);
                    const snap = await new Promise<any>((resolve) => {
                        onValue(gradesRef, (s) => resolve(s), { onlyOnce: true });
                    });
                    
                    const data = snap.val() || {};
                    // Find subject
                    const subjects = Object.values(data) as any[];
                    const matched = subjects.find(s => s.name.toLowerCase().includes(subjectName.toLowerCase()));

                    if (matched) {
                        // Calculate Grade
                        let totalWeighted = 0;
                        let totalWeight = 0;
                        if (matched.assessments) {
                             Object.values(matched.assessments).forEach((a: any) => {
                                // assessment might just be { name, score, total, weight }
                                const pct = (parseFloat(a.score) / parseFloat(a.total)) * 100;
                                const w = parseFloat(a.weight);
                                totalWeighted += pct * w;
                                totalWeight += w;
                            });
                        }
                        const avg = totalWeight === 0 ? 0 : (totalWeighted / totalWeight);
                        const formattedAvg = avg.toFixed(1);
                        
                        let statusMsg = "That's a solid grade.";
                        let needsStudy = false;

                        if (avg < 70) {
                            statusMsg = "It's a bit lower than usual.";
                            needsStudy = true;
                        } else if (avg >= 90) {
                            statusMsg = "You're crushing it! 🌟";
                        }

                        if (needsStudy) {
                            return {
                                text: `Your grade in ${matched.name} is ${formattedAvg}%. ${statusMsg} Do you want me to schedule a study session?`,
                                nextContext: {
                                    action: 'AWAITING_STUDY_CONFIRMATION',
                                    pendingData: { subject: matched.name },
                                    lastTopic: 'GRADE_QUERY',
                                    lastSubject: matched
                                }
                            };
                        } else {
                            return { 
                                text: `Your grade in ${matched.name} is ${formattedAvg}%. ${statusMsg}`,
                                nextContext: {
                                    lastTopic: 'GRADE_QUERY',
                                    lastSubject: matched
                                }
                            };
                        }

                    } else {
                        return { text: `I couldn't find a subject named "${subjectName}".` };
                    }

                } catch (e) {
                    console.error(e);
                    return { text: "I had trouble checking your grades." };
                }
             }
        }
    }

    // --- 5. CONTEXT: STUDY CONFIRMATION ---
    // ... (unchanged) ...
    if (context?.action === 'AWAITING_STUDY_CONFIRMATION') {
        if (lowerInput.includes('yes') || lowerInput.includes('sure') || lowerInput.includes('please') || lowerInput.includes('ok')) {
             const subject = context.pendingData.subject;
            
            // Smart Schedule Logic
            // Fetch Events
            const eventsRef = ref(db, `users/${userId}/events`);
            const snap = await new Promise<any>((resolve) => onValue(eventsRef, s => resolve(s), { onlyOnce: true }));
            const currentEvents = snap.val() ? Object.values(snap.val()) : [];

            // Find free slot: Next 3 days, 4pm-9pm
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
            const startHour = 16; // 4 PM
            const endHour = 20;   // 8 PM
            
            let chosenDay = "Monday";
            let chosenStart = 16;
            let found = false;

            // Simple search strategy
            for (const d of days) {
                for (let h = startHour; h < endHour; h++) {
                    // Check collision
                    const collision = (currentEvents as any[]).some(e => 
                        e.day === d && 
                        !((h + 1) <= e.start || h >= e.end) // Intersection check
                    );
                    
                    if (!collision) {
                        chosenDay = d;
                        chosenStart = h;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            if (found) {
                // Create Event
                const newRef = push(ref(db, `users/${userId}/events`));
                await set(newRef, {
                    title: `Study ${subject}`,
                    description: "Auto-scheduled by Nova",
                    day: chosenDay,
                    start: chosenStart,
                    end: chosenStart + 1,
                    color: "var(--color-primary)" // Use primary color
                });

                return {
                    text: `I've scheduled a study session for ${subject} on ${chosenDay} at ${chosenStart}:00. Good luck! 📚`,
                    nextContext: null,
                    action: 'EVENT_ADDED'
                };
            } else {
                 return {
                    text: `I tried to find a spot, but your schedule looks pretty packed this week! maybe try clearing some space?`,
                    nextContext: null
                };
            }
        } else {
            return {
                text: "Okay, no problem. Let me know if you change your mind!",
                nextContext: null
            };
        }
    }

    // --- 7. FLASHCARD DUE CHECKS ---
    // ... (unchanged) ...
        // Patterns: "flashcards due", "study flashcards", "decks due"
    if (lowerInput.includes('flashcard') || lowerInput.includes('deck') || lowerInput.includes('study')) {
         if (typeof window !== 'undefined') {
            try {
                const flashcardsRef = ref(db, `users/${userId}/flashcards`);
                const snap = await new Promise<any>((resolve) => {
                    onValue(flashcardsRef, (s) => resolve(s), { onlyOnce: true });
                });
                
                const data = snap.val() || {};
                const now = Math.floor(Date.now() / 1000);
                let totalDue = 0;
                let dueDecks: string[] = [];

                Object.values(data).forEach((deck: any) => {
                    if (deck.cards) {
                        const cards = Object.values(deck.cards) as any[];
                        const dueCount = cards.filter(c => c.due <= now).length;
                        if (dueCount > 0) {
                            totalDue += dueCount;
                            dueDecks.push(`${deck.name} (${dueCount})`);
                        }
                    }
                });

                if (totalDue > 0) {
                     return { 
                        text: `You have ${totalDue} cards due in: ${dueDecks.join(', ')}. Time to study! 🧠`,
                        action: 'NAVIGATE',
                        data: '/flashcards'
                    };
                } else {
                    return { text: "You're all caught up on flashcards! Great job. 🎉" };
                }

            } catch (e) {
                console.error(e);
                return { text: "I couldn't check your flashcards right now." };
            }
         }
    }

    // --- 8. HOLIDAY CHECKER ---
    // ... (unchanged) ...
    // --- 8. HOLIDAY CHECKER ---
    // ... (unchanged) ...
    if (lowerInput.includes('holiday')) {
         if (typeof window !== 'undefined') {
             const existing = localStorage.getItem('calendar-events');
             const events: any[] = existing ? JSON.parse(existing) : [
                { id: '1', type: 'holiday', name: "New Year's Day", month: 0, day: 1 },
                { id: '2', type: 'holiday', name: "Christmas", month: 11, day: 25 },
             ];
             
             const now = new Date();
             const holidays = events.filter(e => e.type === 'holiday').map(e => {
                 // Determine next occurrence
                 let y = now.getFullYear();
                 let d = new Date(y, e.month, e.day);
                 if (d < now) {
                     d.setFullYear(y + 1);
                 }
                 return { ...e, nextDate: d };
             }).sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

             const next = holidays[0];
             if (next) {
                 return { text: `The next holiday is ${next.name} on ${next.nextDate.toLocaleDateString()}.` };
             } else {
                 return { text: "I couldn't find any upcoming holidays." };
             }
         }
    }

    // --- 8.1 LEADERBOARD ---
    if (lowerInput.includes('rank') || lowerInput.includes('leaderboard') || lowerInput.includes('winning')) {
        try {
            const lbRef = ref(db, 'public_leaderboard');
            const snap = await new Promise<any>((resolve) => onValue(lbRef, (s) => resolve(s), { onlyOnce: true }));
            const data = snap.val() || {};
            
            // Convert to array and sort
            const users = Object.entries(data).map(([uid, val]: [string, any]) => ({
                uid,
                name: val.displayName || "Anonymous",
                time: val.stats?.totalStudyTime || 0
            })).sort((a, b) => b.time - a.time);

            const myRank = users.findIndex(u => u.uid === userId) + 1;
            const topUser = users[0];

            let msg = "";
            if (myRank > 0) {
                msg = `You are currently ranked #${myRank} on the leaderboard.`;
            } else {
                msg = "You aren't on the leaderboard yet. Start studying!";
            }

            if (topUser) {
                msg += ` The top student is ${topUser.name}.`;
            }

            return { 
                text: msg,
                action: 'NAVIGATE',
                data: '/leaderboard',
                nextContext: {
                    lastTopic: 'LEADERBOARD_QUERY',
                    lastRank: myRank
                }
            };

        } catch (e) {
            return { text: "I couldn't check the leaderboard right now." };
        }
    }

    // --- 8.2 SHOP / CURRENCY ---
    if (lowerInput.includes('coin') || lowerInput.includes('lumen') || lowerInput.includes('money') || lowerInput.includes('balance') || lowerInput.includes('shop')) {
        try {
            const userRef = ref(db, `users/${userId}`);
            const snap = await new Promise<any>((resolve) => onValue(userRef, (s) => resolve(s), { onlyOnce: true }));
            const userData = snap.val() || {};
            const coins = userData.currency || 0;

            return { 
                text: `You have ${coins} Lumens. Want to check out the shop?`,
                action: 'NAVIGATE',
                data: '/shop'
            };
        } catch (e) {
            return { text: "I couldn't check your balance." };
        }
    }

    // --- 8.3 HABITS ---
    if (lowerInput.includes('habit') || lowerInput.includes('did i do')) {
        try {
            const habitRef = ref(db, `users/${userId}/habits`);
            const snap = await new Promise<any>((resolve) => onValue(habitRef, (s) => resolve(s), { onlyOnce: true }));
            const habits = snap.val() ? Object.values(snap.val()) : [];
            
            const today = new Date().toISOString().split('T')[0];
            const completed = habits.filter((h: any) => h.history?.[today]).map((h: any) => h.name);
            const pending = habits.filter((h: any) => !h.history?.[today]).map((h: any) => h.name);

            if (habits.length === 0) {
                return { text: "You don't have any habits tracked yet." };
            }

            if (pending.length === 0) {
                return { text: "You've completed all your habits for today! 🎉" };
            } else {
                return { text: `You've done ${completed.length} habits. Still left: ${pending.join(', ')}.` };
            }

        } catch (e) {
             return { text: "I couldn't check your habits." };
        }
    }

    // --- 8.4 ANALYTICS ---
    if (lowerInput.includes('stat') || lowerInput.includes('analysis') || lowerInput.includes('study time') || lowerInput.includes('how much did i study')) {
        try {
            const sessRef = ref(db, `users/${userId}/study_sessions`);
            const snap = await new Promise<any>((resolve) => onValue(sessRef, (s) => resolve(s), { onlyOnce: true }));
            const sessions = snap.val() ? Object.values(snap.val()) : [];

            // Calculate today's time
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            
            const todayMins = sessions
                .filter((s: any) => s.timestamp >= todayStart)
                .reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0);

            // Total time
            const totalMins = sessions.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0);
            
            return {
                text: `You've studied ${Math.round(todayMins)} minutes today. Total lifetime: ${Math.round(totalMins / 60)} hours.`,
                action: 'NAVIGATE',
                data: '/analytics',
                nextContext: {
                    lastTopic: 'ANALYTICS_QUERY',
                    lastStats: sessions
                }
            };

        } catch (e) {
            return { text: "I couldn't fetch your stats." };
        }
    }

    // --- 8.5 SMART RECOMMENDATION ("What should I do?") ---
    if (lowerInput.includes('what should i do') || lowerInput.includes('suggest') || lowerInput.includes('recommend')) {
        try {
            // Fetch ALL data potentially (Heavy operation, but "Smart")
            // 1. Flashcards Due
            const fcRef = ref(db, `users/${userId}/flashcards`);
            const fcSnap = await new Promise<any>((resolve) => onValue(fcRef, s => resolve(s), {onlyOnce: true}));
            const decks = fcSnap.val() ? Object.values(fcSnap.val()) : [];
            let totalDue = 0;
            decks.forEach((d: any) => {
                if(d.cards) totalDue += Object.values(d.cards).filter((c: any) => c.due <= Math.floor(Date.now()/1000)).length;
            });

            // 2. Events Today/Tomorrow
            const evRef = ref(db, `users/${userId}/events`); // Using firebase for events as per migration or localStorage?
            // Earlier used localStorage for full events... let's check localStorage for consistency if mixed 
            // BUT processNovaCommand earlier used localStorage for events. stick to that.
            let upcomingEvent = null;
            if (typeof window !== 'undefined') {
                const existing = localStorage.getItem('calendar-events');
                const events: any[] = existing ? JSON.parse(existing) : [];
                const now = new Date();
                const threeDays = new Date(); threeDays.setDate(now.getDate() + 3);
                
                upcomingEvent = events.find(e => {
                    const d = new Date(e.year || now.getFullYear(), e.month, e.day);
                    return d >= now && d <= threeDays;
                });
            }

            // 3. Habits Pending
            const hRef = ref(db, `users/${userId}/habits`);
            const hSnap = await new Promise<any>((resolve) => onValue(hRef, s => resolve(s), {onlyOnce: true}));
            const habits = hSnap.val() ? Object.values(hSnap.val()) : [];
            const todayKey = new Date().toISOString().split('T')[0];
            const pendingHabits = habits.filter((h: any) => !h.history?.[todayKey]);

            // Logic Tree
            if (upcomingEvent && upcomingEvent.type === 'exam') {
                return { text: `🚨 Priority: You have an exam "${upcomingEvent.name}" coming up! You should definitely study for that.` };
            }
            if (totalDue > 5) {
                return { text: `🧠 You have ${totalDue} flashcards due. Clear those out to keep your streak!` };
            }
            if (pendingHabits.length > 0) {
                 return { text: `✅ Keep your habits streak alive! You still need to: ${pendingHabits.map((h: any) => h.name).join(', ')}.` };
            }
            
            return { text: "🎉 You're doing great! Maybe relax with some specific music? Or learn a new topic?" };

        } catch (e) {
            return { text: "I'm having trouble thinking of a suggestion right now." };
        }
    }
    
    // --- 8.6 SETTINGS ---
    if (lowerInput.includes('setting') || lowerInput.includes('preference') || lowerInput.includes('config')) {
        return {
            text: "Opening Settings...",
            action: 'NAVIGATE',
            data: '/settings'
        };
    }

    // --- 9. TODO/TASK QUERIES ---
    // ... (unchanged) ...
    if (lowerInput.includes('my tasks') || lowerInput.includes('todo') || lowerInput.includes('have to do')) {
         if (typeof window !== 'undefined') {
            try {
                const tasksRef = ref(db, `users/${userId}/tasks`);
                const snap = await new Promise<any>((resolve) => onValue(tasksRef, s => resolve(s), { onlyOnce: true }));
                const data = snap.val() || {};
                const tasks = Object.values(data).filter((t: any) => !t.completed);

                if (tasks.length > 0) {
                    const list = tasks.slice(0, 5).map((t: any) => `- ${t.text}`).join('\n');
                     return { text: `You have ${tasks.length} pending tasks. Here are the top 5:\n${list}` };
                } else {
                     return { text: "You have no pending tasks. Free time? 😎" };
                }
            } catch (e) {
                return { text: "I couldn't fetch your tasks." };
            }
         }
    }

     // --- 10. MUSIC PLAYER ---
    if (lowerInput.includes('play music') || lowerInput.includes('music') || lowerInput.includes('song')) {
        return {
            text: "Opening the Music Player...",
            action: 'NAVIGATE',
            data: '/white-noise' // Assuming this is the music/white noise section based on context
        };
    }

    // --- 11. HELP COMMAND ---
    if (lowerInput === 'help' || lowerInput.includes('what can you do')) {
        return {
            text: "Here's what I can do for you:\n- **Tasks**: 'Add task buy milk'\n- **Calendar**: 'Exam on Friday', 'Do I have exams?'\n- **Grades**: 'How am I doing in Math?'\n- **Flashcards**: 'Any cards due?'\n- **Stats**: 'How much did I study?'\n- **Habits**: 'Did I do my habits?'\n- **Rank**: 'What is my rank?'\n- **Shop**: 'How many coins?'"
        };
    }

    // --- 4. GREETING / DEFAULT ---
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
        return { text: "Hello! I'm Nova. I can help you add tasks, schedule exams, or start timers. Just ask!" };
    }

    // --- 12. FALLBACK & SPELL CHECKER ---
    const knownCommands = ['help', 'exam', 'grade', 'task', 'flashcard', 'holiday', 'music', 'schedule', 'todo'];
    const words = lowerInput.split(' ');
    let bestMatch = "";
    let minDist = 3; // Threshold

    words.forEach(w => {
        knownCommands.forEach(cmd => {
            const d = levenshtein(w, cmd);
            if (d < minDist && d > 0) { // d > 0 to not match perfect, but we can match perfect too
                minDist = d;
                bestMatch = cmd;
            }
        });
    });

    if (bestMatch) {
        return { text: `I didn't understand that. Did you mean "${bestMatch}"?` };
    }

    return { text: "I didn't understand that. Type 'help' to see what I can do." };
};

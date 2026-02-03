import { startOfDay, subDays, isSameDay, getDay } from 'date-fns';

export type FrequencyType = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface Habit {
    id: string;
    name: string;
    color: string;
    frequency: FrequencyType;
    customDays?: number[]; // 0 = Sun, 1 = Mon...
    history: Record<string, boolean>; // key: YYYY-MM-DD
    createdOdd: number; // timestamp
}

export const getStreak = (habit: Habit): number => {
    if (!habit.history) return 0;
    
    let streak = 0;
    const today = new Date();
    let currentCheck = today;

    // If not done today, checking yesterday is valid IF it was due yesterday. 
    // Simplified: Just trace back days. 
    // Detailed: Check if today is done. If yes, streak starts 1. If no, check if yesterday done.
    
    // Check Today
    const todayKey = dateKey(today);
    if (habit.history[todayKey]) {
        streak++;
    }

    // Trace back
    let d = subDays(today, 1);
    while (true) {
        // Safety break
        if (streak > 3650) break; 

        // Check if habit was due on 'd'
        if (isHabitDue(habit, d)) {
            const k = dateKey(d);
            if (habit.history[k]) {
                streak++;
            } else {
                // If it was due but not done -> streak broken
                // Exception: if today is NOT done, we allow the streak to be "held" from yesterday
                // But if we are iterating back, a missing day breaks it.
                // WE WAIT. If today is NOT done, and we are at step 1 (yesterday), 
                // and yesterday is done, then streak is 1. 
                // The loop logic:
                // If today (streak=0) -> check yesterday. If done -> streak=1.
                // If today (streak=1) -> check yesterday. If done -> streak=2.
                
                // Let's refine.
                // If I did it today, streak starts at 1. Next check yesterday.
                // If I didn't do it today, streak starts at 0. Next check yesterday.
                
                // Breaking condition:
                // Found a day where it WAS due, but NOT done.
                // However, if streak is 0 (meaning strict check from today), we might find yesterday is done.
                break; 
            }
        }
        // If not due on 'd', just skip 'd' and continue back, streak is maintained.
        d = subDays(d, 1);
    }
    
    return streak;
};

// More robust streak calculation that handles "not due" days correctly
export const calculateCurrentStreak = (habit: Habit): number => {
    const history = habit.history || {};
    let streak = 0;
    let d = new Date();
    
    // Check today first
    if (isHabitDue(habit, d)) {
        if (history[dateKey(d)]) {
            streak++;
        }
    }
    
    // Move to yesterday
    d = subDays(d, 1);

    while (true) {
        if (differenceInDays(new Date(), d) > 365 * 2) break; // Limit lookback
        
        if (isHabitDue(habit, d)) {
            const k = dateKey(d);
            if (history[k]) {
                streak++;
            } else {
                // Break streak if due and not done
                // Exception: If we haven't started a streak yet (streak=0), 
                // checking yesterday is our last chance to find an active streak.
                // But wait, if Today was due and missed, streak IS 0.
                // Unless we allow "grace"? Standard habits usually reset if you miss a due day.
                // So: if due & missed -> break.
                break;
            }
        }
        // If not due, continue to previous day without breaking or incrementing
        d = subDays(d, 1);
    }

    return streak;
};

export const calculateBestStreak = (habit: Habit): number => {
    // This is expensive to calculate on fly every time, ideally stored properties.
    // Simple version: just return current for now, or scan history.
    // For now, let's just stick to current streak or specific property if saved.
    return calculateCurrentStreak(habit);
};

export const isHabitDue = (habit: Habit, date: Date): boolean => {
    const day = getDay(date); // 0=Sun, 1=Mon...
    
    switch (habit.frequency) {
        case 'daily': return true;
        case 'weekdays': return day !== 0 && day !== 6;
        case 'weekends': return day === 0 || day === 6;
        case 'custom': 
            return habit.customDays?.includes(day) ?? false;
        default: return true;
    }
};

export const getCompletionRate = (habit: Habit, daysBack: number = 28): number => {
    let dueCount = 0;
    let doneCount = 0;
    const today = new Date();
    
    for(let i=0; i<daysBack; i++) {
        const d = subDays(today, i);
        if (isHabitDue(habit, d)) {
            dueCount++;
            if (habit.history?.[dateKey(d)]) {
                doneCount++;
            }
        }
    }
    
    return dueCount === 0 ? 0 : Math.round((doneCount / dueCount) * 100);
};

export const dateKey = (date: Date) => date.toISOString().split('T')[0];

function differenceInDays(d1: Date, d2: Date): number {
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
}

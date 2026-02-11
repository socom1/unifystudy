// scheduleOptimizer.js
/**
 * Analyzes tasks and existing timetable events to suggest study blocks.
 * @param {Array} tasks - List of to-do tasks
 * @param {Array} events - List of timetable events
 * @param {Date} currentDate - The date to plan for (default today)
 * @returns {Array} suggestions - List of { start, end, task, score } objects
 */
export const optimizeSchedule = (tasks, events, subjects = [], currentDate = new Date()) => {
  const suggestions = [];
  const WORK_START_HOUR = 9; // 9 AM
  const WORK_END_HOUR = 21; // 9 PM
  const SLOT_DURATION_MINS = 60; // Suggest 1-hour blocks

  // 1. Filter high-priority tasks (e.g., active, due soon, or tagged "Important")
  const priorityTasks = tasks.filter(t => !t.isActive).sort((a, b) => {
    // Simple score: Due date proximity > Priority Tag
    const scoreA = getTaskScore(a);
    const scoreB = getTaskScore(b);
    return scoreB - scoreA;
  });

  // 2. Identify occupied slots for the target day
  const dayStr = currentDate.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
  
  const occupiedSlots = events.filter(e => e.day === dayStr).map(e => ({
    start: parseTime(e.start || e.startTime),
    end: parseTime(e.end || e.endTime)
  }));

  // Sort occupied slots by start time
  occupiedSlots.sort((a, b) => a.start - b.start);

  // 3. Find gaps
  let currentTime = WORK_START_HOUR * 60; // minutes from midnight
  
  // If planning for today, ensure we don't suggest past times
  const isToday = new Date().toDateString() === currentDate.toDateString();
  if (isToday) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      // Add a small buffer (e.g. 15 mins) so we don't suggest something starting IMMEDIATELY
      currentTime = Math.max(currentTime, currentMins + 15); 
  }

  const endTime = WORK_END_HOUR * 60;

  for (let i = 0; i < occupiedSlots.length; i++) {
    const slot = occupiedSlots[i];
    
    // Check gap before this slot
    if (slot.start - currentTime >= SLOT_DURATION_MINS) {
      addSuggestion(suggestions, currentTime, slot.start, priorityTasks, subjects);
    }
    currentTime = Math.max(currentTime, slot.end);
  }

  // Check gap after last slot
  if (endTime - currentTime >= SLOT_DURATION_MINS) {
    addSuggestion(suggestions, currentTime, endTime, priorityTasks, subjects);
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
};

function addSuggestion(suggestions, startMins, endMins, tasks, subjects) {
    // Determine how many blocks fit in this gap
    const duration = 60; // 1 hour
    let current = startMins;
    
    while (current + duration <= endMins) {
        let title = "Study Session";
        let taskRef = null;

        // Strategy: 
        // 1. If we have high priority tasks, suggest working on one.
        // 2. If not, but we have subjects, suggest studying a subject.
        // 3. Fallback to generic if neither.
        
        // Pick a task round-robin if available and high score
        if (tasks.length > 0 && (suggestions.length % 2 === 0 || subjects.length === 0)) {
             const task = tasks[suggestions.length % tasks.length];
             title = `Work on: ${task.text}`;
             taskRef = task;
        } else if (subjects.length > 0) {
             const subject = subjects[suggestions.length % subjects.length];
             title = `Study: ${subject}`;
        } else if (tasks.length > 0) {
             const task = tasks[suggestions.length % tasks.length];
             title = `Work on: ${task.text}`;
             taskRef = task;
        }

        suggestions.push({
            start: formatTime(current),
            end: formatTime(current + duration),
            title: title,
            type: 'study',
            day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            taskRef: taskRef
        });
        
        current += duration;
        if(suggestions.length >= 3) break;
    }
}

function getTaskScore(task) {
    let score = 0;
    if (task.dueDate) {
        const today = new Date().toISOString().split('T')[0];
        if (task.dueDate === today) score += 100;
        else if (task.dueDate < today) score += 50; // Overdue
        else score += 10;
    }
    if ((task.tags || []).some(t => t.label.toLowerCase().includes('important'))) score += 20;
    return score;
}

function parseTime(timeInput) {
    // Handle number (e.g. 9.5 -> 9:30 -> 570 mins)
    if (typeof timeInput === 'number') {
        const h = Math.floor(timeInput);
        const m = Math.round((timeInput - h) * 60);
        return h * 60 + m;
    }
    // Handle string "09:30" -> 570
    if (typeof timeInput === 'string' && timeInput.includes(':')) {
        const [h, m] = timeInput.split(':').map(Number);
        return h * 60 + m;
    }
    return 0; // Fallback
}

function formatTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

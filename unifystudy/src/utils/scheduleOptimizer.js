// scheduleOptimizer.js
/**
 * Analyzes tasks and existing timetable events to suggest study blocks.
 * @param {Array} tasks - List of to-do tasks
 * @param {Array} events - List of timetable events
 * @param {Date} currentDate - The date to plan for (default today)
 * @returns {Array} suggestions - List of { start, end, task, score } objects
 */
export const optimizeSchedule = (tasks, events, currentDate = new Date()) => {
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

  if (priorityTasks.length === 0) return [];

  // 2. Identify occupied slots for the target day
  const dayStr = currentDate.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
  // Note: MyTimetable uses day names like "Monday", "Tuesday". 
  // Events structure: { id, day, startTime, endTime, ... }
  
  const occupiedSlots = events.filter(e => e.day === dayStr).map(e => ({
    start: parseTime(e.startTime),
    end: parseTime(e.endTime)
  }));

  // Sort occupied slots by start time
  occupiedSlots.sort((a, b) => a.start - b.start);

  // 3. Find gaps
  let currentTime = WORK_START_HOUR * 60; // minutes from midnight
  const endTime = WORK_END_HOUR * 60;

  for (let i = 0; i < occupiedSlots.length; i++) {
    const slot = occupiedSlots[i];
    
    // Check gap before this slot
    if (slot.start - currentTime >= SLOT_DURATION_MINS) {
      addSuggestion(suggestions, currentTime, slot.start, priorityTasks);
    }
    currentTime = Math.max(currentTime, slot.end);
  }

  // Check gap after last slot
  if (endTime - currentTime >= SLOT_DURATION_MINS) {
    addSuggestion(suggestions, currentTime, endTime, priorityTasks);
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
};

function addSuggestion(suggestions, startMins, endMins, tasks) {
    // Determine how many blocks fit in this gap
    const duration = 60; // 1 hour
    let current = startMins;
    
    while (current + duration <= endMins) {
        // Pick a task round-robin or just top priority
        const task = tasks[suggestions.length % tasks.length];
        
        suggestions.push({
            start: formatTime(current),
            end: formatTime(current + duration),
            title: `Study: ${task.text}`,
            type: 'study',
            day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            taskRef: task
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

function parseTime(timeStr) {
    // "09:30" -> 570
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function formatTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

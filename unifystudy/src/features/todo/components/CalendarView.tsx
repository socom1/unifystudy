import React, { useMemo, useState } from 'react';
import { Task } from '../hooks/useTodo';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEditTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<{ day: number, tasks: Task[] } | null>(null);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentDate]);

  const firstDayOfMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay(); // 0 is Sunday
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });



  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar grid
  const renderCalendarDays = () => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Empty slots for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }


    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        // Robust filtering similar to YearlyCalendar
        const dayTasks = tasks.filter(task => {
            if (!task.dueDate) return false;
            const [tYear, tMonth, tDay] = task.dueDate.split('-').map(Number);
            return tYear === year && (tMonth - 1) === month && tDay === d;
        });
        
        const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

        // Overflow logic
        const MAX_VISIBLE = 2; // Show top 2 tasks directly
        const overflowCount = dayTasks.length > MAX_VISIBLE ? dayTasks.length - MAX_VISIBLE : 0;
        const visibleTasks = dayTasks.slice(0, MAX_VISIBLE);

        days.push(
            <div key={d} className={`calendar-day ${isToday ? 'today' : ''}`}>
                <div className="day-number">{d}</div>
                <div className="day-tasks custom-scrollbar">
                    {visibleTasks.map(task => (
                        <div 
                            key={task.id} 
                            className="mini-task-pill"
                            style={{ borderLeftColor: task.color }}
                            onClick={() => onEditTask(task)}
                            title={task.text}
                        >
                            {task.text}
                        </div>
                    ))}
                    {overflowCount > 0 && (
                        <div 
                            className="overflow-pill"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDay({ day: d, tasks: dayTasks });
                            }}
                        >
                            +{overflowCount} more
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return days;
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header">
         <div className="month-title">{monthName}</div>
         <div className="nav-controls">
            <button onClick={prevMonth}><ChevronLeft size={20} /></button>
            <button onClick={nextMonth}><ChevronRight size={20} /></button>
         </div>
      </div>
      
      <div className="calendar-grid-header">
         {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
             <div key={d} className="wday">{d}</div>
         ))}
      </div>
      
      <div className="calendar-grid">
         {renderCalendarDays()}
      </div>

      {expandedDay && (
          <div className="calendar-overflow-overlay" onClick={() => setExpandedDay(null)}>
              <div className="overflow-popup" onClick={e => e.stopPropagation()}>
                  <div className="popup-header">
                      <h4>Tasks for {monthName} {expandedDay.day}</h4>
                      <button onClick={() => setExpandedDay(null)}><ChevronLeft size={16} style={{transform: 'rotate(180deg)'}} /></button>
                  </div>
                  <div className="popup-list custom-scrollbar">
                      {expandedDay.tasks.map(task => (
                          <div 
                            key={task.id} 
                            className="popup-task-item"
                            onClick={() => {
                                onEditTask(task);
                                setExpandedDay(null);
                            }}
                          >
                              <div className="dot" style={{background: task.color}} />
                              <span>{task.text}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

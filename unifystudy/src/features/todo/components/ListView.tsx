import React from 'react';
import { Task } from '../hooks/useTodo';
import { Check, Calendar, Tag, Circle, Clock } from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string, currentStatus: Task['status']) => void;
  onEditTask: (task: Task) => void;
}

export const ListView: React.FC<ListViewProps> = ({ tasks, onToggleTask, onEditTask }) => {
  return (
    <div className="list-view-container custom-scrollbar">
       <div className="list-header-row">
           <div className="col-check"></div>
           <div className="col-title">Task</div>
           <div className="col-status">Status</div>
           <div className="col-due">Due Date</div>
           {/* <div className="col-priority">Priority</div> */}
       </div>

       <div className="list-body">
           {tasks.length === 0 ? (
               <div className="empty-state">No tasks in this view</div>
           ) : (
               tasks.map(task => (
                   <div key={task.id} className="list-row" onClick={() => onEditTask(task)}>
                       <div className="col-check">
                           <button 
                              className={`check-circle ${task.status === 'done' || task.isActive ? 'checked' : ''}`}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTask(task.id, task.status);
                              }}
                           >
                               {(task.status === 'done' || task.isActive) && <Check size={12} strokeWidth={3} />}
                           </button>
                       </div>
                       
                       <div className="col-title">
                           <span className={`text ${task.status === 'done' || task.isActive ? 'completed' : ''}`}>
                               {task.text}
                           </span>
                           {task.tags && task.tags.length > 0 && (
                               <div className="tags-inline">
                                   {task.tags.map((t, i) => (
                                       <span key={i} className="mini-tag" style={{ color: t.color }}>
                                           {t.label}
                                       </span>
                                   ))}
                               </div>
                           )}
                       </div>

                       <div className="col-status">
                           <span className={`status-badge ${task.status || 'backlog'}`}>
                               {task.status === 'in_progress' && <span className="dot progress" />}
                               {task.status === 'done' && <span className="dot done" />}
                               {task.status === 'review' && <span className="dot review" />}
                               {(!task.status || task.status === 'backlog') && <span className="dot backlog" />}
                               {(task.status?.replace('_', ' ') || 'Backlog')}
                           </span>
                       </div>

                       <div className="col-due">
                           {task.dueDate ? (
                               <span className={`date-pill ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                   <Calendar size={12} />
                                   {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                               </span>
                           ) : (
                               <span className="empty-dash">-</span>
                           )}
                       </div>
                   </div>
               ))
           )}
       </div>
    </div>
  );
};

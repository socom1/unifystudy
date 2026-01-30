import React, { useState, useMemo } from 'react';
import { Task, Folder } from '../hooks/useTodo';
import { 
  Check, 
  Calendar, 
  Tag, 
  Clock, 
  Briefcase, 
  AlertCircle, 
  User, 
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Flag,
  Maximize2,
  Trash2
} from 'lucide-react';
import './GroupedTaskTable.scss';
import { format, isToday, isTomorrow, isThisWeek, parseISO, isValid } from 'date-fns';

interface GroupedTaskTableProps {
  tasks: Task[];
  folders: Folder[];
  onUpdateTask: (taskId: string, folderId: string, updates: Partial<Task>) => void;
  onToggleTask: (taskId: string, status: Task['status'], folderId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string, folderId: string) => void;
}

export const GroupedTaskTable: React.FC<GroupedTaskTableProps> = ({ 
  tasks, 
  folders, 
  onUpdateTask, 
  onToggleTask,
  onToggleTask,
  onEditTask,
  onDeleteTask
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Grouping Logic
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      "Overdue": [],
      "Today": [],
      "Tomorrow": [],
      "Next 7 Days": [],
      "Later": [],
      "No Date": []
    };

    const now = new Date();
    // Reset time for comparison
    now.setHours(0,0,0,0);

    tasks.forEach(task => {
      // If completed, maybe put in separate group or filter out? 
      // For now, let's keep them in date groups but marked done.
      if (!task.dueDate) {
        groups["No Date"].push(task);
        return;
      }
      
      const due = new Date(task.dueDate);
      due.setHours(0,0,0,0); // Normalize

      if (due < now) {
         // Only if not done? Or strictly by date. Let's do strictly date.
         if (task.status !== 'done') groups["Overdue"].push(task);
         else groups["Today"].push(task); // Completed overdue tasks go to Today? Or stays overdue? logic choice.
      } else if (isToday(due)) {
         groups["Today"].push(task);
      } else if (isTomorrow(due)) {
         groups["Tomorrow"].push(task);
      } else if (due > now && due.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
         groups["Next 7 Days"].push(task);
      } else {
         groups["Later"].push(task);
      }
    });

    return groups;
  }, [tasks]);

  const groupOrder = ["Overdue", "Today", "Tomorrow", "Next 7 Days", "Later", "No Date"];

  // Helper to get folder name
  const getFolderName = (fid?: string) => folders.find(f => f.id === fid)?.text || "Inbox";

  return (
    <div className="grouped-task-table custom-scrollbar">
       {/* 1. Main Header */}
       <div className="table-header">
           <div className="th-cell col-check"><CheckCircle2 size={14}/></div>
           <div className="th-cell col-title">Task Name</div>
           <div className="th-cell col-due">Deadline</div>
           <div className="th-cell col-project">Project</div>
           <div className="th-cell col-status">Status</div>
           <div className="th-cell col-prio">Priority</div>
           <div className="th-cell col-dur">Duration</div>
           <div className="th-cell col-ws">Workspace</div>
           <div className="th-cell col-label">Label</div>
           <div className="th-cell col-user"><User size={14}/></div>
       </div>

       {/* 2. Groups */}
       {groupOrder.map(group => {
           const groupTasks = groupedTasks[group];
           if (groupTasks.length === 0) return null;
           const isCollapsed = collapsedGroups[group];

           return (
               <div key={group} className="task-group">
                   <div className="group-header" onClick={() => toggleGroup(group)}>
                       <div className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>
                           <ChevronDown size={16} />
                       </div>
                       <span className="group-title">{group}</span>
                       <span className="group-count">{groupTasks.length}</span>
                   </div>
                   
                   {!isCollapsed && groupTasks.map(task => (
                       <div key={task.id} className="task-row">
                           {/* Check */}
                           <div className="td-cell col-check">
                               <button 
                                  className={`check-circle ${task.status === 'done' ? 'checked' : ''}`}
                                  onClick={() => onToggleTask(task.id, task.status, task.folderId || "")}
                               >
                                   {task.status === 'done' && <Check size={12} strokeWidth={3} />}
                               </button>
                           </div>
                           
                           {/* Title */}
                           <div className="td-cell col-title">
                               <input 
                                   defaultValue={task.text}
                                   onBlur={(e) => onUpdateTask(task.id, task.folderId || "", { text: e.target.value })}
                               />
                               <button className="open-task-btn" onClick={() => onEditTask(task)} title="Open Details">
                                    <Maximize2 size={12}/>
                               </button>
                               <button 
                                   className="open-task-btn delete" 
                                   onClick={() => onDeleteTask(task.id, task.folderId || "")}
                                   title="Delete Task"
                                   style={{ marginLeft: '4px', color: 'var(--color-danger)' }}
                               >
                                    <Trash2 size={12}/>
                               </button>
                           </div>

                           {/* Deadline */}
                           <div className="td-cell col-due">
                               <div className="date-picker-trigger" style={{color: task.dueDate && new Date(task.dueDate) < new Date() ? 'var(--color-danger)' : 'inherit'}}>
                                   {task.dueDate ? format(new Date(task.dueDate), "MMM dd") : "-"}
                               </div>
                           </div>

                           {/* Project */}
                           <div className="td-cell col-project">
                               <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{getFolderName(task.folderId)}</span>
                           </div>

                           {/* Status */}
                           <div className="td-cell col-status">
                               <select 
                                  value={task.status || 'backlog'}
                                  onChange={(e) => onUpdateTask(task.id, task.folderId || "", { status: e.target.value as any })}
                                  className={`status-badge ${task.status || 'backlog'}`}
                               >
                                   <option value="backlog">Backlog</option>
                                   <option value="in_progress">In Progress</option>
                                   <option value="review">Review</option>
                                   <option value="done">Done</option>
                               </select>
                           </div>

                           {/* Priority */}
                           <div className="td-cell col-prio">
                               <select
                                  value={task.priority || 'medium'}
                                  onChange={(e) => onUpdateTask(task.id, task.folderId || "", { priority: e.target.value as any })}
                                  style={{ color: task.priority === 'high' ? 'var(--color-danger)' : task.priority === 'low' ? 'var(--color-success)' : 'var(--color-warning)' }}
                               >
                                   <option value="low">Low</option>
                                   <option value="medium">Medium</option>
                                   <option value="high">High</option>
                               </select>
                           </div>

                           {/* Duration */}
                           <div className="td-cell col-dur">
                               <input 
                                   className="duration-input"
                                   placeholder="-"
                                   defaultValue={task.duration ? `${task.duration}m` : ""}
                                   onBlur={(e) => {
                                       const val = parseInt(e.target.value);
                                       if(!isNaN(val)) onUpdateTask(task.id, task.folderId || "", { duration: val });
                                   }}
                               />
                           </div>

                           {/* Workspace */}
                           <div className="td-cell col-ws">
                               <select
                                   value={task.workspace || 'Personal'}
                                   onChange={(e) => onUpdateTask(task.id, task.folderId || "", { workspace: e.target.value })}
                               >
                                   <option value="Personal">Personal</option>
                                   <option value="Work">Work</option>
                                   <option value="School">School</option>
                               </select>
                           </div>

                           {/* Label */}
                           <div className="td-cell col-label">
                               <input 
                                   placeholder="+"
                                   defaultValue={task.label || ""}
                                   onBlur={(e) => onUpdateTask(task.id, task.folderId || "", { label: e.target.value })}
                               />
                           </div>

                           {/* Assignee (Mock) */}
                           <div className="td-cell col-user">
                               <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#000', fontWeight: 'bold' }}>
                                   ME
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
           );
       })}
    </div>
  );
};

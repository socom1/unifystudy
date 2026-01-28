import React from 'react';
import { Task } from '../hooks/useTodo';
import { MoreHorizontal, Plus, Calendar, Paperclip, MessageSquare, Trello, FolderKanban } from 'lucide-react';

interface BoardViewProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: Task['status']) => void;
  onEditTask: (task: Task) => void;
  onAddTask: (status: Task['status']) => void;
}

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: '#ffb302', showImport: true },
  { id: 'in_progress', label: 'In Progress', color: '#3498db' },
  { id: 'review', label: 'Awaiting Review', color: '#9b59b6' }, 
  { id: 'done', label: 'Done', color: '#2ecc71' }
];

export const BoardView: React.FC<BoardViewProps> = ({ tasks, onUpdateStatus, onEditTask, onAddTask }) => {
  const [activeMenuColumn, setActiveMenuColumn] = React.useState<string | null>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuColumn(null);
    if(activeMenuColumn) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuColumn]);
  
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          onUpdateStatus(taskId, status as Task['status']);
      }
      e.currentTarget.classList.remove('drag-over');
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.add('drag-over');
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
      e.currentTarget.classList.remove('drag-over');
  };

  return (
    <div className="board-view">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => (t.status || (t.isActive ? 'done' : 'backlog')) === col.id);
        
        return (
          <div 
             key={col.id} 
             className="board-column"
             onDrop={(e) => handleDrop(e, col.id)}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
          >
            <div className="column-header">
               <div className="header-left">
                   <h4 style={{ color: col.color }}>{col.label}</h4>
                   <span className="count">{colTasks.length}</span>
               </div>
               <div className="column-menu-wrapper" style={{position: 'relative'}}>
                   <button 
                        className="more-btn" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuColumn(activeMenuColumn === col.id ? null : col.id);
                        }}
                    >
                        <MoreHorizontal size={16}/>
                    </button>
                   
                   {activeMenuColumn === col.id && (
                       <div className="column-dropdown-menu">
                           <div className="menu-item">Sort by Priority</div>
                           <div className="menu-item">Sort by Date</div>
                           <div className="divider" />
                           <div className="menu-item delete">Clear All</div>
                       </div>
                   )}
               </div>
            </div>

            <button 
                className="add-task-ghost" 
                onClick={() => onAddTask(col.id as Task['status'])}
            >
                <Plus size={14} /> Add Task
            </button>



            <div className="column-content custom-scrollbar">
                {colTasks.map(task => (
                    <div 
                        key={task.id} 
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => onEditTask(task)}
                    >
                        <div className="card-top">
                            <span className="task-id">#{task.order ? String(task.order).slice(-3) : '---'}</span>
                            {/* <button className="card-menu"><MoreHorizontal size={14} /></button> */}
                        </div>

                        <h4 className="task-title">{task.text}</h4>
                        
                        {(task.tags && task.tags.length > 0) && (
                            <div className="card-tags">
                                {task.tags.map((tag, i) => (
                                    <span key={i} className="card-tag" style={{ 
                                        color: tag.color,
                                        background: `${tag.color}15`,
                                        border: `1px solid ${tag.color}30`
                                    }}>
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="card-footer">
                            <div className="meta-left">
                                {task.dueDate && (
                                    <div className={`meta-pill ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                        <Calendar size={12} />
                                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                )}
                                {/* Status Icons for Checklist/Comments if they utilize the new features */}
                                {(task.comments?.length ?? 0) > 0 && <div className="meta-pill"><MessageSquare size={12} /> {task.comments?.length}</div>}
                                {(task.attachments?.length ?? 0) > 0 && <div className="meta-pill"><Paperclip size={12} /> {task.attachments?.length}</div>}
                            </div>
                            

                        </div>
                    </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

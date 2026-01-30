import React from 'react';
import { Task } from '../hooks/useTodo';
import { MoreHorizontal, Plus, Calendar, Paperclip, MessageSquare, Trello, FolderKanban, Maximize2, Minimize2 } from 'lucide-react';

interface BoardViewProps {
  tasks: Task[];
  columns: Array<{ id: string; label: string; color: string }> | null;
  folderId: string | null;
  onUpdateFolder: (folderId: string, payload: any) => Promise<void>;
  onUpdateStatus: (taskId: string, newStatus: Task['status']) => void;
  onUpdateTask: (taskId: string, payload: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onAddTask: (status: Task['status']) => void;
}

const DEFAULT_COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: '#ffb302' },
  { id: 'in_progress', label: 'In Progress', color: '#3498db' },
  { id: 'review', label: 'Awaiting Review', color: '#9b59b6' }, 
  { id: 'done', label: 'Done', color: '#2ecc71' }
];

export const BoardView: React.FC<BoardViewProps> = ({ tasks, columns, folderId, onUpdateFolder, onUpdateStatus, onUpdateTask, onEditTask, onAddTask }) => {
  const [activeMenuColumn, setActiveMenuColumn] = React.useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = React.useState(false);
  const [newColumnName, setNewColumnName] = React.useState("");
  
  // Board Physics State
  const [dragState, setDragState] = React.useState<{ draggingId: string | null; overColId: string | null; overIndex: number | null }>({
      draggingId: null, overColId: null, overIndex: null
  });

  const activeColumns = columns || DEFAULT_COLUMNS;

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuColumn(null);
    if(activeMenuColumn) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuColumn]);
  
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('text/plain', taskId);
      e.dataTransfer.setData('taskId', taskId); // Fallback
      // Defer state update to allow drag image to be captured
      requestAnimationFrame(() => {
          setDragState({ draggingId: taskId, overColId: null, overIndex: null });
      });
  };

  const handleDragOverCard = (e: React.DragEvent, colId: string, index: number, cardRect: DOMRect) => {
      e.preventDefault();
      e.stopPropagation();
      
      const mouseY = e.clientY;
      const threshold = cardRect.top + (cardRect.height / 2);
      
      const newIndex = mouseY < threshold ? index : index + 1;
      
      if (dragState.overColId !== colId || dragState.overIndex !== newIndex) {
            setDragState(prev => ({ ...prev, overColId: colId, overIndex: newIndex }));
      }
  };

  const handleColumnDrop = (e: React.DragEvent, status: string, colTasks: Task[]) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('taskId');
      if (!taskId) return;
      e.currentTarget.classList.remove('drag-over');

      // Filter out the dragging task to get a "clean" list of siblings
      const cleanList = colTasks.filter(t => t.id !== taskId);
      const draggingItemIndex = colTasks.findIndex(t => t.id === taskId);
      
      let targetIndex = dragState.overIndex !== null ? dragState.overIndex : colTasks.length;

      // Determine correct index in the clean list
      // If we are in the same column and the original item was ABOVE the drop target,
      // the visual gap implies we shift the index by -1 because the item itself is removed.
      if (draggingItemIndex !== -1 && draggingItemIndex < targetIndex) {
          targetIndex--;
      }
      
      // Clamp index safety
      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex > cleanList.length) targetIndex = cleanList.length;

      // Calculate final order based on clean siblings
      let newOrder;
      
      if (cleanList.length === 0) {
          newOrder = Date.now();
      } else if (targetIndex === 0) {
          const first = cleanList[0];
          newOrder = (Number(first?.order) || 0) - 1000;
      } else if (targetIndex >= cleanList.length) {
          const last = cleanList[cleanList.length - 1];
          newOrder = (Number(last?.order) || 0) + 1000;
      } else {
          const prev = cleanList[targetIndex - 1];
          const next = cleanList[targetIndex];
          newOrder = ((Number(prev.order) || 0) + (Number(next.order) || 0)) / 2;
      }

      onUpdateTask(taskId, { status: status as Task['status'], order: newOrder });
      
      // Defer state reset to next frame to prevent visual twitch
      requestAnimationFrame(() => {
          setDragState({ draggingId: null, overColId: null, overIndex: null });
      });
  };
  
  const handleDragEnd = () => {
      // Defer reset slightly for smoother animation
      requestAnimationFrame(() => {
          setDragState({ draggingId: null, overColId: null, overIndex: null });
      });
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.add('drag-over');
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
      e.currentTarget.classList.remove('drag-over');
  };

  const handleAddColumn = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newColumnName.trim() || !folderId) return;

      const newColumn = {
          id: newColumnName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
          label: newColumnName,
          color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
      };

      const updatedColumns = [...activeColumns, newColumn];
      await onUpdateFolder(folderId, { columns: updatedColumns });
      setNewColumnName("");
      setIsAddingColumn(false);
  };

  const handleDeleteColumn = async (columnId: string) => {
      if (!folderId || !columns) return; // Can't delete default columns if not persisted yet (would need to init them first)
      
      const updatedColumns = activeColumns.filter(c => c.id !== columnId);
      await onUpdateFolder(folderId, { columns: updatedColumns });
  };

  return (
    <div className="board-view">
      {activeColumns.map(col => {
        const colTasks = tasks.filter(t => (t.status || (t.isActive ? 'done' : 'backlog')) === col.id);
        
        return (
          <div 
             key={col.id} 
             className="board-column"
             onDrop={(e) => handleColumnDrop(e, col.id, colTasks)}
             onDragOver={(e) => {
                 e.preventDefault(); 
                 // If hovering column but not card, assume append (index = length)
                 if (e.target === e.currentTarget && (dragState.overColId !== col.id || dragState.overIndex !== colTasks.length)) {
                     setDragState(prev => ({ ...prev, overColId: col.id, overIndex: colTasks.length }));
                 }
             }}
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
                           
                           {/* Only allow deleting if it's a custom column configuration (columns prop exists) */}
                           {folderId && (
                               <>
                                   <div className="divider" />
                                   <div 
                                        className="menu-item delete"
                                        onClick={() => handleDeleteColumn(col.id)}
                                   >
                                       Delete Section
                                   </div>
                               </>
                           )}
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
                {colTasks.map((task, index) => {
                    // Logic to render placeholder
                    // If overColId matches && overIndex matches this position...
                    // WE HAVE TO SPLIT RENDER? No.
                    // If we render Tasks [A, B, C].
                    // If overIndex = 1 (between A and B).
                    // We render A, Placeholder, B, C.
                    // BUT map index iterates 0, 1, 2.
                    // Easier: Before each task, checking if we should render placeholder?
                    // EXCEPT if overIndex == length (handled after loop).
                    
                    const showPlaceholder = dragState.overColId === col.id && dragState.overIndex === index;
                    const isDragging = dragState.draggingId === task.id;
                    
                    return (
                    <React.Fragment key={task.id}>
                        {showPlaceholder && (
                            <div 
                                className={`kanban-placeholder ${task.isHalfWidth ? 'half' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleColumnDrop(e, col.id, colTasks)}
                            />
                        )}
                        <div 
                        className={`kanban-card ${task.isHalfWidth ? 'half-width' : ''} ${isDragging ? 'dragging-source' : ''}`}
                        style={{ borderLeft: `3px solid ${task.color || 'transparent'}` }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOverCard(e, col.id, index, e.currentTarget.getBoundingClientRect())}
                        // Drop handled by column
                        onClick={() => onEditTask(task)}
                    >
                        <div className="card-top">
                            <span className="task-id">#{task.order ? String(task.order).slice(-3) : '---'}</span>
                            <button 
                                className="width-toggle-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateTask(task.id, { isHalfWidth: !task.isHalfWidth });
                                }}
                                style={{ opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                            >
                                {task.isHalfWidth ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                            </button>
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
                    </React.Fragment>
                    );
                })}
                {/* Final Placeholder */}
                {dragState.overColId === col.id && dragState.overIndex === colTasks.length && (
                    <div 
                        className="kanban-placeholder" 
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => handleColumnDrop(e, col.id, colTasks)}
                    />
                )}
            </div>
          </div>
        );
      })}

      {/* Add New Section Button */}
      {folderId && (
          <div className="add-column">
              {isAddingColumn ? (
                  <form onSubmit={handleAddColumn} className="add-column-form">
                      <input 
                          autoFocus
                          placeholder="Section Name"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          onBlur={() => !newColumnName && setIsAddingColumn(false)}
                      />
                      <div className="form-actions">
                          <button type="submit" className="save-btn">Add</button>
                          <button type="button" onClick={() => setIsAddingColumn(false)} className="cancel-btn">×</button>
                      </div>
                  </form>
              ) : (
                  <button className="add-column-btn" onClick={() => setIsAddingColumn(true)}>
                      <Plus size={20} />
                      <span>Add Section</span>
                  </button>
              )}
          </div>
      )}
    </div>
  );
};

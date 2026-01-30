import React, { useState, useRef, useEffect } from 'react';
import { Task, useTodo, ChecklistItem } from '../hooks/useTodo';
import { X, CheckSquare, MessageSquare, Paperclip, MoreHorizontal, Calendar, Plus, User, Flag, Send, Trash2, Save, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskDrawerProps {
  task: Task | null;
  onClose: () => void;
  folderName: string;
  userProfile?: { displayName?: string; photoURL?: string; avatarColor?: string; userId?: string };
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ task, onClose, folderName, userProfile }) => {
  const { updateTask, addChecklistItem, toggleChecklistItem, addComment, addAttachment, userId, deleteTask } = useTodo();
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!task) return null;

  const handleUpdate = (field: string, value: any) => {
      if(task.folderId) {
          updateTask(task.id, task.folderId, { [field]: value });
      }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChecklistText.trim() || !task.folderId) return;
      await addChecklistItem(task.id, task.folderId, newChecklistText, task.checklist);
      setNewChecklistText("");
  };

  const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCommentText.trim() || !task.folderId) return;
      await addComment(task.id, task.folderId, newCommentText, task.comments);
      setNewCommentText("");
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
        if (task.folderId) {
            await deleteTask(task.id, task.folderId);
            onClose();
        }
    }
  };

  const handleSave = () => {
      // Auto-save logic handles data; this closes the drawer
      onClose();
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="task-drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
            className="task-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="drawer-header">
                <div className="breadcrumbs">
                    <span>Tasks</span>
                    <span className="sep">/</span>
                    <span className="current">{folderName}</span>
                </div>
                <div className="actions">
                    <button className="icon-btn" onClick={handleDelete} title="Delete Task" style={{ color: '#ef4444' }}>
                        <Trash2 size={18} />
                    </button>
                    <button className="icon-btn" onClick={handleSave} title="Save & Close" style={{ color: 'var(--color-primary)' }}>
                        <Save size={18} />
                    </button>
                    <button className="icon-btn">
                        <MoreHorizontal size={18} />
                    </button>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="drawer-content custom-scrollbar">
                {/* Title Section */}
                <div className="title-section">
                    <input 
                        className="title-input"
                        value={task.text} 
                        onChange={(e) => handleUpdate('text', e.target.value)}
                        placeholder="Task Title"
                    />
                </div>

                {/* Meta Row */}
                <div className="meta-grid">
                    <div className="meta-item">
                        <label>List</label>
                        <div className="value-pill">{folderName || "Inbox"}</div>
                    </div>
                    <div className="meta-item">
                        <label>Priority</label>
                        <select 
                            className="value-select" 
                            value={task.priority || 'medium'}
                            onChange={(e) => handleUpdate('priority', e.target.value)}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="meta-item">
                        <label>Duration</label>
                        <div className="input-with-icon styled" style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '6px', 
                            padding: '4px 8px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                             <Clock size={14} style={{ color: 'var(--color-muted)' }} />
                             <input 
                                 className="value-input-transparent"
                                 placeholder="min"
                                 type="number"
                                 value={task.duration || ""}
                                 onChange={(e) => handleUpdate('duration', parseInt(e.target.value))}
                                 style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', fontSize: '0.9rem' }}
                             />
                        </div>
                    </div>

                    <div className="meta-item">
                        <label>Assignee</label>
                        <div className="input-with-icon styled" style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '6px', 
                            padding: '4px 8px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                             <Users size={14} style={{ color: 'var(--color-muted)' }} />
                             <select
                                className="value-select-transparent"
                                value={task.assignees?.[0]?.userId || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if(val) handleUpdate('assignees', [{ userId: val, name: val }]); 
                                    else handleUpdate('assignees', []);
                                }}
                                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                             >
                                 <option value="" style={{color:'#000'}}>Unassigned</option>
                                 <option value="me" style={{color:'#000'}}>Me</option>
                             </select>
                        </div>
                    </div>

                    <div className="meta-item">
                        <label>Due Date</label>
                        <div style={{position: 'relative'}}>
                            <div 
                                className="value-input"
                                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}
                            >
                                <Calendar size={14} />
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : "Set Date"}
                            </div>
                            
                            {isDatePickerOpen && (
                                <div className="date-picker-popover" onClick={e => e.stopPropagation()}>
                                    <DatePickerModal 
                                        initialDate={task.dueDate} 
                                        onSelect={(date) => {
                                            handleUpdate('dueDate', date);
                                            setIsDatePickerOpen(false);
                                        }}
                                        onClose={() => setIsDatePickerOpen(false)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="meta-item">
                        <label>Color</label>
                        <div className="color-picker-row" style={{ display: 'flex', gap: '6px' }}>
                            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'].map(c => (
                                <div 
                                    key={c}
                                    onClick={() => handleUpdate('color', c)}
                                    style={{
                                        width: '18px', height: '18px', borderRadius: '50%', background: c,
                                        cursor: 'pointer', border: task.color === c ? '2px solid white' : '2px solid transparent',
                                        boxShadow: task.color === c ? '0 0 0 1px rgba(255,255,255,0.2)' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="divider" />

                {/* Description */}
                <div className="section description-section">
                    <div className="section-header">
                        <span className="icon"><FileTextIcon /></span>
                        <h3>Description</h3>
                    </div>
                    <textarea 
                        className="desc-input"
                        value={task.description || ""}
                        onChange={(e) => handleUpdate('description', e.target.value)}
                        placeholder="Type in task description..."
                        rows={4}
                    />
                </div>

                {/* Checklist */}
                <div className="section checklist-section">
                     <div className="section-header">
                        <span className="icon"><CheckSquare size={16} /></span>
                        <h3>Checklist</h3>
                    </div>
                    
                    <div className="checklist-items">
                        {task.checklist?.map(item => (
                            <div key={item.id} className="checklist-item">
                                <input 
                                    type="checkbox" 
                                    checked={item.completed}
                                    onChange={() => task.folderId && toggleChecklistItem(task.id, task.folderId, item.id, task.checklist)}
                                />
                                <span className={item.completed ? 'completed' : ''}>{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddChecklist} className="add-item-form">
                        <Plus size={16} />
                        <input 
                            value={newChecklistText}
                            onChange={(e) => setNewChecklistText(e.target.value)}
                            placeholder="Add an item"
                        />
                    </form>
                </div>

                {/* Attachments */}
                <div className="section">
                    <div className="section-header">
                        <span className="icon"><Paperclip size={16} /></span>
                        <h3>Attachments</h3>
                    </div>

                    <div className="attachments-list" style={{display:'flex', flexDirection:'column', gap:'8px', marginBottom: '12px'}}>
                        {task.attachments?.map(att => (
                            <div key={att.id} style={{
                                display:'flex', alignItems:'center', gap:'10px', 
                                padding:'8px', background:'rgba(255,255,255,0.05)', 
                                borderRadius:'6px', border:'1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div style={{
                                    width:'32px', height:'32px', background:'rgba(255,255,255,0.1)', 
                                    borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:'0.6rem', fontWeight:'bold', color:'var(--color-muted)'
                                }}>
                                    {att.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                </div>
                                <div style={{flex:1, overflow:'hidden'}}>
                                    <div style={{fontSize:'0.85rem', color:'var(--color-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{att.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{display:'none'}} 
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                addAttachment(task.id, task.folderId!, e.target.files[0], task.attachments);
                            }
                        }}
                    />
                    <button 
                        className="add-attachment-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Plus size={14} /> Add Attachment
                    </button>
                </div>

                <div className="divider" />

                {/* Activity / Comments */}
                <div className="section activity-section">
                     <div className="section-header">
                        <span className="icon"><MessageSquare size={16} /></span>
                        <h3>Activity</h3>
                    </div>
                    
                    <div className="comments-list">
                        {task.comments?.map(comment => {
                             const isMe = userProfile && comment.userId === userProfile.userId;
                             
                             const display = isMe ? {
                                 name: 'Me',
                                 bg: userProfile?.photoURL ? `url(${userProfile.photoURL}) center/cover` : (userProfile?.avatarColor || '#333'),
                                 initial: userProfile?.photoURL ? '' : 'Me'
                             } : {
                                 name: 'User',
                                 bg: `hsl(${(comment.userId.charCodeAt(0) * 50) % 360}, 70%, 50%)`,
                                 initial: 'U'
                             };
                             
                             return (
                                <div key={comment.id} className="comment">
                                    <div className="avatar" style={{background: display.bg, color:'#fff', fontSize:'0.7rem', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        {display.initial}
                                    </div>
                                    <div className="comment-content">
                                        <div className="comment-meta">
                                            <span className="name">{isMe ? 'You' : 'User'}</span>
                                            <span className="time">{new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <p>{comment.text}</p>
                                    </div>
                                </div>
                             );
                        })}
                    </div>

                    <form onSubmit={handleAddComment} className="comment-form">
                        <div className="avatar-small">U</div>
                        <div className="input-wrap">
                            <input 
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder="Write a comment..."
                            />
                            <button type="submit" disabled={!newCommentText.trim()}><Send size={14} /></button>
                        </div>
                    </form>
                </div>

            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const FileTextIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);

// Helper Date Picker Component
const DatePickerModal = ({ initialDate, onSelect, onClose }: { initialDate?: string, onSelect: (d: string) => void, onClose: () => void }) => {
    const [viewDate, setViewDate] = useState(initialDate ? new Date(initialDate) : new Date());
    
    // Ensure viewDate is valid
    if(isNaN(viewDate.getTime())) setViewDate(new Date());

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
    const handleNext = () => setViewDate(new Date(year, month + 1, 1));

    return (
        <div className="picker-content">
             <div className="picker-header">
                <span>{monthNames[month]} {year}</span>
                <div>
                    <button onClick={handlePrev}>&lt;</button>
                    <button onClick={handleNext}>&gt;</button>
                </div>
             </div>
             <div className="picker-grid">
                {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="day-name">{d}</div>)}
                
                {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`} className="picker-day empty" />)}
                
                {Array.from({length: daysInMonth}).map((_, i) => {
                    const d = i + 1;
                    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const isSelected = initialDate === dateStr;
                    const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
                    
                    return (
                        <div 
                            key={d} 
                            className={`picker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => onSelect(dateStr)}
                        >
                            {d}
                        </div>
                    );
                })}
             </div>
             { initialDate && (
                 <div style={{marginTop: '12px', textAlign: 'center'}}>
                     <button 
                        onClick={() => onSelect("")}
                        style={{background:'transparent', border:'none', color:'var(--color-danger)', fontSize:'0.8rem', cursor:'pointer'}}
                     >
                         Clear Date
                     </button>
                 </div>
             )}
        </div>
    );
};

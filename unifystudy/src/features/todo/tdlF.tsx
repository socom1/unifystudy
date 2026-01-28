import React, { useState } from 'react';
import { useTodo, Task } from './hooks/useTodo';
import { BoardView } from './components/BoardView';
import { ListView } from './components/ListView';
import { CalendarView } from './components/CalendarView';
import { TaskDrawer } from './components/TaskDrawer'; // Import Drawer
import { Search, Filter, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, Plus, ChevronDown, Folder, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Modal from "@/components/common/Modal";
import "./tdlF.scss";

export default function TdlF() {
  const {
      folders,
      tasks,
      activeView, setActiveView,
      currentFolderId, setCurrentFolderId,
      searchQuery, setSearchQuery,
      addTask,
      updateTaskStatus,
      updateTask,
      deleteTask
  } = useTodo();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);

  const currentFolder = folders.find(f => f.id === currentFolderId);

  // Handlers for Drawer
  const handleEditTask = (task: Task) => {
      setEditingTask(task);
      // Drawer is controlled by editingTask != null
  };

  const closeDrawer = () => {
      setEditingTask(null);
  };

  // Keep simple modal for "New Task" quick add if preferred, 
  // OR we can make the drawer open empty.
  // For now: "New Task" opens simple modal, "Edit" opens premium drawer?
  // User asked for the POPUP (edit) to be the drawer. Let's make "New Task" also open drawer?
  // Let's stick to: "New Task" -> Simple Modal (Quick), "Edit" -> Drawer (Detail).
  // Actually, User reference suggests "Add Task" also opens a detail view.
  // I will make `handleCreateTask` open the simple modal for now to keep it fast, but Edit uses Drawer.
  
  const handleCreateTask = () => {
      setEditingTask(null); // Clear edit
      setIsTaskModalOpen(true); // Open simple create modal
  };

  const handleSaveTask = (e) => {
      e.preventDefault();
      const form = e.target;
      const text = form.taskText.value;
      const status = form.taskStatus.value;
      const date = form.taskDate.value;
      
      if (text) {
          addTask(text, currentFolderId, { 
              status: status || 'backlog',
              dueDate: date
          });
          setIsTaskModalOpen(false);
      }
  };

  return (
    <div className="tdl-layout">
        <main className="todo-main">
            <header>
                <div className="title-area">
                    <div className="collection-selector" onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}>
                        <span className="icon">
                            {currentFolder?.type === 'list' ? <FileText size={18} /> : <Folder size={18} />}
                        </span>
                        <span className="current-name">
                            {currentFolder ? currentFolder.text : "All Tasks"}
                        </span>
                        <ChevronDown size={14} className={`chevron ${isFolderMenuOpen ? 'open' : ''}`} />
                        
                        {isFolderMenuOpen && (
                            <div className="folder-dropdown-menu custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                                <div 
                                    className={`dropdown-item ${!currentFolderId ? 'active' : ''}`}
                                    onClick={() => { setCurrentFolderId(null); setIsFolderMenuOpen(false); }}
                                >
                                    <Folder size={16} /> All Tasks
                                </div>
                                <div className="divider" />
                                {folders.map(f => (
                                    <div 
                                        key={f.id} 
                                        className={`dropdown-item ${currentFolderId === f.id ? 'active' : ''}`}
                                        onClick={() => { setCurrentFolderId(f.id); setIsFolderMenuOpen(false); }}
                                    >
                                        <span style={{ color: f.color }}>{f.type === 'list' ? <FileText size={16} /> : <Folder size={16} />}</span>
                                        {f.text}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="center-actions">
                    <div className="view-switcher">
                        <button 
                            className={activeView === 'list' ? 'active' : ''} 
                            onClick={() => setActiveView('list')}
                            title="List View"
                        >
                            <ListIcon size={16} />
                        </button>
                        <button 
                            className={activeView === 'board' ? 'active' : ''} 
                            onClick={() => setActiveView('board')}
                            title="Board View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button 
                            className={activeView === 'calendar' ? 'active' : ''} 
                            onClick={() => setActiveView('calendar')}
                            title="Calendar View"
                        >
                            <CalendarIcon size={16} />
                        </button>
                    </div>
                </div>

                <div className="controls-area">
                    <div className="search-box">
                        <Search size={16} className="search-icon" />
                        <input 
                            placeholder="Search..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="primary-btn" onClick={handleCreateTask}>
                        <Plus size={16} /> New
                    </button>
                </div>
            </header>

            <div className="view-content flex-1 overflow-hidden relative">
                {activeView === 'board' && (
                    <BoardView 
                        tasks={tasks}
                        onUpdateStatus={(tid, status) => updateTaskStatus(tid, status, tasks.find(t=>t.id===tid)?.folderId)}
                        onEditTask={handleEditTask}
                        onAddTask={() => setIsTaskModalOpen(true)}
                    />
                )}
                {activeView === 'list' && (
                    <ListView 
                        tasks={tasks}
                        onToggleTask={(tid, status) => updateTaskStatus(tid, status === 'done' ? 'backlog' : 'done', tasks.find(t=>t.id===tid)?.folderId)}
                        onEditTask={handleEditTask}
                    />
                )}
                {activeView === 'calendar' && (
                    <CalendarView 
                        tasks={tasks}
                        onEditTask={handleEditTask}
                    />
                )}
            </div>
        </main>

        {/* Quick Add Modal (Simplified) */}
        <Modal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            title="Create Task"
            className="todo-task-modal"
        >
            <form onSubmit={handleSaveTask} className="task-form">
                <div className="form-group">
                    <label>Task Name</label>
                    <input name="taskText" placeholder="Task name" autoFocus />
                </div>
                <div className="form-row">
                     <div className="form-group">
                        <label>Status</label>
                        <select name="taskStatus">
                            <option value="backlog">Backlog</option>
                            <option value="in_progress">In Progress</option>
                        </select>
                     </div>
                     <div className="form-group">
                        <label>Due Date</label>
                        <input type="date" name="taskDate" />
                     </div>
                </div>
                <div className="modal-actions">
                    <button type="button" onClick={() => setIsTaskModalOpen(false)} className="cancel-btn">Cancel</button>
                    <button type="submit" className="save-btn">Create</button>
                </div>
            </form>
        </Modal>

        {/* Premium Task Drawer (Detail Edit) */}
        {editingTask && (
            <TaskDrawer 
                task={editingTask} 
                onClose={closeDrawer} 
                folderName={folders.find(f => f.id === editingTask.folderId)?.text || "Inbox"} 
            />
        )}
    </div>
  );
}

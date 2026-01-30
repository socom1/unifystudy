import React, { useState } from 'react';
import { useTodo, Task } from './hooks/useTodo';
import { BoardView } from './components/BoardView';
import { GroupedTaskTable } from './components/GroupedTaskTable';
import { CalendarView } from './components/CalendarView';
import { TaskDrawer } from './components/TaskDrawer'; // Import Drawer
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { Search, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, Plus } from 'lucide-react';
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
      updateFolder,
      deleteTask,
      addFolder,
      deleteFolder
  } = useTodo();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const currentFolder = folders.find(f => f.id === currentFolderId);

  // Handlers for Drawer
  const handleEditTask = (task: Task) => {
      setEditingTask(task);
      // Drawer is controlled by editingTask != null
  };

  const closeDrawer = () => {
      setEditingTask(null);
  };
  
  const handleCreateTask = () => {
      setEditingTask(null); // Clear edit
      setIsTaskModalOpen(true); // Open simple create modal
  };

  const handleSaveTask = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as any;
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
                    <WorkspaceSwitcher 
                        folders={folders}
                        currentFolderId={currentFolderId}
                        onSelectFolder={setCurrentFolderId}
                        onAddFolder={addFolder}
                        onDeleteFolder={deleteFolder}
                    />
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
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </header>

            <div className="view-content flex-1 overflow-hidden relative">
                {activeView === 'board' && (
                    <BoardView 
                        tasks={tasks}
                        columns={currentFolder?.columns || null}
                        folderId={currentFolderId}
                        onUpdateFolder={updateFolder}
                        onUpdateStatus={(tid, status) => updateTaskStatus(tid, status, tasks.find(t=>t.id===tid)?.folderId || currentFolderId || '')}
                        onUpdateTask={(tid, payload) => updateTask(tid, tasks.find(t=>t.id===tid)?.folderId || currentFolderId || '', payload)}
                        onEditTask={handleEditTask}
                        onAddTask={() => setIsTaskModalOpen(true)}
                    />
                )}
                {activeView === 'list' && (
                    <GroupedTaskTable 
                        tasks={tasks}
                        folders={folders}
                        onUpdateTask={(tid, fid, updates) => updateTask(tid, fid, updates)}
                        onToggleTask={(tid, status, fid) => updateTaskStatus(tid, status === 'done' ? 'backlog' : 'done', fid)}
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
            footer={null}
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

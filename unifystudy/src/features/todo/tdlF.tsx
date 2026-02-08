import React, { useState } from 'react';
import { useTodo, Task } from './hooks/useTodo';
import { BoardView } from './components/BoardView';
import { GroupedTaskTable } from './components/GroupedTaskTable';
import { CalendarView } from './components/CalendarView';
import { TaskDrawer } from './components/TaskDrawer'; // Import Drawer
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { TaskFilter } from './components/TaskFilter'; // Import Filter
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
      priorityFilter, setPriorityFilter, // Filter State
      assigneeFilter, setAssigneeFilter, // Filter State
      addTask,
      updateTaskStatus,
      updateTask,
      updateFolder,
      deleteTask,
      addFolder,
      deleteFolder,
      addMember,
      userProfile,
      userId
  } = useTodo();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [externalTasks, setExternalTasks] = useState<Task[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncExternal = async () => {
    setIsSyncing(true);
    try {
        const newExternalTasks: Task[] = [];
        
        // Google Tasks
        try {
            // We need a token. For now, we reuse the connect flow or check if we stored it?
            // Re-triggering auth popup is the safest "stateless" way for this MVP without a complex AuthContext.
            // But doing both might be annoying. Let's try to just do Google for now if the user clicks "Sync Google"
            // Or better: Just a "Sync" button that asks which one or tries both if we had tokens.
            // Let's implement a simple prompt or just try to connect (it will be fast if session active).
            
            // For now, let's keep it simple: sync functionality via a button that might trigger popups.
            // Ideally we'd store the accessToken in memory/context after Settings page connect.
            const googleToken = await import("@/services/googleCalendar").then(m => m.connectGoogleCalendar());
            const gTasks = await import("@/services/googleCalendar").then(m => m.fetchGoogleTasks(googleToken));
            
            gTasks.forEach((t: any) => {
                newExternalTasks.push({
                    id: `google-${t.id}`,
                    text: t.title,
                    status: t.status === 'completed' ? 'done' : 'backlog',
                    folderId: 'google-tasks',
                    createdAt: new Date(t.updated).getTime(),
                    priority: 'medium',
                    tags: [{ label: 'Google', color: '#DB4437' }],
                    isActive: true,
                    order: 0,
                    description: t.notes || '',
                    color: '#DB4437'
                });
            });
            toast.success(`Synced ${gTasks.length} Google Tasks`);
        } catch (e) { console.log('Google Sync skipped/failed', e); }

        // Outlook Tasks
        try {
            const msToken = await import("@/services/microsoftIntegration").then(m => m.connectMicrosoft());
            const msTasks = await import("@/services/microsoftIntegration").then(m => m.fetchMicrosoftToDo(msToken));
            
            msTasks.forEach((t: any) => {
                 newExternalTasks.push({
                    id: `outlook-${t.id}`,
                    text: t.title,
                    status: t.status === 'completed' ? 'done' : 'backlog',
                    folderId: 'outlook-tasks',
                    createdAt: new Date(t.createdDateTime).getTime(),
                    priority: t.importance === 'high' ? 'high' : 'medium',
                    tags: [{ label: 'Outlook', color: '#0078D4' }, { label: t.listName || 'Tasks', color: '#0078D4' }],
                    isActive: true,
                    order: 0,
                    description: t.body?.content || '',
                    color: '#0078D4'
                });
            });
             toast.success(`Synced ${msTasks.length} Outlook Tasks`);
        } catch (e) { console.log('Outlook Sync skipped/failed', e); }

        setExternalTasks(newExternalTasks);

    } catch (err) {
        toast.error("Sync failed");
    } finally {
        setIsSyncing(false);
    }
  };


  const currentFolder = folders.find(f => f.id === currentFolderId);
  
  // Computed live task for drawer to ensure reactivity (comments, checklist etc)
  const editingTask = [...tasks, ...externalTasks].find(t => t.id === editingTaskId) || null;

  // Handlers for Drawer
  const handleEditTask = (task: Task) => {
      setEditingTaskId(task.id);
  };

  const closeDrawer = () => {
      setEditingTaskId(null);
  };
  
  const handleCreateTask = () => {
      setEditingTaskId(null); // Clear edit
      setIsTaskModalOpen(true); // Open simple create modal
  };

  const handleSaveTask = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as any;
      const text = form.taskText.value;
      const status = form.taskStatus.value;
      const date = form.taskDate.value;
      const priority = form.taskPriority.value;
      
      if (text) {
          addTask(text, currentFolderId, { 
              status: status || 'backlog',
              dueDate: date,
              priority: priority as any // simplified casting
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
                        onAddMember={addMember}
                    />
                </div>

                <div className="center-actions">
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
                </div>

                <div className="controls-area">
                    <TaskFilter 
                        priorityFilter={priorityFilter}
                        setPriorityFilter={setPriorityFilter}
                        assigneeFilter={assigneeFilter}
                        setAssigneeFilter={setAssigneeFilter}
                        tags={[]} 
                    />
                    <button className="secondary-btn" onClick={handleSyncExternal} disabled={isSyncing} title="Sync External Tasks">
                        {isSyncing ? <div className="spinner-sm" /> : <CalendarIcon size={16} />}
                    </button>
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
                        tasks={[...tasks, ...externalTasks]}
                        columns={currentFolder?.columns || null}
                        folderId={currentFolderId}
                        userProfile={{...userProfile, userId: userId || undefined}}
                        onUpdateFolder={updateFolder}
                        onUpdateStatus={(tid, status) => {
                            if(tid.startsWith('google') || tid.startsWith('outlook')) return toast.info("External task status update not synced back yet.");
                            updateTaskStatus(tid, status, tasks.find(t=>t.id===tid)?.folderId || currentFolderId || '')
                        }}
                        onUpdateTask={(tid, payload) => {
                             if(tid.startsWith('google') || tid.startsWith('outlook')) return;
                             updateTask(tid, tasks.find(t=>t.id===tid)?.folderId || currentFolderId || '', payload)
                        }}
                        onEditTask={handleEditTask}
                        onAddTask={() => setIsTaskModalOpen(true)}
                    />
                )}
                {activeView === 'list' && (
                    <GroupedTaskTable 
                        tasks={[...tasks, ...externalTasks]}
                        folders={folders}
                        onUpdateTask={(tid, fid, updates) => {
                             if(tid.startsWith('google') || tid.startsWith('outlook')) return;
                             updateTask(tid, fid, updates)
                        }}
                        onToggleTask={(tid, status, fid) => {
                             if(tid.startsWith('google') || tid.startsWith('outlook')) return toast.info("External task status update not synced back yet.");
                             updateTaskStatus(tid, status === 'done' ? 'backlog' : 'done', fid)
                        }}
                        onEditTask={handleEditTask}
                        onDeleteTask={(tid) => {
                             if(tid.startsWith('google') || tid.startsWith('outlook')) {
                                 setExternalTasks(prev => prev.filter(t => t.id !== tid));
                                 return;
                             }
                             const task = tasks.find(t => t.id === tid);
                             if (task && task.folderId) {
                                deleteTask(tid, task.folderId);
                             }
                        }}
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
                     <div className="form-group">
                        <label>Priority</label>
                        <select name="taskPriority" defaultValue="medium">
                             <option value="low">Low</option>
                             <option value="medium">Medium</option>
                             <option value="high">High</option>
                        </select>
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
                userProfile={{...userProfile, userId: userId || undefined}} // Consistent
            />
        )}
    </div>
  );
}

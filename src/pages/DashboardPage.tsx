import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  Plus,
  Search,
  Filter,
  LogOut,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { setFilter, reorderTasks, clearFilters, fetchTasks, updateTask } from '@/store/slices/tasksSlice';
import TaskCard from '@/components/TaskCard';
import CreateTaskDialog from '@/components/CreateTaskDialog';
import { Task } from '@/config/api';

type ViewMode = 'board' | 'list';

const DashboardPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { tasks, filter } = useAppSelector((state) => state.tasks);

  // Fetch tasks on mount and when filters change
  useEffect(() => {
    dispatch(fetchTasks({ useFilters: true }));
  }, [dispatch, filter.status, filter.type, filter.priority, filter.search]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId;
    const taskId = result.draggableId;

    // If moved to a different column, update status on the server
    if (sourceStatus !== destStatus) {
      dispatch(updateTask({ id: taskId, updates: { status: destStatus as Task['status'] } } as any));
    } else {
      // Same column reorder locally
      dispatch(reorderTasks({
        sourceIndex: result.source.index,
        destinationIndex: result.destination.index,
      }));
    }
  };

  // Use server-provided filtered tasks
  const filteredTasks = tasks;

  // Group tasks by status for board view
  const tasksByStatus = {
    todo: filteredTasks.filter((t) => t.status === 'todo'),
    'in-progress': filteredTasks.filter((t) => t.status === 'in-progress'),
    done: filteredTasks.filter((t) => t.status === 'done'),
  };

  const statusLabels: Record<string, string> = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    done: 'Done',
  };

  const statusColors: Record<string, string> = {
    todo: 'bg-muted',
    'in-progress': 'bg-primary/10',
    done: 'bg-success/10',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TaskFlow</h1>
              <p className="text-sm text-muted-foreground">Welcome back {user?.name}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={filter.search}
                onChange={(e) => dispatch(setFilter({ search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={filter.type || 'all'}
                onValueChange={(value) => dispatch(setFilter({ type: value === 'all' ? null : value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filter.priority || 'all'}
                onValueChange={(value) => dispatch(setFilter({ priority: value === 'all' ? null : value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {(filter.type || filter.priority || filter.search) && (
                <Button variant="ghost" size="sm" onClick={() => dispatch(clearFilters())}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Create Task Button */}
            <Button variant="hero" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Task Board View */}
        {viewMode === 'board' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                <div key={status} className="space-y-4">
                  <div className={`px-4 py-2 rounded-lg ${statusColors[status]}`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-sm uppercase tracking-wider">
                        {statusLabels[status]}
                      </h2>
                      <span className="text-sm text-muted-foreground">{statusTasks.length}</span>
                    </div>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[200px] rounded-lg p-2 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-muted/50' : ''
                        }`}
                      >
                        <AnimatePresence>
                          {statusTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <TaskCard
                                    task={task}
                                    isDragging={snapshot.isDragging}
                                    onClick={() => { setSelectedTask(task); setIsCreateOpen(true); }}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </AnimatePresence>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {/* Task List View */}
        {viewMode === 'list' && (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <TaskCard task={task} variant="list" />
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tasks found. Create one to get started!
              </div>
            )}
          </div>
        )}
      </main>

      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setSelectedTask(null);
        }}
        task={selectedTask}
      />
    </div>
  );
};

export default DashboardPage;

import { motion } from 'framer-motion';
import { Bug, Lightbulb, Rocket, FileText, Trash2, GripVertical, MoreHorizontal } from 'lucide-react';
import { Task } from '@/config/api';
import { useAppDispatch } from '@/store/hooks';
import { updateTask, deleteTask } from '@/store/slices/tasksSlice';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  variant?: 'card' | 'list';
  onClick?: () => void;
}

const typeConfig = {
  bug: {
    icon: Bug,
    label: 'Bug',
    className: 'bg-task-bug/10 text-task-bug',
  },
  feature: {
    icon: Rocket,
    label: 'Feature',
    className: 'bg-task-feature/10 text-task-feature',
  },
  improvement: {
    icon: Lightbulb,
    label: 'Improvement',
    className: 'bg-task-improvement/10 text-task-improvement',
  },
  documentation: {
    icon: FileText,
    label: 'Documentation',
    className: 'bg-task-documentation/10 text-task-documentation',
  },
};

const priorityConfig = {
  high: { label: 'High', className: 'bg-destructive/10 text-destructive' },
  medium: { label: 'Medium', className: 'bg-warning/10 text-warning' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
};

const TaskCard = ({ task, isDragging, variant = 'card', onClick }: TaskCardProps) => {
  const dispatch = useAppDispatch();
  const TypeIcon = typeConfig[task.type].icon;

  const handleStatusChange = (status: Task['status']) => {
    dispatch(updateTask({ id: task.id, updates: { status } } as any));
  };

  const handleDelete = () => {
    dispatch(deleteTask(task.id) as any);
  };

  if (variant === 'list') {
    return (
      <div onClick={onClick} className="p-4 rounded-lg bg-card border border-border hover:shadow-md transition-all flex items-center gap-4">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
        
        <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium', typeConfig[task.type].className)}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig[task.type].label}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground truncate">{task.description}</p>
          )}
        </div>

        <div className={cn('px-2 py-1 rounded text-xs font-medium', priorityConfig[task.priority].className)}>
          {priorityConfig[task.priority].label}
        </div>

        <Select value={task.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg bg-card border border-border transition-all cursor-grab active:cursor-grabbing',
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium', typeConfig[task.type].className)}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig[task.type].label}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
              Move to To Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('in-progress')}>
              Move to In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('done')}>
              Move to Done
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-medium mb-2 leading-snug">{task.title}</h3>
      
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityConfig[task.priority].className)}>
          {priorityConfig[task.priority].label}
        </div>
      </div>
    </motion.div>
  );
};

export default TaskCard;

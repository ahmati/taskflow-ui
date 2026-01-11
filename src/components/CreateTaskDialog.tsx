import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bug, Rocket, Lightbulb, FileText, Loader2 } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { createTask, updateTask } from '@/store/slices/tasksSlice';
import { Task } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
}

const typeOptions = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-task-bug' },
  { value: 'feature', label: 'Feature', icon: Rocket, color: 'text-task-feature' },
  { value: 'improvement', label: 'Improvement', icon: Lightbulb, color: 'text-task-improvement' },
  { value: 'documentation', label: 'Documentation', icon: FileText, color: 'text-task-documentation' },
];

const CreateTaskDialog = ({ open, onOpenChange, task }: CreateTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Task['type']>('feature');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a task title',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (task) {
        // Edit existing task
        await dispatch(updateTask({ id: task.id, updates: {
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
        } } as any)).unwrap();

        toast({
          title: 'Task updated!',
          description: 'Your task has been updated.',
        });
      } else {
        await dispatch(createTask({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
        })).unwrap();

        toast({
          title: 'Task created!',
          description: 'Your new task has been added to the board.',
        });
      }
    } catch (err: any) {
      toast({
        title: task ? 'Update failed' : 'Create failed',
        description: err?.message || (task ? 'Unable to update task' : 'Unable to create task'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Reset form
    setTitle('');
    setDescription('');
    setType('feature');
    setPriority('medium');
    setIsLoading(false);
    onOpenChange(false);
  };

  // When opening for edit, populate fields
  useEffect(() => {
    if (open && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setType(task.type || 'feature');
      setPriority(task.priority || 'medium');
    }
    if (!open) {
      setTitle('');
      setDescription('');
      setType('feature');
      setPriority('medium');
    }
  }, [open, task]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {task ? 'Update the task details below.' : 'Add a new task to your board. Fill in the details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as Task['type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className={`w-4 h-4 ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <span className="text-destructive font-medium">High</span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="text-warning font-medium">Medium</span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="text-muted-foreground">Low</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                task ? 'Save Changes' : 'Create Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;

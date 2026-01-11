import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, CreateTaskPayload, tasksApi } from '@/config/api';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  filter: {
    status: string | null;
    type: string | null;
    priority: string | null;
    search: string;
  };
}

const initialState: TasksState = {
  tasks: [],
  isLoading: false,
  error: null,
  filter: {
    status: null,
    type: null,
    priority: null,
    search: '',
  },
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (
    payload: { useFilters?: boolean; filters?: Record<string, string> } = { useFilters: true },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { tasks: TasksState };
      const { filter } = state.tasks;
      const params: Record<string, string> = {};

      if (payload.filters) {
        Object.assign(params, payload.filters);
      } else if (payload.useFilters !== false) {
        if (filter.status) params.status = filter.status;
        if (filter.type) params.type = filter.type;
        if (filter.priority) params.priority = filter.priority;
        if (filter.search) params.search = filter.search;
      }

      const tasks = await tasksApi.getAll(Object.keys(params).length ? params : undefined);
      return tasks;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tasks');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (task: CreateTaskPayload, { rejectWithValue, dispatch }) => {
    try {
      const newTask = await tasksApi.create(task);
      // Refresh list from server to ensure server-side ordering/fields are used
      await dispatch(fetchTasks({ useFilters: false })).unwrap();
      return newTask;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create task');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, updates }: { id: string; updates: Partial<Task> }, { rejectWithValue, dispatch }) => {
    let updatedTask;
    try {
      if (updates.status) {
        updatedTask = await tasksApi.updateStatus(id, updates.status as Task['status']);
      } else {
        updatedTask = await tasksApi.update(id, updates);
      }
      return updatedTask;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update task');
    } finally {
      try {
        await dispatch(fetchTasks({ useFilters: false })).unwrap();
      } catch {
        // ignore fetch errors here; original error (if any) will be returned above
      }
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await tasksApi.delete(id);
      // Refresh list after deletion
      await dispatch(fetchTasks({ useFilters: false })).unwrap();
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete task');
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<TasksState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilters: (state) => {
      state.filter = { status: null, type: null, priority: null, search: '' };
    },
    reorderTasks: (state, action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>) => {
      const { sourceIndex, destinationIndex } = action.payload;
      const [removed] = state.tasks.splice(sourceIndex, 1);
      state.tasks.splice(destinationIndex, 0, removed);
      // Update order property
      state.tasks.forEach((task, index) => {
        task.order = index;
      });
    },
    // Local task operations for demo mode
    addTaskLocal: (state, action: PayloadAction<CreateTaskPayload>) => {
      const newTask: Task = {
        id: Date.now().toString(),
        ...action.payload,
        description: action.payload.description || '',
        status: 'todo',
        order: state.tasks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.tasks.push(newTask);
    },
    updateTaskLocal: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
      const index = state.tasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...action.payload.updates, updatedAt: new Date().toISOString() };
      }
    },
    deleteTaskLocal: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // create/update/delete handled by fetchTasks() which refreshes the list
      ;
  },
});

export const { setFilter, clearFilters, reorderTasks, addTaskLocal, updateTaskLocal, deleteTaskLocal } = tasksSlice.actions;
export default tasksSlice.reducer;

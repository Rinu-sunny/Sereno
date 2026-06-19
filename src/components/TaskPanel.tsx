import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, CheckCircle2, Circle, ArrowUp, ArrowDown } from "lucide-react";
import axios from 'axios';
import { supabase } from '@/supabaseClient';

// --- Define the Task type to match your backend model ---
interface BackendTask {
  id: string; // Changed from number to string (Guid)
  title: string; // Renamed from text
  isComplete: boolean; // Renamed from completed
  // Add other fields from your C# TaskItem model if needed for display/logic
  description?: string | null;
  targetPomodoros: number;
  completedPomodoros: number;
  createdAt: string; // Or Date
  tags: string; // Keep as string (jsonb in backend)
  order: number;
  dueDate?: string | null; // Or Date | null
  updatedAt?: string | null; // Or Date | null
}

const API_BASE_URL = 'https://localhost:5001/api'; // Your backend base URL (we'll fallback to http)
const LOCAL_TASKS_KEY = 'sereno-local-tasks';

// --- Function to get the JWT token ---
// Assumes you saved the session in localStorage after login in Auth.tsx
const getToken = async (): Promise<string | null> => {
  try {
    // Try to read from Supabase client session first
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? null;
      if (token) return token;
    } catch (e) {
      // ignore and try localStorage fallback
    }

    // Supabase v2 stores the session under a key starting with sb- and ending with -auth-token
    const sessionKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (!sessionKey) return null;

    const sessionData = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    return sessionData?.access_token || null;
  } catch (error) {
    console.error('Error retrieving token from storage:', error);
    return null;
  }
};

// --- Function to get headers with token ---
const getAuthHeaders = async () => {
  const token = await getToken();
  if (!token) {
    console.warn('No auth token found. User might need to log in.');
    return null;
  }
  return { Authorization: `Bearer ${token}` };
};

// --- API Call Functions ---
const fetchTasksApi = async (): Promise<BackendTask[]> => {
  console.log('Fetching tasks from API...');
  const headers = await getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');

  try {
    // Try HTTPS first (dev cert may be untrusted) then fallback to HTTP
    try {
      const resp = await axios.get<BackendTask[]>(`${API_BASE_URL}/tasks`, { headers });
      console.log('Tasks fetched (HTTPS):', resp.data);
      return resp.data;
    } catch (err) {
      console.warn('HTTPS tasks fetch failed, trying HTTP', err);
      const resp = await axios.get<BackendTask[]>(`${API_BASE_URL.replace('https://localhost:5001', 'http://localhost:5000')}/tasks`, { headers });
      console.log('Tasks fetched (HTTP):', resp.data);
      return resp.data;
    }
  } catch (err) {
    console.error('Failed to fetch tasks API:', err);
    throw err;
  }
};

// Adjusted to match backend expectation for CreateTask
const addTaskApi = async (newTaskData: { title: string; targetPomodoros: number; tags: string; dueDate?: string | null; /* other optional fields */ }): Promise<BackendTask> => {
  console.log('Adding task via API:', newTaskData);
  const headers = await getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');

  try {
    try {
      const resp = await axios.post<BackendTask>(`${API_BASE_URL}/tasks`, newTaskData, { headers });
      console.log('Task added (HTTPS):', resp.data);
      return resp.data;
    } catch (err) {
      console.warn('HTTPS add task failed, trying HTTP', err);
      const resp = await axios.post<BackendTask>(`${API_BASE_URL.replace('https://localhost:5001', 'http://localhost:5000')}/tasks`, newTaskData, { headers });
      console.log('Task added (HTTP):', resp.data);
      return resp.data;
    }
  } catch (err) {
    console.error('Failed to add task:', err);
    throw err;
  }
};

// 💡 FIX APPLIED: Changed updatedFields type to BackendTask (not Partial) 
// to ensure all required fields are sent in the PUT request.
const updateTaskApi = async (id: string, updatedFields: BackendTask): Promise<BackendTask> => {
  console.log(`Updating task ${id} via API:`, updatedFields);
  const headers = await getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');

  try {
    try {
      const resp = await axios.put<BackendTask>(`${API_BASE_URL}/tasks/${id}`, updatedFields, { headers });
      console.log('Task updated (HTTPS):', resp.data);
      return resp.data;
    } catch (err) {
      console.warn('HTTPS update failed, trying HTTP', err);
      const resp = await axios.put<BackendTask>(`${API_BASE_URL.replace('https://localhost:5001', 'http://localhost:5000')}/tasks/${id}`, updatedFields, { headers });
      console.log('Task updated (HTTP):', resp.data);
      return resp.data;
    }
  } catch (err) {
    console.error('Failed to update task:', err);
    throw err;
  }
};

const deleteTaskApi = async (id: string): Promise<void> => {
  console.log(`Deleting task ${id} via API...`);
  const headers = await getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');

  try {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${id}`, { headers });
      console.log(`Task ${id} deleted (HTTPS).`);
    } catch (err) {
      console.warn('HTTPS delete failed, trying HTTP', err);
      await axios.delete(`${API_BASE_URL.replace('https://localhost:5001', 'http://localhost:5000')}/tasks/${id}`, { headers });
      console.log(`Task ${id} deleted (HTTP).`);
    }
  } catch (err) {
    console.error('Failed to delete task:', err);
    throw err;
  }
};

const reorderTasksApi = async (orderedIds: string[]): Promise<void> => {
  const headers = await getAuthHeaders();
  if (!headers) throw new Error('Not authenticated');

  try {
    try {
      await axios.put(`${API_BASE_URL}/tasks/reorder`, orderedIds, { headers });
    } catch (err) {
      console.warn('HTTPS reorder failed, trying HTTP', err);
      await axios.put(`${API_BASE_URL.replace('https://localhost:5001', 'http://localhost:5000')}/tasks/reorder`, orderedIds, { headers });
    }
  } catch (err) {
    console.error('Failed to reorder tasks:', err);
    throw err;
  }
};


// --- Your Updated TaskPanel Component ---
const TaskPanel = () => {
  const [tasks, setTasks] = useState<BackendTask[]>([]); // Use BackendTask type
  const [taskInput, setTaskInput] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const [error, setError] = useState<string | null>(null); // Added error state

  const placeIncompleteFirst = (list: BackendTask[]): BackendTask[] => {
    const incomplete = list.filter((task) => !task.isComplete);
    const complete = list.filter((task) => task.isComplete);
    return [...incomplete, ...complete];
  };

  const loadLocalTasks = (): BackendTask[] => {
    try {
      const raw = localStorage.getItem(LOCAL_TASKS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as BackendTask[] : [];
    } catch {
      return [];
    }
  };

  const saveLocalTasks = (nextTasks: BackendTask[]) => {
    try {
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(nextTasks));
    } catch {
      // ignore storage failures
    }
  };

  const toErrorText = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const maybe = value as { error?: unknown; message?: unknown; title?: unknown };
      if (typeof maybe.error === "string") return maybe.error;
      if (typeof maybe.message === "string") return maybe.message;
      if (typeof maybe.title === "string") return maybe.title;
      try {
        return JSON.stringify(value);
      } catch {
        return "Unexpected error";
      }
    }
    return "Unexpected error";
  };

  const isNotAuthenticatedError = (value: unknown): boolean => {
    const text = toErrorText(value).toLowerCase();
    return text.includes("not authenticated") || text.includes("401") || text.includes("jwt");
  };

  const isGuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const toTimeValue = (totalMinutes: number): string => {
    const safeMinutes = Math.max(totalMinutes, 0);
    const hh = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
    const mm = String(safeMinutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const buildDueDateFromTime = (time: string, existingDueDate?: string | null): string | null => {
    if (!time) return null;
    const [hh, mm] = time.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

    // Interpret the input as a duration (HH:MM), not a clock time.
    // Example: 00:03 means current time + 3 minutes.
    const minutesToAdd = (hh * 60) + mm;
    if (minutesToAdd <= 0) return null;

    const base = existingDueDate ? new Date(existingDueDate) : new Date();
    if (Number.isNaN(base.getTime())) return null;

    const next = new Date(base.getTime() + (minutesToAdd * 60 * 1000));
    return next.toISOString();
  };

  const targetPomodorosFromTime = (time: string): number => {
    if (!time) return 1;
    const [hh, mm] = time.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return 1;

    const totalMinutes = (hh * 60) + mm;
    return Math.max(totalMinutes, 1);
  };

  const durationMinutesFromInput = (time: string): number => {
    if (!time) return 0;
    const [hh, mm] = time.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
    const totalMinutes = (hh * 60) + mm;
    return Math.max(totalMinutes, 0);
  };

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear previous errors
      const fetchedTasks = await fetchTasksApi();
      const sorted = placeIncompleteFirst(fetchedTasks);
      setTasks(sorted);
      saveLocalTasks(sorted);
    } catch (err: unknown) {
      console.error("Failed to fetch tasks:", err);
      if (isNotAuthenticatedError(err)) {
        setTasks([]);
        setError("Please sign in to view tasks.");
        return;
      }
      const localTasks = loadLocalTasks();
      if (localTasks.length > 0) {
        const sorted = placeIncompleteFirst(localTasks);
        setTasks(sorted);
        saveLocalTasks(sorted);
        setError(null);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load tasks. Please ensure you are logged in and the backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Fetch tasks when component mounts ---
  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Keep the list synced when timer completes a work session.
  useEffect(() => {
    const handleRefresh = () => {
      void loadTasks();
    };

    window.addEventListener("sereno:refresh-tasks", handleRefresh);
    return () => {
      window.removeEventListener("sereno:refresh-tasks", handleRefresh);
    };
  }, [loadTasks]);

  // --- Add Task ---
  const addTask = async () => {
    if (taskInput.trim()) {
      // Clear previous errors
      setError(null);
      try {
        const newTaskData = {
          title: taskInput,
          // You might want to get these from other inputs later
          targetPomodoros: targetPomodorosFromTime(newTaskTime),
          tags: "[]", // Default empty JSON array string
          dueDate: buildDueDateFromTime(newTaskTime)
        };
        const addedTask = await addTaskApi(newTaskData);
        setTasks(prevTasks => {
          const next = placeIncompleteFirst([addedTask, ...prevTasks]);
          saveLocalTasks(next);
          return next;
        }); // Add the task returned from backend
        setTaskInput(""); // Clear input field
        setNewTaskTime("");
      } catch (err: unknown) {
        console.error("Failed to add task:", err);
        if (isNotAuthenticatedError(err)) {
          setError("Please sign in to add tasks.");
          return;
        }
        // Keep app usable during backend outages by creating a local-only task.
        const localTask: BackendTask = {
          id: `local-${Date.now()}`,
          title: taskInput,
          isComplete: false,
          description: null,
          targetPomodoros: targetPomodorosFromTime(newTaskTime),
          completedPomodoros: 0,
          createdAt: new Date().toISOString(),
          tags: "[]",
          order: tasks.length,
          dueDate: buildDueDateFromTime(newTaskTime),
          updatedAt: new Date().toISOString(),
        };
        setTasks(prevTasks => {
          const next = placeIncompleteFirst([localTask, ...prevTasks]);
          saveLocalTasks(next);
          return next;
        });
        setTaskInput("");
        setNewTaskTime("");

        const msg = axios.isAxiosError(err)
          ? toErrorText(err.response?.data) || err.message
          : err instanceof Error
            ? err.message
            : toErrorText(err);
        console.warn(`Task saved locally only. Backend returned an error: ${msg}`);
        setError(null);
      }
    }
  };

  // --- Toggle Task Completion ---
  const toggleTask = async (id: string) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle) return;

    const togglingToComplete = !taskToToggle.isComplete;

    // 💡 FIX APPLIED: Create the complete task object with the new status.
    const updatedTaskData: BackendTask = { 
        ...taskToToggle, 
      isComplete: togglingToComplete,
      // Keep configured task time intact, but always keep bracket at zero on manual toggle.
      completedPomodoros: taskToToggle.targetPomodoros,
      updatedAt: new Date().toISOString(),
    };

    // Clear previous errors
    setError(null);
    try {
      // Send the ENTIRE task object
      const updatedTask = await updateTaskApi(id, updatedTaskData);
      // Update the state with the complete task returned from the backend
      setTasks(prevTasks => {
        const next = placeIncompleteFirst(prevTasks.map((t) => (t.id === id ? updatedTask : t)));
        saveLocalTasks(next);
        return next;
      });
    } catch (err: unknown) {
      console.error("Failed to toggle task:", err);
      if (isNotAuthenticatedError(err)) {
        setError("Please sign in to update tasks.");
        return;
      }
      setTasks(prevTasks => {
        const next = placeIncompleteFirst(prevTasks.map((t) => (t.id === id ? updatedTaskData : t)));
        saveLocalTasks(next);
        return next;
      });
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Updated locally only. Backend returned an error: ${msg || "Unknown error"}`);
      setError(null);
    }
  };

  // --- Delete Task ---
  const deleteTask = async (id: string) => {
    // Optimistic UI update: remove immediately from the list
    setTasks(prevTasks => {
      const next = prevTasks.filter((t) => t.id !== id);
      saveLocalTasks(next);
      return next;
    });
    // Clear previous errors
    setError(null);
    try {
      await deleteTaskApi(id);
      // If API call succeeds, state is already correct
    } catch (err: unknown) {
      console.error("Failed to delete task:", err);
      if (isNotAuthenticatedError(err)) {
        setError("Please sign in to delete tasks.");
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Deleted locally only. Backend returned an error: ${msg || "Unknown error"}`);
      setError(null);
    }
  };

  const moveTask = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    setError(null);

    const original = [...tasks];
    const reordered = [...tasks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const withOrder = reordered.map((task, i) => ({ ...task, order: i }));
    const sorted = placeIncompleteFirst(withOrder);
    setTasks(sorted);
    saveLocalTasks(sorted);

    const persistedTasks = sorted.filter((t) => isGuid(t.id));
    if (persistedTasks.length === 0) return;

    try {
      await reorderTasksApi(persistedTasks.map((t) => t.id));
    } catch (err: unknown) {
      if (isNotAuthenticatedError(err)) {
        setError("Please sign in to prioritize tasks.");
      } else {
        // Keep local order but surface why backend did not persist.
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Task order saved locally only. Backend returned an error: ${msg || "Unknown error"}`);
        setError(null);
      }
      // Keep local order experience; do not rollback unless you prefer strict server source-of-truth.
      void original;
    }
  };

  const updateTaskTime = async (task: BackendTask, time: string) => {
    const minutesToAdd = durationMinutesFromInput(time);
    if (minutesToAdd <= 0) return;

    const nextTargetPomodoros = task.targetPomodoros + minutesToAdd;
    const updatedTaskData: BackendTask = {
      ...task,
      dueDate: buildDueDateFromTime(time, task.dueDate),
      targetPomodoros: nextTargetPomodoros,
      isComplete: task.completedPomodoros >= nextTargetPomodoros,
      updatedAt: new Date().toISOString(),
    };

    setError(null);

    try {
      const updatedTask = await updateTaskApi(task.id, updatedTaskData);
      setTasks((prevTasks) => {
        const next = placeIncompleteFirst(prevTasks.map((t) => (t.id === task.id ? updatedTask : t)));
        saveLocalTasks(next);
        return next;
      });
    } catch (err: unknown) {
      if (isNotAuthenticatedError(err)) {
        setError("Please sign in to update task time.");
        return;
      }

      // Keep local edit even if backend is temporarily unavailable.
      setTasks((prevTasks) => {
        const next = placeIncompleteFirst(prevTasks.map((t) => (t.id === task.id ? updatedTaskData : t)));
        saveLocalTasks(next);
        return next;
      });
    }
  };

  // --- JSX (Adjusted for BackendTask fields, loading, and error) ---
  return (
    <div className="w-full max-w-md glass-panel rounded-2xl p-6">
      <h3 className="text-2xl font-bold mb-4 text-foreground">Tasks</h3>

      {/* Input Form - UI FIX APPLIED HERE */}
      <div className="flex items-center gap-2 mb-4"> 
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a new task title..."
          className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
        />
        <input
          type="time"
          value={newTaskTime}
          onChange={(e) => setNewTaskTime(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
          aria-label="Task time"
          title="Task time"
        />
        <button
          onClick={addTask}
          // Ensured the button height matches the input for alignment
          className="p-2 h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex-shrink-0"
          aria-label="Add task"
          disabled={isLoading || !taskInput.trim()}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display */}
      {error && <p className="text-destructive text-sm mb-2 text-center">{error}</p>}

      {/* Task List */}
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <li className="text-center text-muted-foreground py-8 list-none">Loading tasks...</li>
        ) : tasks.length === 0 && !error ? (
          <li className="text-center text-muted-foreground py-8 list-none">No tasks yet. Add one!</li>
        ) : (
          tasks.map((task, index) => {
            const remainingPomodoros = Math.max(task.targetPomodoros - task.completedPomodoros, 0);

            return (
            <li
              key={task.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all group"
            >
              <button
                onClick={() => toggleTask(task.id)}
                className="flex-shrink-0"
                aria-label={task.isComplete ? "Mark as incomplete" : "Mark as complete"}
              >
                {task.isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <span
                className={`flex-1 ${
                  task.isComplete ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {task.title} {/* Changed from text */}
                {!task.isComplete && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({remainingPomodoros} min left)
                  </span>
                )}
              </span>
              <input
                type="time"
                value={toTimeValue(task.targetPomodoros)}
                onChange={(e) => updateTaskTime(task, e.target.value)}
                className="px-2 py-1 bg-white/5 border border-white/20 rounded text-foreground text-sm"
                aria-label="Set task time"
                title="Set task time"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveTask(index, -1)}
                  disabled={index === 0}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move task up"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveTask(index, 1)}
                  disabled={index === tasks.length - 1}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Move task down"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
          })
        )}
      </ul>
    </div>
  );
};

export default TaskPanel;
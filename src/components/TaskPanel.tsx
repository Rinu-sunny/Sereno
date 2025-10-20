import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import axios from 'axios';

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

const API_BASE_URL = 'https://localhost:5001/api'; // Your backend base URL

// --- Function to get the JWT token ---
// Assumes you saved the session in localStorage after login in Auth.tsx
const getToken = (): string | null => {
  try {
    // Supabase v2 stores the session under this key
    const sessionKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (!sessionKey) return null;

    const sessionData = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    return sessionData?.access_token || null;
  } catch (error) {
    console.error("Error retrieving token from localStorage:", error);
    return null;
  }
};

// --- Function to get headers with token ---
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) {
    console.error("No auth token found! User might need to log in again.");
    // In a real app, you might redirect to login here
    throw new Error("Authentication token not found.");
  }
  return { 'Authorization': `Bearer ${token}` };
};

// --- API Call Functions ---
const fetchTasksApi = async (): Promise<BackendTask[]> => {
  console.log("Fetching tasks from API...");
  const response = await axios.get<BackendTask[]>(`${API_BASE_URL}/tasks`, { headers: getAuthHeaders() });
  console.log("Tasks fetched:", response.data);
  return response.data;
};

// Adjusted to match backend expectation for CreateTask
const addTaskApi = async (newTaskData: { title: string; targetPomodoros: number; tags: string; /* other optional fields */ }): Promise<BackendTask> => {
  console.log("Adding task via API:", newTaskData);
  const response = await axios.post<BackendTask>(`${API_BASE_URL}/tasks`, newTaskData, { headers: getAuthHeaders() });
  console.log("Task added:", response.data);
  return response.data;
};

// 💡 FIX APPLIED: Changed updatedFields type to BackendTask (not Partial) 
// to ensure all required fields are sent in the PUT request.
const updateTaskApi = async (id: string, updatedFields: BackendTask): Promise<BackendTask> => {
  console.log(`Updating task ${id} via API:`, updatedFields);
  const response = await axios.put<BackendTask>(`${API_BASE_URL}/tasks/${id}`, updatedFields, { headers: getAuthHeaders() });
  console.log("Task updated:", response.data);
  return response.data;
};

const deleteTaskApi = async (id: string): Promise<void> => {
  console.log(`Deleting task ${id} via API...`);
  await axios.delete(`${API_BASE_URL}/tasks/${id}`, { headers: getAuthHeaders() });
  console.log(`Task ${id} deleted.`);
};


// --- Your Updated TaskPanel Component ---
const TaskPanel = () => {
  const [tasks, setTasks] = useState<BackendTask[]>([]); // Use BackendTask type
  const [taskInput, setTaskInput] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const [error, setError] = useState<string | null>(null); // Added error state

  // --- Fetch tasks when component mounts ---
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true);
        setError(null); // Clear previous errors
        const fetchedTasks = await fetchTasksApi();
        setTasks(fetchedTasks);
      } catch (err: any) {
        console.error("Failed to fetch tasks:", err);
        setError(err.message || "Failed to load tasks. Please ensure you are logged in and the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, []); // Empty dependency array means run once on mount

  // --- Add Task ---
  const addTask = async () => {
    if (taskInput.trim()) {
      // Clear previous errors
      setError(null);
      try {
        const newTaskData = {
          title: taskInput,
          // You might want to get these from other inputs later
          targetPomodoros: 1,
          tags: "[]" // Default empty JSON array string
        };
        const addedTask = await addTaskApi(newTaskData);
        setTasks(prevTasks => [...prevTasks, addedTask]); // Add the task returned from backend
        setTaskInput(""); // Clear input field
      } catch (err: any) {
        console.error("Failed to add task:", err);
        setError(err.message || "Failed to add task. Please try again.");
      }
    }
  };

  // --- Toggle Task Completion ---
  const toggleTask = async (id: string) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle) return;

    // 💡 FIX APPLIED: Create the complete task object with the new status.
    const updatedTaskData: BackendTask = { 
        ...taskToToggle, 
        isComplete: !taskToToggle.isComplete 
    };

    // Clear previous errors
    setError(null);
    try {
      // Send the ENTIRE task object
      const updatedTask = await updateTaskApi(id, updatedTaskData);
      // Update the state with the complete task returned from the backend
      setTasks(prevTasks => prevTasks.map((t) => (t.id === id ? updatedTask : t)));
    } catch (err: any) {
      console.error("Failed to toggle task:", err);
      setError(err.message || "Failed to update task completion. Please try again.");
    }
  };

  // --- Delete Task ---
  const deleteTask = async (id: string) => {
    // Store original tasks in case we need to revert
    const originalTasks = [...tasks];
    // Optimistic UI update: remove immediately from the list
    setTasks(prevTasks => prevTasks.filter((t) => t.id !== id));
    // Clear previous errors
    setError(null);
    try {
      await deleteTaskApi(id);
      // If API call succeeds, state is already correct
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      setError(err.message || "Failed to delete task. Please try again.");
      // Revert state if the API call fails
      setTasks(originalTasks);
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
          <p className="text-center text-muted-foreground py-8">Loading tasks...</p>
        ) : tasks.length === 0 && !error ? (
          <p className="text-center text-muted-foreground py-8">No tasks yet. Add one!</p>
        ) : (
          tasks.map((task) => (
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
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default TaskPanel;
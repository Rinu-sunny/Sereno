import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const TaskPanel = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");

  const addTask = () => {
    if (taskInput.trim()) {
      setTasks([
        ...tasks,
        { id: Date.now().toString(), text: taskInput, completed: false },
      ]);
      setTaskInput("");
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="w-full max-w-md glass-panel rounded-2xl p-6">
      <h3 className="text-2xl font-bold mb-4 text-foreground">Tasks</h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a new task..."
          className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={addTask}
          className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
          aria-label="Add task"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tasks yet. Add one to get started!</p>
        ) : (
          tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all group"
            >
              <button
                onClick={() => toggleTask(task.id)}
                className="flex-shrink-0"
                aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
              >
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <span
                className={`flex-1 ${
                  task.completed ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default TaskPanel;

import { useEffect, useRef, useSyncExternalStore } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import { nanoid } from "@/lib/nanoid";

export type TaskState =
  | "running"
  | "completed"
  | "error"
  | "stopped"
  | "stopping"
  | "waiting_for_permission";

export type Task = {
  id: string;
  code: string;
  state: TaskState;
  result?: Record<string, any>;
  error?: string;
  permissionPrompt?: PermissionPrompt;
  permissionHistory?: PermissionPrompt[];
};

export type PermissionsResponse = "Allow" | "Deny" | "AllowAll";

type PermissionPrompt = {
  name: string;
  api_name: string | undefined;
  message: string;
  is_unary: boolean;
};

type InternalTask = {
  id: string;
  state: TaskState;
  return_value?: string;
  error?: string;
  permission_prompt?: PermissionPrompt;
  permission_history?: PermissionPrompt[];
};

const state: {
  tasks: Task[];
} = {
  tasks: [],
};

const tasksListeners = new Set<(tasks: Task[]) => void>();

const externalTasksStore = {
  getState() {
    return state.tasks;
  },
  subscribe(listener: (tasks: Task[]) => void) {
    tasksListeners.add(listener);
    return () => tasksListeners.delete(listener); // Return unsubscribe function
  },
};

export function useTasks() {
  return useSyncExternalStore(
    externalTasksStore.subscribe,
    externalTasksStore.getState,
    externalTasksStore.getState
  );
}

const taskListeners = new Map<string, Set<(task: Task) => void>>();

const externalTaskStore = {
  getState(id: string | undefined) {
    return () => (id ? state.tasks.find((task) => task.id === id) : undefined);
  },
  setState(id: string, newTask: Task) {
    state.tasks = state.tasks.map((task) => (task.id === id ? newTask : task));
    taskListeners.get(id)?.forEach((listener) => listener(newTask));
    tasksListeners.forEach((listener) => listener(state.tasks));
  },
  subscribe(id: string | undefined) {
    return (listener: (task: Task) => void) => {
      if (!id) {
        return () => {};
      }

      let listeners = taskListeners.get(id);

      if (!listeners) {
        listeners = new Set();
        taskListeners.set(id, listeners);
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    };
  },
};

export function useTask(id: string | undefined) {
  const taskRef = useRef<Task | undefined>(undefined);

  const task = useSyncExternalStore(
    externalTaskStore.subscribe(id),
    externalTaskStore.getState(id),
    externalTaskStore.getState(id)
  );

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  return { task, taskRef };
}

await listen<InternalTask>("task-state-changed", (event) => {
  const task = event.payload;

  console.log("-- task state changed", task);

  const currentTask = externalTaskStore.getState(task.id)();

  if (!currentTask) {
    console.warn("Task not found", task.id);
    return;
  }

  let result: Record<string, any> | undefined;

  if (task.return_value) {
    result = JSON.parse(task.return_value);
  }

  externalTaskStore.setState(task.id, {
    id: task.id,
    code: currentTask.code,
    state: task.state,
    result,
    error: task.error,
    permissionPrompt: task.permission_prompt,
    permissionHistory: task.permission_history,
  });
});

export async function runCode(codeToRun: string): Promise<string> {
  const newTaskId = nanoid();
  const newTask: Task = {
    id: newTaskId,
    code: codeToRun,
    state: "running",
  };

  try {
    state.tasks = [...state.tasks, newTask];
    tasksListeners.forEach((listener) => listener(state.tasks));

    console.log("-- running code", newTaskId);

    await invoke("run_task", {
      taskId: newTaskId,
      code: codeToRun,
    });
  } catch (error) {
    console.error("Failed to run code:", error);
    externalTaskStore.setState(newTaskId, {
      ...newTask,
      state: "error",
      error: String(error),
    });
  }

  return newTaskId;
}

export async function replayTask(taskId: string) {
  const task = externalTaskStore.getState(taskId)();

  if (!task) {
    console.warn("Task not found", taskId);
    return;
  }

  externalTaskStore.setState(taskId, {
    ...task,
    state: "running",
  });

  try {
    await invoke("run_task", {
      taskId: task.id,
      code: task.code,
    });
  } catch (error) {
    externalTaskStore.setState(task.id, {
      ...task,
      state: "error",
      error: String(error),
    });
  }
}

export async function stopTask(taskId: string) {
  const task = externalTaskStore.getState(taskId)();

  if (!task) {
    console.warn("Task not found", taskId);
    return;
  }

  try {
    await invoke("stop_task", { taskId });
  } catch (error) {
    console.error("Failed to stop task:", error);
    externalTaskStore.setState(taskId, {
      ...task,
      state: "error",
      error: String(error),
    });
  }
}

export async function respondToPermissionPrompt(
  taskId: string,
  response: PermissionsResponse
) {
  try {
    await invoke("respond_to_permission_prompt", { taskId, response });
  } catch (error) {
    console.error("Failed to respond to permission:", error);
  }
}

type InternalTaskEvent = {
  task_id: string;
  event_name: string;
  data: Record<string, any>;
};

export type TaskEvent = {
  taskId: string;
  eventName: string;
  data: Record<string, any>;
};

const taskEventsListeners = new Map<
  string,
  Set<(events: TaskEvent[]) => void>
>();

const taskEventsMap = new Map<string, TaskEvent[]>();

const taskEventsStore = {
  getState(taskId: string): () => TaskEvent[] {
    return () => taskEventsMap.get(taskId) || [];
  },
  get(taskId: string): TaskEvent[] {
    return taskEventsMap.get(taskId) || [];
  },
  set(taskId: string, events: TaskEvent[]) {
    taskEventsMap.set(taskId, events);
  },
  subscribe(
    taskId: string
  ): (listener: (events: TaskEvent[]) => void) => () => void {
    return (listener: (events: TaskEvent[]) => void) => {
      let listeners = taskEventsListeners.get(taskId);

      if (!listeners) {
        listeners = new Set();
        taskEventsListeners.set(taskId, listeners);
      }

      listeners.add(listener);

      return () => {
        listeners?.delete(listener);
        if (listeners?.size === 0) {
          taskEventsListeners.delete(taskId);
        }
      };
    };
  },
  clearEvents(taskId: string) {
    taskEventsMap.delete(taskId);
    // Notify listeners of the empty state
    taskEventsListeners.get(taskId)?.forEach((listener) => {
      listener([]);
    });
  },
};

listen<InternalTaskEvent>("event", (event) => {
  const taskEvent: TaskEvent = {
    taskId: event.payload.task_id,
    eventName: event.payload.event_name,
    data: event.payload.data,
  };

  const events = taskEventsStore.get(event.payload.task_id) || [];
  events.push(taskEvent);
  taskEventsStore.set(event.payload.task_id, events);

  taskEventsListeners.get(event.payload.task_id)?.forEach((listener) => {
    listener(taskEventsStore.get(event.payload.task_id) || []);
  });
});

export function useTaskEvents(taskId: string): {
  events: TaskEvent[];
  clearEvents: () => void;
} {
  const events = useSyncExternalStore(
    taskEventsStore.subscribe(taskId),
    taskEventsStore.getState(taskId),
    taskEventsStore.getState(taskId)
  );

  const clearEvents = () => {
    taskEventsStore.clearEvents(taskId);
  };

  return { events, clearEvents };
}

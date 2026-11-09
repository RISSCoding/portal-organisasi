// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, KanbanSquare } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  parent_task_id: string | null;
}

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const fetchTasks = async () => {
    const res = await fetch(`/api/tasks/project/${projectId}`);
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      setTasks((await res.json()) as Task[]);
    }
  };

  useEffect(() => {
    void fetchTasks();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, title }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message?: string } };
      setError(err.error?.message || 'Failed to create task');
      return;
    }

    setTitle('');
    void fetchTasks();
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    void fetchTasks();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href={`/workspaces/${workspaceId}`}
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        </div>
        <Link
          href={`/workspaces/${workspaceId}/projects/${projectId}/board`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
        >
          <KanbanSquare className="w-4 h-4" /> Kanban View
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <form
          onSubmit={(e) => {
            void handleCreate(e);
          }}
          className="flex gap-4"
        >
          <input
            type="text"
            placeholder="New Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 flex items-center gap-4 transition ${task.status === 'done' ? 'opacity-60 bg-gray-50' : ''}`}
          >
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={() => {
                void toggleStatus(task);
              }}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <span
              className={`flex-1 ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}
            >
              {task.title}
              {task.parent_task_id && <span className="text-xs text-gray-400 ml-2">(subtask)</span>}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
              {task.priority}
            </span>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="p-8 text-center text-gray-500">Belum ada task. Buat satu di atas.</div>
        )}
      </div>
    </div>
  );
}

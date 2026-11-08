// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const res = await fetch(`/api/tasks/project/${projectId}`);
    if (res.status === 401) return router.push('/login');
    if (res.ok) {
      const data = (await res.json()) as Task[];
      setTasks(data);
    }
    setLoading(false);
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

  if (loading) return <p>Loading tasks...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <Link href={`/workspaces/${workspaceId}`} style={{ color: 'blue' }}>
          &larr; Back to Workspace
        </Link>
        <Link
          href={`/workspaces/${workspaceId}/projects/${projectId}/documents`}
          style={{ color: 'blue' }}
        >
          View Documents &rarr;
        </Link>
      </div>
      <h1>Tasks</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={(e) => {
          void handleCreate(e);
        }}
        style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}
      >
        <input
          type="text"
          placeholder="New Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '0.5rem', flex: 1 }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#000', color: '#fff' }}>
          Add Task
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
              opacity: task.status === 'done' ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={() => {
                void toggleStatus(task);
              }}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span
              style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', flex: 1 }}
            >
              {task.title}
              {task.parent_task_id && (
                <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>
                  (subtask)
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: '0.8rem',
                background: '#eee',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
              }}
            >
              {task.priority}
            </span>
          </li>
        ))}
        {tasks.length === 0 && <p>No tasks yet. Create one above.</p>}
      </ul>
    </div>
  );
}

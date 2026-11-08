// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

export default function KanbanBoardPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [tasks, setTasks] = useState<Task[]>([]);
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

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index)
      return;

    const newStatus = destination.droppableId;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t)));

    // API call
    await fetch(`/api/tasks/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  if (loading) return <p>Loading board...</p>;

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/workspaces/${workspaceId}/projects/${projectId}`} style={{ color: 'blue' }}>
          &larr; Back to List
        </Link>
        <h1>Kanban Board</h1>
      </div>

      <DragDropContext
        onDragEnd={(e) => {
          void onDragEnd(e);
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flex: 1, overflowX: 'auto' }}>
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              style={{
                background: '#f4f5f7',
                borderRadius: '8px',
                padding: '1rem',
                width: '300px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  textTransform: 'uppercase',
                  fontSize: '0.9rem',
                  color: '#555',
                }}
              >
                {col.title}
              </h3>

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ flex: 1, minHeight: '150px' }}
                  >
                    {tasks
                      .filter((t) => t.status === col.id)
                      .map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                background: 'white',
                                padding: '1rem',
                                borderRadius: '4px',
                                marginBottom: '0.5rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                ...provided.draggableProps.style,
                              }}
                            >
                              <p style={{ margin: 0, fontWeight: 'bold' }}>{task.title}</p>
                              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                {task.priority.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

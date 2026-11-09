// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { ArrowLeft, List } from 'lucide-react';

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

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index)
      return;

    const newStatus = destination.droppableId;

    setTasks((prev) => prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t)));

    await fetch(`/api/tasks/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="p-6 flex items-center gap-4 border-b border-gray-200 bg-white shadow-sm z-10">
        <Link
          href={`/workspaces/${workspaceId}/projects/${projectId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Kanban Board</h1>
        <Link
          href={`/workspaces/${workspaceId}/projects/${projectId}`}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
        >
          <List className="w-4 h-4" /> List View
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext
          onDragEnd={(e) => {
            void onDragEnd(e);
          }}
        >
          <div className="flex gap-6 h-full items-start">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="bg-gray-100/80 rounded-xl p-4 w-80 flex flex-col max-h-full"
              >
                <h3 className="font-semibold text-gray-700 mb-4 px-1 uppercase text-xs tracking-wider">
                  {col.title}
                </h3>

                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 overflow-y-auto min-h-[150px] space-y-3 pb-2"
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
                                className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition group"
                                style={{ ...provided.draggableProps.style }}
                              >
                                <p className="font-medium text-gray-900 group-hover:text-primary transition">
                                  {task.title}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                                    {task.priority}
                                  </span>
                                </div>
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
    </div>
  );
}

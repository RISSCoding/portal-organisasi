// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write something...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none',
        style:
          'min-height: 200px; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; background: white;',
      },
    },
  });

  // Sync editor content if the prop changes externally (e.g., initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          background: '#f4f5f7',
          borderRadius: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          style={{
            fontWeight: 'bold',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            background: editor.isActive('bold') ? '#ddd' : 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          style={{
            fontStyle: 'italic',
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            background: editor.isActive('italic') ? '#ddd' : 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={{
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            background: editor.isActive('bulletList') ? '#ddd' : 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          Bullet List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          style={{
            padding: '0.2rem 0.5rem',
            cursor: 'pointer',
            background: editor.isActive('heading', { level: 2 }) ? '#ddd' : 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          H2
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

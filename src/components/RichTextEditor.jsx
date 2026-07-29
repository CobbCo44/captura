import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MenuBar = ({ editor, brandId }) => {
  const fileInput = useRef(null)

  if (!editor) return null

  const btn = (active) => ({
    background: active ? 'var(--accent, #6366F1)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted, #a1a1aa)',
    border: '1px solid var(--border, #3f3f46)',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    height: 30,
  })

  const addLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!supabase || !brandId) {
      alert('Cannot upload images without a connected brand.')
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${brandId}/desc-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file)

    if (uploadError) {
      alert('Image upload failed: ' + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    editor.chain().focus().setImage({ src: urlData.publicUrl }).run()
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px',
      borderBottom: '1px solid var(--border, #3f3f46)',
      background: 'var(--bg, #18181b)',
    }}>
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
        style={btn(editor.isActive('bold'))} title="Bold">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
        style={btn(editor.isActive('italic'))} title="Italic">
        <em>I</em>
      </button>

      <div style={{ width: 1, background: 'var(--border, #3f3f46)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        style={btn(editor.isActive('heading', { level: 2 }))} title="Heading">
        H2
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        style={btn(editor.isActive('heading', { level: 3 }))} title="Subheading">
        H3
      </button>

      <div style={{ width: 1, background: 'var(--border, #3f3f46)', margin: '0 4px' }} />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
        style={btn(editor.isActive('bulletList'))} title="Bullet list">
        &bull; List
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
        style={btn(editor.isActive('orderedList'))} title="Numbered list">
        1. List
      </button>

      <div style={{ width: 1, background: 'var(--border, #3f3f46)', margin: '0 4px' }} />

      <button type="button" onClick={addLink}
        style={btn(editor.isActive('link'))} title="Add link">
        Link
      </button>
      {editor.isActive('link') && (
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}
          style={btn(false)} title="Remove link">
          Unlink
        </button>
      )}

      <div style={{ width: 1, background: 'var(--border, #3f3f46)', margin: '0 4px' }} />

      <button type="button" onClick={() => fileInput.current?.click()}
        style={btn(false)} title="Insert image">
        Image
      </button>
      <input ref={fileInput} type="file" accept="image/*" onChange={handleImageUpload}
        style={{ display: 'none' }} />
    </div>
  )
}

export default function RichTextEditor({ value, onChange, brandId }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. loading a product for edit)
  const initialSet = useRef(false)
  useEffect(() => {
    if (editor && value !== undefined && !initialSet.current) {
      // Only set on first real content load, not on every keystroke
      if (value && editor.isEmpty) {
        editor.commands.setContent(value)
      }
      initialSet.current = true
    }
  }, [editor, value])

  return (
    <div style={{
      border: '1px solid var(--border, #3f3f46)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <MenuBar editor={editor} brandId={brandId} />
      <EditorContent editor={editor} />
      <style>{`
        .tiptap {
          padding: 12px 14px;
          min-height: 160px;
          outline: none;
          color: var(--text, #fafafa);
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .tiptap p { margin: 0 0 8px; }
        .tiptap h2 { font-size: 1.15rem; font-weight: 700; margin: 16px 0 6px; }
        .tiptap h3 { font-size: 1rem; font-weight: 600; margin: 12px 0 4px; }
        .tiptap ul, .tiptap ol { padding-left: 20px; margin: 6px 0; }
        .tiptap li { margin: 2px 0; }
        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 10px 0;
          display: block;
        }
        .tiptap a { color: var(--accent, #6366F1); text-decoration: underline; }
        .tiptap blockquote {
          border-left: 3px solid var(--border, #3f3f46);
          padding-left: 12px;
          margin: 8px 0;
          color: var(--text-muted, #a1a1aa);
        }
      `}</style>
    </div>
  )
}

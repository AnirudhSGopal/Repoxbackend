import { useState, useContext } from 'react'
import { ThemeContext } from '../App'
import { getTheme } from '../utils/helpers'

function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0)
  const { theme } = useContext(ThemeContext)
  const t = getTheme(theme)

  const name = node.path.replace(/\/$/, '').split('/').pop()
  const fileColors = { python: t.blue, markdown: t.green, javascript: '#e8a020' }

  if (node.type === 'folder') {
    return (
      <div>
        <div
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 py-1 cursor-pointer rounded transition-all"
          style={{ paddingLeft: `${8 + depth * 12}px`, color: t.accentText }}
          onMouseEnter={e => e.currentTarget.style.background = t.bg3}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span className="text-[10px]">{open ? '▾' : '▸'}</span>
          <span className="text-xs font-medium">{name}/</span>
        </div>
        {open && node.children?.map((child, i) => (
          <TreeNode key={i} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 py-1 cursor-pointer rounded transition-all"
      style={{ paddingLeft: `${8 + depth * 12}px` }}
      onMouseEnter={e => e.currentTarget.style.background = t.bg3}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span className="text-[10px]" style={{ color: fileColors[node.language] || t.text3 }}>›</span>
      <span className="text-xs" style={{ color: t.text2 }}>{name}</span>
    </div>
  )
}

export default function FileTree({ files }) {
  return (
    <div className="py-1">
      {files.map((node, i) => <TreeNode key={i} node={node} />)}
    </div>
  )
}
import { useState } from 'react'
import PartsTable from './components/PartsTable'
import BomBuilder from './components/BomBuilder'
import type { Part, BomLine } from './types'

type Tab = 'catalog' | 'bom'

export default function App() {
  const [tab, setTab] = useState<Tab>('catalog')
  const [selection, setSelection] = useState<Map<number, BomLine>>(new Map())

  function togglePart(part: Part) {
    setSelection(prev => {
      const next = new Map(prev)
      if (next.has(part.id)) next.delete(part.id)
      else next.set(part.id, { part, qty: 1 })
      return next
    })
  }

  function setQty(partId: number, qty: number) {
    setSelection(prev => {
      const next = new Map(prev)
      const line = next.get(partId)
      if (line) next.set(partId, { ...line, qty })
      return next
    })
  }

  function removePart(partId: number) {
    setSelection(prev => {
      const next = new Map(prev)
      next.delete(partId)
      return next
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117] text-[#e4e6f0]">
      <header className="bg-[#1a1d27] border-b border-[#2e3348] px-6 py-3 flex items-center gap-4">
        <h1 className="text-sm font-semibold tracking-tight">PLM Parts Browser</h1>
        <span className="text-[#2e3348] select-none">│</span>
        <span className="text-xs font-mono text-[#7880a0]">config-01 · single currency · blended cost</span>
      </header>

      <div className="bg-[#1a1d27] border-b border-[#2e3348] px-6">
        <nav className="flex">
          {(['catalog', 'bom'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-[#4d7eff] text-[#4d7eff]'
                  : 'border-transparent text-[#7880a0] hover:text-[#e4e6f0]'
              }`}
            >
              {t === 'catalog'
                ? 'Parts Catalog'
                : `BOM Builder${selection.size > 0 ? ` (${selection.size})` : ''}`}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 p-6">
        {tab === 'catalog' && (
          <PartsTable selection={selection} onToggle={togglePart} />
        )}
        {tab === 'bom' && (
          <BomBuilder
            selection={selection}
            onQtyChange={setQty}
            onRemove={removePart}
            onClear={() => setSelection(new Map())}
          />
        )}
      </main>
    </div>
  )
}

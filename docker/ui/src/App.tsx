import { useState } from 'react'
import PartsTable from './components/PartsTable'
import BomBuilder from './components/BomBuilder'
import type { Part, BomLine } from './types'

type Step = 'catalog' | 'bom'

export default function App() {
  const [step, setStep]           = useState<Step>('catalog')
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
      <header className="bg-[#1a1d27] border-b border-[#2e3348] px-6 py-3 flex items-center gap-6">
        <h1 className="text-sm font-semibold tracking-tight shrink-0">PLM Parts Browser</h1>
        <span className="text-[#2e3348] select-none">│</span>

        {/* Step breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <span className={step === 'catalog' ? 'text-[#e4e6f0] font-medium' : 'text-[#454c6a]'}>
            ① Select Systems
          </span>
          <span className="text-[#2e3348]">──→</span>
          <span className={step === 'bom' ? 'text-[#e4e6f0] font-medium' : 'text-[#454c6a]'}>
            ② Review BOM
          </span>
        </div>

        <span className="ml-auto text-xs font-mono text-[#7880a0]">config-01 · single currency · blended cost</span>
      </header>

      <main className="flex-1 p-6">
        {step === 'catalog' && (
          <PartsTable
            selection={selection}
            onToggle={togglePart}
            onNext={() => setStep('bom')}
          />
        )}
        {step === 'bom' && (
          <BomBuilder
            selection={selection}
            onQtyChange={setQty}
            onRemove={removePart}
            onClear={() => setSelection(new Map())}
            onBack={() => setStep('catalog')}
          />
        )}
      </main>
    </div>
  )
}

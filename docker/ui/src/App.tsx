import { useState } from 'react'
import RecipeCatalog from './components/RecipeCatalog'
import RecipeWizard  from './components/RecipeWizard'
import DraftEditor   from './components/DraftEditor'
import ProjectBom    from './components/ProjectBom'
import type { Recipe, DraftLine } from './types'

type Step = 'catalog' | 'wizard' | 'draft' | 'bom'

const STEPS = [
  { key: 'catalog', label: '① Select Recipe' },
  { key: 'wizard',  label: '② Configure'     },
  { key: 'draft',   label: '③ Edit Draft'    },
  { key: 'bom',     label: '④ Project BOM'   },
] as const

export default function App() {
  const [step,            setStep]            = useState<Step>('catalog')
  const [activeRecipe,    setActiveRecipe]    = useState<Recipe | null>(null)
  const [draftLines,      setDraftLines]      = useState<DraftLine[]>([])
  const [instanceCounter, setInstanceCounter] = useState(0)
  const [completedLines,  setCompletedLines]  = useState<DraftLine[]>([])

  function handlePickRecipe(recipe: Recipe) {
    setActiveRecipe(recipe)
    setStep('wizard')
  }

  function handleWizardAdd(lines: DraftLine[]) {
    const instanceId = instanceCounter + 1
    setInstanceCounter(instanceId)
    const tagged = lines.map(l => ({ ...l, recipe_instance_id: instanceId }))
    setDraftLines(prev => [...prev, ...tagged])
    setStep('draft')
  }

  function handleAddAnotherRecipe() {
    setActiveRecipe(null)
    setStep('catalog')
  }

  function handleCompleteBom() {
    setCompletedLines([...draftLines])
    setStep('bom')
  }

  function handleNewProject() {
    setDraftLines([])
    setCompletedLines([])
    setInstanceCounter(0)
    setActiveRecipe(null)
    setStep('catalog')
  }

  function handleSkipToManual() {
    setDraftLines([])
    setStep('draft')
  }

  const currentIdx = STEPS.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117] text-[#e4e6f0]">
      <header className="bg-[#1a1d27] border-b border-[#2e3348] px-6 py-3 flex items-center gap-6 shrink-0">
        <h1 className="text-sm font-semibold tracking-tight shrink-0">Samey PLM</h1>
        <span className="text-[#2e3348] select-none">│</span>

        <div className="flex items-center gap-2 text-xs">
          {STEPS.map((s, i) => (
            <span key={s.key} className="flex items-center gap-2">
              <span className={
                i === currentIdx ? 'text-[#e4e6f0] font-medium' :
                i < currentIdx   ? 'text-[#4d7eff]' : 'text-[#454c6a]'
              }>{s.label}</span>
              {i < STEPS.length - 1 && <span className="text-[#2e3348]">──→</span>}
            </span>
          ))}
        </div>

        <span className="ml-auto text-xs font-mono text-[#7880a0]">
          v0.2 · ISK · recipe-driven
        </span>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {step === 'catalog' && (
          <RecipeCatalog
            onPickRecipe={handlePickRecipe}
            onSkipToManual={handleSkipToManual}
            draftCount={draftLines.length}
          />
        )}
        {step === 'wizard' && activeRecipe && (
          <RecipeWizard
            recipe={activeRecipe}
            onAdd={handleWizardAdd}
            onBack={() => setStep('catalog')}
          />
        )}
        {step === 'draft' && (
          <DraftEditor
            lines={draftLines}
            onChange={setDraftLines}
            onAddRecipe={handleAddAnotherRecipe}
            onComplete={handleCompleteBom}
          />
        )}
        {step === 'bom' && (
          <ProjectBom
            lines={completedLines}
            onNewProject={handleNewProject}
          />
        )}
      </main>
    </div>
  )
}

import '../assets/styles.css'
import { useEffect, useRef, useState } from 'preact/hooks'
import ProjectPicker from './components/ProjectPicker.tsx'
import RecipeCatalog from './components/RecipeCatalog.tsx'
import RecipeWizard from './components/RecipeWizard.tsx'
import DraftEditor from './components/DraftEditor.tsx'
import ProjectBom from './components/ProjectBom.tsx'
import { completeProject, fetchDraft, fetchProjectBom, saveDraft } from './api.ts'
import type { DraftLine, Project, ProjectBomResponse, Recipe } from './types.ts'

type Step = 'projects' | 'catalog' | 'wizard' | 'draft' | 'bom'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const STEPS = [
  { key: 'projects', label: '① Project' },
  { key: 'catalog', label: '② Select Recipe' },
  { key: 'wizard', label: '③ Configure' },
  { key: 'draft', label: '④ Edit Draft' },
  { key: 'bom', label: '⑤ Project BOM' },
] as const

export default function App() {
  const [step, setStep] = useState<Step>('projects')
  const [project, setProject] = useState<Project | null>(null)
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null)
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])
  const [instanceCounter, setInstanceCounter] = useState(0)
  const [bomData, setBomData] = useState<ProjectBomResponse | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Skip autosave while hydrating a draft loaded from the server.
  const hydrating = useRef(false)
  const saveTimer = useRef<number | null>(null)

  // Debounced autosave: any draft change → PUT replace-all after 500 ms.
  useEffect(() => {
    if (!project || project.status !== 'draft') return
    if (hydrating.current) {
      hydrating.current = false
      return
    }
    setSaveState('saving')
    if (saveTimer.current !== null) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveDraft(project.id, draftLines)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, 500)
    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current)
    }
  }, [draftLines])

  async function handleOpenProject(p: Project) {
    setError(null)
    setProject(p)
    if (p.status === 'complete') {
      setBusy(true)
      try {
        setBomData(await fetchProjectBom(p.id))
        setStep('bom')
      } catch (e) {
        setError(String(e))
        setProject(null)
      } finally {
        setBusy(false)
      }
      return
    }
    setBusy(true)
    try {
      const rows = await fetchDraft(p.id)
      hydrating.current = true
      setDraftLines(rows.map(r => ({
        key: `d${r.id}`,
        id: r.id,
        part_id: r.part_id,
        plm_part_number: r.plm_part_number,
        description: r.description,
        bom_type: r.bom_type,
        production_type: r.production_type,
        quantity: r.quantity,
        unit_cost: r.unit_cost,
        unit_price: r.unit_price,
        currency: r.currency,
        source: r.source,
        recipe_instance_id: r.recipe_instance_id ?? undefined,
      })))
      setInstanceCounter(
        rows.reduce((m, r) => Math.max(m, r.recipe_instance_id ?? 0), 0),
      )
      setSaveState('saved')
      setStep(rows.length > 0 ? 'draft' : 'catalog')
    } catch (e) {
      setError(String(e))
      setProject(null)
    } finally {
      setBusy(false)
    }
  }

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

  async function handleCompleteBom() {
    if (!project || busy) return
    setError(null)
    setBusy(true)
    try {
      // Flush any pending debounce so the snapshot sees the latest draft.
      if (saveTimer.current !== null) clearTimeout(saveTimer.current)
      await saveDraft(project.id, draftLines)
      const result = await completeProject(project.id)
      if (result.warnings.length > 0) {
        console.warn('Snapshot warnings:', result.warnings)
      }
      setBomData(await fetchProjectBom(project.id))
      setProject(prev => (prev ? { ...prev, status: 'complete' } : prev))
      setStep('bom')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  function handleBackToProjects() {
    setProject(null)
    setDraftLines([])
    setBomData(null)
    setInstanceCounter(0)
    setActiveRecipe(null)
    setSaveState('idle')
    setError(null)
    setStep('projects')
  }

  function handleSkipToManual() {
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
              <span
                className={i === currentIdx
                  ? 'text-[#e4e6f0] font-medium'
                  : i < currentIdx
                  ? 'text-[#4d7eff]'
                  : 'text-[#454c6a]'}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="text-[#2e3348]">──→</span>}
            </span>
          ))}
        </div>

        <span className="ml-auto text-xs font-mono text-[#7880a0] flex items-center gap-3">
          {project && (
            <>
              <span className="text-[#e4e6f0] max-w-48 truncate" title={project.name}>
                {project.name}
              </span>
              {project.status === 'draft' && (
                <span
                  className={saveState === 'error'
                    ? 'text-[#e05555]'
                    : saveState === 'saving'
                    ? 'text-[#7880a0]'
                    : 'text-[#34d399]'}
                >
                  {saveState === 'error'
                    ? '⚠ save failed'
                    : saveState === 'saving'
                    ? 'saving…'
                    : saveState === 'saved'
                    ? '✓ saved'
                    : ''}
                </span>
              )}
              <span className="text-[#2e3348]">│</span>
            </>
          )}
          v0.2 · ISK · recipe-driven
          <span className="text-[#2e3348]">│</span>
          <a href="/admin" className="text-[#7880a0] hover:text-[#e4e6f0]" title="Recipe Creator">⚙ admin</a>
        </span>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {error && (
          <p className="max-w-5xl mx-auto mb-4 text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">
            {error}
          </p>
        )}
        {busy && (
          <p className="max-w-5xl mx-auto mb-4 text-sm text-[#454c6a] text-center">Working…</p>
        )}

        {step === 'projects' && <ProjectPicker onOpen={handleOpenProject} />}
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
        {step === 'bom' && bomData && (
          <ProjectBom data={bomData} onNewProject={handleBackToProjects} />
        )}
      </main>
    </div>
  )
}

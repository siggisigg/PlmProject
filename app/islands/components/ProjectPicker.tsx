import { useEffect, useState } from 'preact/hooks'
import { createProject, fetchProjects } from '../api.ts'
import type { Project } from '../types.ts'

interface Props {
  onOpen: (project: Project) => void
}

export default function ProjectPicker({ onOpen }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [solutionCode, setSolutionCode] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: Event) {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const project = await createProject(name.trim(), solutionCode.trim() || undefined)
      onOpen(project)
    } catch (err) {
      setError(String(err))
      setCreating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#e4e6f0]">Projects</h2>
          <p className="text-sm text-[#7880a0] mt-0.5">
            Open a draft to continue working, view a completed BOM, or start a new project.
          </p>
        </div>
        <button
          onClick={() => setShowNew(s => !s)}
          className="text-sm px-4 py-1.5 rounded bg-[#4d7eff] hover:bg-[#3d6eef] text-white transition-colors shrink-0"
        >
          + New Project
        </button>
      </div>

      {error && (
        <p className="text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
      )}

      {showNew && (
        <form onSubmit={handleCreate} className="rounded border border-[#2e3348] bg-[#1a1d27] p-4 flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Project name (e.g. Customer X palletising line)"
            value={name}
            onInput={e => setName((e.target as HTMLInputElement).value)}
            className="w-full bg-[#0f1117] border border-[#2e3348] rounded px-3 py-2 text-sm text-[#e4e6f0] placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
          />
          <input
            type="text"
            placeholder="Solution code (optional, e.g. SR-SBPC-2LD-6P-6POC-EPC)"
            value={solutionCode}
            onInput={e => setSolutionCode((e.target as HTMLInputElement).value)}
            className="w-full bg-[#0f1117] border border-[#2e3348] rounded px-3 py-2 text-sm text-[#e4e6f0] placeholder-[#454c6a] font-mono focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className={`text-sm font-medium px-5 py-1.5 rounded transition-colors ${
                name.trim() && !creating
                  ? 'bg-[#4d7eff] hover:bg-[#3d6eef] text-white'
                  : 'bg-[#2e3348] text-[#454c6a] cursor-not-allowed'
              }`}
            >
              {creating ? 'Creating…' : 'Create & Open →'}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-[#454c6a] py-8 text-center">Loading projects…</p>}

      {!loading && !error && projects.length === 0 && !showNew && (
        <div className="border border-dashed border-[#2e3348] rounded px-6 py-12 text-center">
          <p className="text-sm text-[#454c6a]">No projects yet. Create one to get started.</p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="rounded border border-[#2e3348] divide-y divide-[#2e3348] overflow-hidden">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="w-full flex items-center gap-4 px-4 py-3 bg-[#1a1d27] hover:bg-[#22263a] transition-colors text-left"
            >
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                p.status === 'complete'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-blue-950 text-blue-300 border-blue-800'
              }`}>
                {p.status === 'complete' ? 'COMPLETE' : 'DRAFT'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e4e6f0] truncate">{p.name}</p>
                {p.solution_code && (
                  <p className="text-xs text-[#454c6a] font-mono truncate">{p.solution_code}</p>
                )}
              </div>
              {p.status === 'draft' && (
                <span className="text-xs text-[#7880a0] font-mono shrink-0">
                  {p.draft_count ?? 0} line{(p.draft_count ?? 0) !== 1 ? 's' : ''}
                </span>
              )}
              <span className="text-xs text-[#454c6a] font-mono shrink-0">
                {new Date(p.updated_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

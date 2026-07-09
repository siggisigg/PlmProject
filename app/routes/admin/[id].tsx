import { define } from '../../utils.ts'
import RecipeEditor from '../../islands/admin/RecipeEditor.tsx'

export default define.page(function AdminRecipePage(ctx) {
  const id = Number(ctx.params.id)
  if (!Number.isFinite(id)) {
    return <p className="p-8 text-sm text-red-400 font-mono">Bad recipe id</p>
  }
  return <RecipeEditor recipeId={id} />
})

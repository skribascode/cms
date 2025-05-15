// Delete category
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = event.context.params?.id

  // Vérifier d'abord si la catégorie est utilisée par des articles
  const { data: usedByPosts, error: checkError } = await client
    .from('posts')
    .select('id, title')
    .eq('category_id', id)
    .limit(1)

  if (checkError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Erreur lors de la vérification des dépendances: ${checkError.message}`
    })
  }

  // Si la catégorie est utilisée, empêcher la suppression avec un message clair
  if (usedByPosts && usedByPosts.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cette catégorie ne peut pas être supprimée car elle est utilisée par des articles',
      data: {
        constraint: 'foreign_key_constraint',
        detail: 'Catégorie utilisée par des articles existants'
      }
    })
  }

  // Si la catégorie n'est pas utilisée, procéder à la suppression
  const { error } = await client.from('categories').delete().eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { success: true }
})

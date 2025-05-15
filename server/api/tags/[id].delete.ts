// Delete tag
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = event.context.params?.id

  // Vérifier d'abord si le tag est utilisé par des articles
  // Note: Comme les tags sont généralement dans une table de relation many-to-many, nous devons vérifier différemment
  const { data: usedByPosts, error: checkError } = await client
    .from('posts_tags') // Assurez-vous que c'est le bon nom de la table pivot
    .select('post_id')
    .eq('tag_id', id)
    .limit(1)

  if (checkError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Erreur lors de la vérification des dépendances: ${checkError.message}`
    })
  }

  // Si le tag est utilisé, empêcher la suppression avec un message clair
  if (usedByPosts && usedByPosts.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ce tag ne peut pas être supprimé car il est utilisé par des articles',
      data: {
        constraint: 'foreign_key_constraint',
        detail: 'Tag utilisé par des articles existants'
      }
    })
  }

  // Si le tag n'est pas utilisé, procéder à la suppression
  const { error } = await client.from('tags').delete().eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { success: true }
})

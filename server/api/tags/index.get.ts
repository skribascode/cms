// Get all tags with article count
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  // Récupérer tous les tags
  const { data: tags, error } = await client
    .from('tags')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Pour chaque tag, récupérer le nombre d'articles associés
  const tagsWithCount = await Promise.all(
    tags.map(async (tag) => {
      const { count, error: countError } = await client
        .from('posts_tags')
        .select('post_id', { count: 'exact', head: true })
        .eq('tag_id', tag.id)

      if (countError) {
        console.error(`Erreur lors du comptage des articles pour le tag ${tag.id}:`, countError)
        return { ...tag, usage_count: 0 }
      }

      return {
        ...tag,
        usage_count: count || 0
      }
    })
  )

  return tagsWithCount
})

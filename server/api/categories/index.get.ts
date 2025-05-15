// Get all categories with article count
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  // Récupérer toutes les catégories
  const { data: categories, error } = await client
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Pour chaque catégorie, récupérer le nombre d'articles associés
  const categoriesWithCount = await Promise.all(
    categories.map(async (category) => {
      const { count, error: countError } = await client
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', category.id)

      if (countError) {
        console.error(`Erreur lors du comptage des articles pour la catégorie ${category.id}:`, countError)
        return { ...category, usage_count: 0 }
      }

      return {
        ...category,
        usage_count: count || 0
      }
    })
  )

  return categoriesWithCount
})

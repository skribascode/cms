// Get all categories
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data, error } = await client.from('categories').select('*').order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})

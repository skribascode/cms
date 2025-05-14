// Create new tag
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const body = await readBody(event)

  const { name } = body

  const { data, error } = await client.from('tags').insert({ name }).select().single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})

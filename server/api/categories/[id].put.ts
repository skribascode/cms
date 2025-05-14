// Update category name
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = event.context.params?.id
  const body = await readBody(event)

  const { name } = body

  const { error } = await client.from('categories').update({ name }).eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})

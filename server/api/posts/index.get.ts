// Get all posts with category + tags
import { serverSupabaseClient } from '#supabase/server'

import type { PostWithRelations, Tag, PostsTags } from '~/types/post'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('posts')
    .select(`
      *,
      categories (
        id,
        name
      ),
      posts_tags (
        tag_id,
        tags (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    const posts = data as PostWithRelations[]

  // Transformer les données pour qu'elles soient plus faciles à utiliser côté client
  const formattedPosts = posts.map(post => {
    // Vérifier si posts_tags est un tableau et non vide
    let tags: Tag[] = [];

    if (post.posts_tags && Array.isArray(post.posts_tags) && post.posts_tags.length > 0) {
      const postsTags = post.posts_tags as PostsTags;
      tags = postsTags
        .filter((pt) => pt && pt.tags)
        .map((pt) => ({
          id: pt.tags.id,
          name: pt.tags.name
        }));
    }

    return {
      id: post.id,
      created_at: post.created_at,
      title: post.title,
      summary: post.summary,
      content: post.content,
      cover_url: post.cover_url,
      category_id: post.category_id || null,
      status: post.status || 'draft',
      category: post.categories ? { id: post.categories.id, name: post.categories.name } : null,
      tags: tags
    };
  });

  return formattedPosts;
})

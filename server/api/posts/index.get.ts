// Get all posts with category + tags
import { serverSupabaseClient } from '#supabase/server'

// Définir les interfaces pour les données
interface Tag {
  id: string;
  name: string;
}

interface PostTag {
  tag_id: string;
  tags: Tag;
}

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

  // Transformer les données pour qu'elles soient plus faciles à utiliser côté client
  const formattedPosts = data.map(post => {
    // Vérifier si posts_tags est un tableau et non vide
    let tags: Tag[] = [];

    if (post.posts_tags && Array.isArray(post.posts_tags) && post.posts_tags.length > 0) {
      tags = post.posts_tags
        .filter((pt: PostTag) => pt && pt.tags)
        .map((pt: PostTag) => ({
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

// Get single post by ID
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

interface FormattedPost {
  id: string;
  created_at: string;
  title: string;
  summary: string;
  content: string;
  cover_url: string | null;
  category_id: string | null;
  status: string;
  category: { id: string; name: string } | null;
  tags: Tag[];
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = event.context.params?.id

  console.log('Récupération de l\'article avec ID:', id);

  // Récupérer l'article avec ses relations
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
    .eq('id', id)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Vérifier les tags récupérés
  console.log('Tags récupérés pour l\'article:', data?.posts_tags);

  // Format des tags – modification critique ici pour s'assurer que les tags sont bien extraits
  let formattedTags: Tag[] = [];

  if (data.posts_tags && Array.isArray(data.posts_tags) && data.posts_tags.length > 0) {
    formattedTags = data.posts_tags
      .filter((pt: PostTag) => pt && pt.tags)
      .map((pt: PostTag) => ({
        id: pt.tags.id,
        name: pt.tags.name
      }));
  }

  console.log('Tags formatés:', formattedTags);

  const formattedPost: FormattedPost = {
    id: data.id,
    created_at: data.created_at,
    title: data.title,
    summary: data.summary,
    content: data.content,
    cover_url: data.cover_url,
    category_id: data.category_id || null,
    status: data.status || 'draft',
    category: data.categories ? { id: data.categories.id, name: data.categories.name } : null,
    tags: formattedTags
  };

  // Vérifier le résultat formaté
  console.log('Tags dans la réponse finale:', formattedPost.tags);

  return formattedPost;
})

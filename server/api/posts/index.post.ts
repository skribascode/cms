// Create new post with tags
import { serverSupabaseClient } from '#supabase/server'
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const body = await readBody(event);

  const { title, summary, content, cover_url, category_id, status, tag_ids } = body;

  try {
    // 1. Créer l'article avec un nouvel UUID
    const newPost = {
      id: uuidv4(),
      title,
      summary,
      content,
      cover_url,
      category_id,
      status
    };

    const { data: postData, error: postError } = await client
      .from('posts')
      .insert(newPost)
      .select()
      .single();

    if (postError) {
      throw createError({ statusCode: 500, statusMessage: postError.message });
    }

    const postId = postData?.id || newPost.id;

    // 2. Traiter les tags si fournis
    const processedTags = Array.isArray(tag_ids) ? tag_ids : tag_ids ? [tag_ids] : [];

    if (processedTags.length > 0) {
      // Dédoublonner les tags
      const uniqueTags = [...new Set(processedTags)];

      // Insérer les tags
      for (const tagId of uniqueTags) {
        const { error: tagError } = await client
          .from('posts_tags')
          .insert({
            post_id: postId,
            tag_id: tagId
          });

        if (tagError && !tagError.message.includes('duplicate key value')) {
          // On continue même en cas d'erreur pour un tag, mais on log l'erreur
          console.error(`Erreur d'insertion du tag ${tagId}:`, tagError.message);
        }

        // Petit délai pour éviter les problèmes de concurrence
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return { success: true, id: postId };
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Erreur lors de la création de l\'article'
    });
  }
});

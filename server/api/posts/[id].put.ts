// Update post and its tags
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const id = event.context.params?.id;
  const body = await readBody(event);

  const { title, summary, content, cover_url, category_id, status, tag_ids } = body;

  // 1. Mettre à jour les infos de l'article
  const { error } = await client
    .from('posts')
    .update({ title, summary, content, cover_url, category_id, status })
    .eq('id', id);

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  try {
    // 2. Supprimer les tags existants
    const { error: deleteError } = await client
      .from('posts_tags')
      .delete()
      .eq('post_id', id);

    if (deleteError) {
      throw createError({ statusCode: 500, statusMessage: `Erreur lors de la suppression des tags: ${deleteError.message}` });
    }

    // 3. Si aucun tag n'est fourni, on a terminé
    if (!tag_ids || (Array.isArray(tag_ids) && tag_ids.length === 0)) {
      return { success: true };
    }

    // 4. Préparation des tags (normalisation et dédoublonnage)
    const tagsToProcess = Array.isArray(tag_ids) ? tag_ids : [tag_ids];
    const uniqueTags = [...new Set(tagsToProcess)];

    // 5. Insérer les tags un par un
    for (const tagId of uniqueTags) {
      const { error: insertError } = await client
        .from('posts_tags')
        .insert({
          post_id: id,
          tag_id: tagId
        });

      if (insertError) {
        // Si l'erreur est une violation de clé primaire, on peut l'ignorer (tag déjà présent)
        if (!insertError.message.includes('duplicate key value')) {
          throw createError({ statusCode: 500, statusMessage: `Erreur lors de l'insertion du tag: ${insertError.message}` });
        }
      }

      // Petit délai pour éviter les problèmes de concurrence
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return { success: true };
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Erreur lors de la mise à jour des tags'
    });
  }
});

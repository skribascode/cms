<script setup lang='ts'>
import type { Post } from '~/types/post'

definePageMeta({
  layout: 'admin'
})

useAdminGuard()

const supabase = useSupabaseClient()

// Ref unique pour tout le post
const post = ref<Post>({
  title: '',
  summary: '',
  content: '',
  status: 'draft',
  cover_url: '',
  category_id: null
})

const error = ref('')
const success = ref(false)
const tags = ref<string[]>([])
const selectedTags = ref<string[]>([])
const categories = ref<string[]>([])

const createPost = async () => {
  error.value = ''
  success.value = false

  if (!post.value.title || !post.value.summary || !post.value.content) {
    error.value = 'Tous les champs sont requis'
    return
  }

  const postData = {
    title: post.value.title,
    summary: post.value.summary,
    content: post.value.content,
    status: post.value.status,
    cover_url: post.value.cover_url || null,
    category_id: post.value.category_id
  }

  const { error: insertError, data: newPost } = await supabase
    .from('articles')
    .insert(postData)
    .select()
    .single()

  if (insertError) {
    error.value = insertError.message
    return
  }

  // Insertion des tags uniquement si des tags sont sélectionnés
  if (selectedTags.value.length > 0) {
    const tagInserts = selectedTags.value.map(tagId => ({
      article_id: newPost.id,
      tag_id: tagId
    }))

    const { error: tagsError } = await supabase
      .from('article_tags')
      .insert(tagInserts)

    if (tagsError) {
      console.error('Erreur lors de l\'ajout des tags:', tagsError)
      // On ne bloque pas la création de l'article si les tags échouent
    }
  }

  // Réinitialiser le formulaire après une création réussie
  post.value = {
    title: '',
    summary: '',
    content: '',
    status: 'draft',
    cover_url: '',
    category_id: null
  }
  selectedTags.value = []
  success.value = true
}

onMounted(async () => {
  // Récupérer les catégories et tags disponibles en parallèle
  const [{ data: catData }, { data: tagsData }] = await Promise.all([
    supabase.from('categories').select(),
    supabase.from('tags').select()
  ])

  categories.value = catData || []
  tags.value = tagsData || []
})
</script>

<template>
  <div class='p-8 max-w-3xl mx-auto'>
    <h1 class='text-3xl font-bold mb-6'>Nouvel article</h1>

    <div class='space-y-4'>
      <ImageUploader v-model='post.cover_url' :post-title="post.title" />

      <!-- Sélection de catégorie -->
      <select v-model='post.category_id' class='w-full p-3 border rounded'>
        <option :value='null'>Choisir une catégorie</option>
        <option v-for='cat in categories' :key='cat.id' :value='cat.id'>
          {{ cat.name }}
        </option>
      </select>

      <!-- Sélection de tags -->
      <div>
        <h3 class="font-medium mb-2">Tags :</h3>
        <div class='flex flex-wrap gap-2'>
          <label
            v-for='tag in tags'
            :key='tag.id'
            class='flex items-center gap-2 text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer'
          >
            <input
              v-model='selectedTags'
              type='checkbox'
              :value='tag.id'
            >
            {{ tag.name }}
          </label>
        </div>
      </div>

      <input
        v-model='post.title'
        type='text'
        placeholder='Titre'
        class='w-full p-3 border rounded'
      >
      <textarea
        v-model='post.summary'
        placeholder='Résumé'
        class='w-full p-3 border rounded h-24'
      />
      <textarea
        v-model='post.content'
        placeholder='Contenu'
        class='w-full p-3 border rounded h-48'
      />

      <select
        v-model='post.status'
        class='w-full p-3 border rounded'
      >
        <option value='draft'>Brouillon</option>
        <option value='published'>Publié</option>
      </select>

      <div class='flex justify-end gap-4'>
        <NuxtLink to='/admin' class='text-gray-600 hover:underline'>
          Annuler
        </NuxtLink>
        <button
          class='bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors'
          @click='createPost'
        >
          Publier
        </button>
      </div>

      <p v-if='error' class='text-red-500 bg-red-50 p-3 rounded'>{{ error }}</p>
      <p v-if='success' class='text-green-600 bg-green-50 p-3 rounded'>
        Article publié avec succès !
        <button
          class="float-right text-sm hover:underline"
          @click="success = false"
        >
          Fermer
        </button>
      </p>
    </div>
  </div>
</template>

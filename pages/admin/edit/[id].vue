<script setup lang='ts'>
import type { Article } from '@/types/article'

definePageMeta({
  layout: 'admin'
})

useAdminGuard()

const supabase = useSupabaseClient()
const route = useRoute()
const id = route.params.id as string

const article = ref<Article>({
  id,
  title: '',
  summary: '',
  content: '',
  status: 'draft',
  cover_url: '',
  category_id: null as string | null
})

const loading = ref(true)
const error = ref('')
const success = ref(false)
const categories = ref<string[]>([])
const tags = ref<string[]>([])
const selectedTags = ref<string[]>([])

const fetchArticle = async () => {
  // Récupérer l'article avec sa catégorie
  const { data, error: fetchError } = await supabase
    .from('articles')
    .select(`*, category_id`)
    .eq('id', id)
    .single()

  if (fetchError || !data) {
    error.value = fetchError?.message || 'Article introuvable'
    loading.value = false
    return
  }

  // Mise à jour de l'article avec les données récupérées
  article.value = {
    ...article.value,
    title: data.title,
    summary: data.summary,
    content: data.content,
    status: data.status,
    cover_url: data.cover_url || '',
    category_id: data.category_id
  }

  // Récupération des tags de l'article
  const { data: articleTags, error: tagsError } = await supabase
    .from('article_tags')
    .select('tag_id')
    .eq('article_id', id)

  if (!tagsError && articleTags) {
    selectedTags.value = articleTags.map(tag => tag.tag_id)
  }

  loading.value = false
}

const updateArticle = async () => {
  error.value = ''
  success.value = false

  // Vérification des champs obligatoires
  if (!article.value.title || !article.value.summary || !article.value.content) {
    error.value = 'Tous les champs sont requis'
    return
  }

  // Mise à jour de l'article
  const { error: updateError } = await supabase
    .from('articles')
    .update({
      title: article.value.title,
      summary: article.value.summary,
      content: article.value.content,
      status: article.value.status,
      cover_url: article.value.cover_url || null,
      category_id: article.value.category_id
    })
    .eq('id', id)

  if (updateError) {
    error.value = updateError.message
    return
  }

  // Mise à jour des tags - d'abord supprimer les anciens
  await supabase
    .from('article_tags')
    .delete()
    .eq('article_id', id)

  // Ajouter les nouveaux tags sélectionnés
  if (selectedTags.value.length > 0) {
    const tagInserts = selectedTags.value.map(tagId => ({
      article_id: id,
      tag_id: tagId
    }))

    const { error: tagsError } = await supabase
      .from('article_tags')
      .insert(tagInserts)

    if (tagsError) {
      console.error('Erreur lors de la mise à jour des tags:', tagsError)
    }
  }

  success.value = true
}

// Charger les catégories et tags au montage du composant
onMounted(async () => {
  // Récupérer les catégories et tags disponibles en parallèle
  const [{ data: catData }, { data: tagsData }] = await Promise.all([
    supabase.from('categories').select(),
    supabase.from('tags').select()
  ])

  categories.value = catData || []
  tags.value = tagsData || []

  // Récupérer les données de l'article
  await fetchArticle()
})
</script>

<template>
  <div class='p-8 max-w-3xl mx-auto'>
    <h1 class='text-3xl font-bold mb-6'>Modifier l'article</h1>

    <div v-if='loading' class="py-8 text-center text-gray-500">
      <div class="animate-spin inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"/>
      <p>Chargement de l'article...</p>
    </div>

    <div v-else class='space-y-4'>
      <!-- Nouvelle section de gestion d'image avec deux options -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100">
          <h2 class="font-semibold text-gray-800">Image de couverture</h2>
        </div>

        <div class="p-5">
          <!-- Aperçu de l'image actuelle -->
          <div v-if="article.cover_url" class="mb-4">
            <img :src="article.cover_url" alt="Image de couverture" class="h-48 w-full object-cover rounded-lg" >
          </div>

          <div class="space-y-4">
            <!-- Composant MediaSelector intégré avec son bouton -->
            <MediaSelector v-model="article.cover_url" />

            <!-- Séparateur ou texte -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-gray-200"/>
              <span class="text-sm text-gray-400">ou</span>
              <div class="flex-1 h-px bg-gray-200"/>
            </div>

            <!-- Composant pour uploader une nouvelle image -->
            <div>
              <ImageUploader
                v-model="article.cover_url"
                :article-title="article.title"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Le reste du formulaire -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100">
          <h2 class="font-semibold text-gray-800">Information de l'article</h2>
        </div>

        <div class="p-5 space-y-4">
          <!-- Titre -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              v-model="article.title"
              type="text"
              placeholder="Titre de l'article"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
          </div>

          <!-- Sélection de catégorie -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              v-model="article.category_id"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
              <option :value="null">Choisir une catégorie</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Sélection de tags -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div class="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
              <label
                v-for="tag in tags"
                :key="tag.id"
                :class="[
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer',
                  selectedTags.includes(tag.id)
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                ]"
              >
                <input
                  v-model="selectedTags"
                  type="checkbox"
                  :value="tag.id"
                  class="hidden"
                >
                <span v-if="selectedTags.includes(tag.id)" class="w-2 h-2 rounded-full bg-indigo-500"/>
                <span v-else class="w-2 h-2 rounded-full border border-gray-300"/>
                {{ tag.name }}
              </label>
            </div>
          </div>

          <!-- Résumé -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Résumé</label>
            <textarea
              v-model="article.summary"
              placeholder="Résumé de l'article"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 h-24 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>

          <!-- Contenu -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
            <textarea
              v-model="article.content"
              placeholder="Contenu de l'article"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 h-48 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>

          <!-- Statut -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              v-model="article.status"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Boutons d'action -->
      <div class="flex justify-end gap-4 mt-6">
        <NuxtLink
          to="/admin"
          class="py-3 px-5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Annuler
        </NuxtLink>
        <button
          class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-5 rounded-xl font-medium shadow-sm hover:shadow-indigo-200 transition-all hover:translate-y-[-1px]"
          @click="updateArticle"
        >
          Mettre à jour
        </button>
      </div>

      <!-- Notifications -->
      <div v-if="error" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-red-700">
        <div class="flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          {{ error }}
        </div>
      </div>

      <div v-if="success" class="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg text-green-700">
        <div class="flex justify-between items-center">
          <div class="flex">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Article modifié avec succès !
          </div>
          <button
            class="text-sm hover:underline"
            @click="success = false"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

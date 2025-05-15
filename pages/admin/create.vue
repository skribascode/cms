<script setup lang="ts">
// Cette page utilise maintenant l'API du serveur au lieu de Supabase directement
import type { Post, Category, Tag } from '@/types/post'

definePageMeta({
  layout: 'admin'
})

useAdminGuard()

const toast = useToast()

const $editor = ref<DragonEditor>()
const post = ref<Partial<Post>>({
  title: '',
  summary: '',
  content: [] as any, // Cast pour éviter les problèmes de type avec DragonEditor
  status: 'draft',
  cover_url: '',
  category_id: null
})
const categorySearch = ref('')
const tags = ref<Tag[]>([])
const selectedTags = ref<string[]>([])
const categories = ref<Category[]>([])
const tagSearch = ref('')

const visibleTags = computed(() => {
  // Si une recherche est en cours, afficher tous les tags filtrés
  if (tagSearch.value && tags.value) {
    return tags.value.filter(tag =>
      tag.name.toLowerCase().includes(tagSearch.value.toLowerCase())
    )
  }

  // Si beaucoup de tags, n'afficher que les plus courants ou les premiers alphabétiquement
  if (tags.value && tags.value.length > 10) {
    return tags.value.slice(0, 10) // Affiche les 10 premiers tags
  }

  // Sinon afficher tous les tags
  return tags.value
})

const visibleCategories = computed(() => {
  // Si une recherche est en cours
  if (categorySearch.value && categories.value) {
    return categories.value.filter(category =>
      category.name.toLowerCase().includes(categorySearch.value.toLowerCase())
    )
  }

  // Si beaucoup de catégories, n'afficher que les premières
  if (categories.value && categories.value.length > 15) {
    // Prioriser l'affichage de la catégorie sélectionnée
    if (post.value.category_id) {
      const selectedCategory = categories.value.find(cat => cat.id === post.value.category_id)
      const otherCategories = categories.value
        .filter(cat => cat.id !== post.value.category_id)
        .slice(0, 14)  // 14 autres + 1 sélectionnée = 15 total

      return selectedCategory ? [selectedCategory, ...otherCategories] : otherCategories.slice(0, 10)
    }

    return categories.value.slice(0, 10)
  }

  // Par défaut, afficher toutes les catégories
  return categories.value
})

const uploadImageEvent = (file:File) => {
        // Do upload Image


        // Then add Image to editor
        // $editor.value.addBlock({
        //     type: "image",
        //     maxWidth: number,
        //     src: string,
        //     width: number,
        //     height: number,
        //     caption: string,
        //     classList: string[],
        // });
}
const createPost = async () => {
  if (!post.value.title || !post.value.summary || !post.value.content) {
    toast.error({
      title: 'Erreur',
      message: 'Tous les champs sont requis'
    });
    return;
  }

  // Préparation des données pour l'API
  const requestBody = {
    title: post.value.title,
    summary: post.value.summary,
    content: post.value.content,
    status: post.value.status,
    cover_url: post.value.cover_url || null,
    category_id: post.value.category_id,
    tag_ids: selectedTags.value // Inclure directement les tags pour que l'API les traite
  }

  try {
    const { error } = await useFetch('/api/posts', {
      method: 'POST',
      body: requestBody
    })

    if (error.value) {
      toast.error({
        title: 'Erreur',
        message: error.value.message || 'Une erreur est survenue lors de la création de l\'article'
      });
      return;
    }

    // Pas besoin d'insérer les tags séparément, car l'API s'en charge
    toast.success({
      title: 'Succès',
      message: 'Article publié avec succès !'
    });

    // Réinitialiser le formulaire après une création réussie
    post.value = {
      title: '',
      summary: '',
      content: [],
      status: 'draft',
      cover_url: null,
      category_id: null
    }
    selectedTags.value = []
  } catch (err) {
    console.error('Erreur lors de la création de l\'article:', err)
    toast.error({
      title: 'Erreur',
      message: 'Une erreur est survenue lors de la création de l\'article'
    });
    return;
  }
}

const toggleTag = (tagId: string) => {
  if (selectedTags.value.includes(tagId)) {
    selectedTags.value = selectedTags.value.filter(id => id !== tagId)
  } else {
    selectedTags.value.push(tagId)
  }
}

const isTagSelected = (tagId: string) => {
  return selectedTags.value.includes(tagId)
}

const selectCategory = (categoryId: string | null) => {
  post.value.category_id = post.value.category_id === categoryId ? null : categoryId
}

const isCategorySelected = (categoryId: string) => {
  return post.value.category_id === categoryId
}

onMounted(async () => {
  try {
    // Récupérer les catégories et tags disponibles en parallèle via l'API
    const [categoriesRes, tagsRes] = await Promise.all([
      useFetch<Category[]>('/api/categories', { method: 'GET' }),
      useFetch<Tag[]>('/api/tags', { method: 'GET' })
    ]);

    if (categoriesRes.error.value) {
      toast.error({
        title: 'Erreur',
        message: categoriesRes.error.value.message || 'Erreur lors du chargement des catégories'
      });
    } else {
      categories.value = categoriesRes.data.value || [];
    }

    if (tagsRes.error.value) {
      toast.error({
        title: 'Erreur',
        message: tagsRes.error.value.message || 'Erreur lors du chargement des tags'
      });
    } else {
      tags.value = tagsRes.data.value || [];
    }
  } catch (err) {
    console.error('Erreur lors du chargement des données', err);
    toast.error({
      title: 'Erreur',
      message: 'Une erreur est survenue lors du chargement des données'
    });
  }
})
</script>

<template>
  <div class="p-8 max-w-3xl mx-auto space-y-6">
    <h1 class="text-3xl font-bold mb-6">Nouvel article</h1>

    <div class="space-y-4">
      <div>
        <!-- Aperçu de l'image -->
        <div class="mb-4">
          <img
            v-if="post.cover_url"
            :src="post.cover_url"
            alt="Image de couverture"
            class="h-48 w-full object-cover rounded-lg"
          >
          <img
            v-else
            src="@/assets/images/default-image.jpeg"
            alt="Image de couverture"
            class="h-48 w-full object-cover rounded-lg"
          >
        </div>

        <div class="space-y-4">
          <!-- Composant MediaSelector intégré avec son bouton -->
          <MediaSelector
            :model-value="post.cover_url || ''"
            @update:model-value="val => post.cover_url = val || null"
          />

          <!-- Séparateur ou texte -->
          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-gray-200" />
            <span class="text-sm text-gray-400">ou</span>
            <div class="flex-1 h-px bg-gray-200" />
          </div>

          <div>
            <ImageUploader
              :model-value="post.cover_url || ''"
              @update:model-value="val => post.cover_url = val || null"
            />
          </div>
        </div>
      </div>

      <!-- Categories -->
      <div class="space-y-2">
        <h3 class="font-medium text-gray-700">Catégorie :</h3>

        <div v-if="categories?.length > 10" class="relative mb-3">
          <input
            v-model="categorySearch"
            type="text"
            placeholder="Rechercher une catégorie..."
            class="w-full pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in visibleCategories"
            :key="category.id"
            type="button"
            :class="[
              'py-1.5 px-3 rounded-full text-sm font-medium transition-all',
              isCategorySelected(category.id)
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            @click="selectCategory(category.id)"
          >
            <span class="flex items-center gap-1.5">
              <svg v-if="isCategorySelected(category.id)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              {{ category.name }}
            </span>
          </button>

          <span
            v-if="!categorySearch && categories && categories.length > 10"
            class="py-1.5 px-3 rounded-full text-sm bg-gray-50 text-gray-500"
          >
            +{{ categories.length - 10 }} autres catégories... (utilisez la recherche)
          </span>
        </div>

        <p v-if="categorySearch && visibleCategories.length === 0" class="text-gray-500 text-sm italic">
          Aucune catégorie ne correspond à votre recherche
        </p>
      </div>

      <!-- Sélection de tags avec badges interactifs -->
      <div class="space-y-2">
        <h3 class="font-medium text-gray-700">Tags :</h3>

        <!-- Champ de recherche uniquement s'il y a beaucoup de tags -->
        <div v-if="tags?.length > 10" class="relative mb-3">
          <input
            v-model="tagSearch"
            type="text"
            placeholder="Rechercher parmi les tags..."
            class="w-full pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in visibleTags"
            :key="tag.id"
            type="button"
            :class="[
              'py-1.5 px-3 rounded-full text-sm font-medium transition-all',
              isTagSelected(tag.id)
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm hover:shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            @click="toggleTag(tag.id)"
          >
            <span class="flex items-center gap-1.5">
              <svg v-if="isTagSelected(tag.id)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              {{ tag.name }}
            </span>
          </button>

          <!-- Ajouter un indicateur si tous les tags ne sont pas affichés -->
          <span
            v-if="!tagSearch && tags && tags.length > 10"
            class="py-1.5 px-3 rounded-full text-sm bg-gray-50 text-gray-500"
          >
            +{{ tags.length - 10 }} autres tags... (utilisez la recherche)
          </span>
        </div>

        <!-- Modifier le message pour indiquer qu'une recherche est nécessaire -->
        <p v-if="tagSearch && visibleTags.length === 0" class="text-gray-500 text-sm italic">
          Aucun tag ne correspond à votre recherche
        </p>
      </div>

      <input v-model="post.title" type="text" placeholder="Titre" class="w-full p-3 border rounded" >
      <textarea v-model="post.summary" placeholder="Résumé" class="w-full p-3 border rounded h-24" />
      <div class="editor-area">
        <DragonEditor v-model="post.content" @uploadImageEvent="uploadImageEvent" ref="$editor"/>
      </div>

      <select v-model="post.status" class="w-full p-3 border rounded">
        <option value="draft">Brouillon</option>
        <option value="published">Publié</option>
      </select>

      <div class="flex justify-end gap-4">
        <NuxtLink to="/admin" class="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors">
          Annuler
        </NuxtLink>
        <button
          class="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          @click="createPost"
        >
          Publier
        </button>
      </div>
    </div>
  </div>
</template>

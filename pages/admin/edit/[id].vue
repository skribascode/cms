<script setup lang='ts'>
import type { FormattedPost } from '@/types/post'

definePageMeta({
  layout: 'admin'
})

useAdminGuard()

const route = useRoute()
const id = route.params.id as string
const toast = useToast()

const post = ref<FormattedPost | null>(null)
const loading = ref(true)
const error = ref('')
const success = ref(false)
const categories = ref<{ id: string; name: string }[]>([]);
const tags = ref<{ id: string; name: string }[]>([]);
const selectedTags = ref<string[]>([])
const categorySearch = ref('')
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
    if (post.value?.category_id) {
      const selectedCategory = categories.value.find(cat => cat.id === post.value?.category_id)
      const otherCategories = categories.value
        .filter(cat => cat.id !== post.value?.category_id)
        .slice(0, 14)  // 14 autres + 1 sélectionnée = 15 total

      return selectedCategory ? [selectedCategory, ...otherCategories] : otherCategories.slice(0, 10)
    }

    return categories.value.slice(0, 10)
  }

  // Par défaut, afficher toutes les catégories
  return categories.value
})

const fetchPost = async () => {
  try {
    const { data: res, error: fetchError } = await useFetch<FormattedPost>(`/api/posts/${id}`, {
      method: 'GET'
    })

    if (fetchError.value || !res.value) {
      toast.error({
        title: 'Erreur',
        message: fetchError.value?.message || 'Article introuvable'
      })
      loading.value = false
      return
    }

    post.value = res.value

    // S'assurer que nous travaillons avec un tableau de tags
    selectedTags.value = Array.isArray(res.value.tags)
      ? res.value.tags.map(tag => tag.id)
      : [];

  } catch (error) {
    console.error('Erreur lors du chargement des posts', error)
    toast.error({
      title: 'Erreur',
      message: 'Impossible de charger l\'article'
    })
  } finally {
    loading.value = false
  }
}

const updatePost = async () => {
  if (!post.value) {
    toast.error({ title: 'Erreur', message: 'Aucun article à mettre à jour' });
    return;
  }

  error.value = '';
  success.value = false;

  if (!post.value.title || !post.value.summary || !post.value.content) {
    toast.error({ title: 'Erreur', message: 'Tous les champs sont requis' });
    return;
  }

  try {
    // S'assurer que selectedTags.value est bien un tableau non-vide
    if (!Array.isArray(selectedTags.value)) {
      selectedTags.value = [];
    }

    // Ne pas filtrer avec Boolean car cela peut éliminer des IDs valides comme "0"
    const uniqueTags = Array.from(new Set(selectedTags.value));

    // Assurer que tag_ids est bien un tableau
    const tag_ids = [...uniqueTags];

    // Créer le corps de la requête et le logger pour débogage
    const requestBody = {
      title: post.value.title,
      summary: post.value.summary,
      content: post.value.content,
      status: post.value.status,
      cover_url: post.value.cover_url || null,
      category_id: post.value.category_id,
      tag_ids: tag_ids // On a déjà vérifié que c'est un tableau
    };

    const { error: updateError } = await useFetch(`/api/posts/${id}`, {
      method: 'PUT',
      body: requestBody
    });

    if (updateError?.value) {
      toast.error({
        title: 'Erreur',
        message: updateError.value.message || 'Erreur inconnue'
      });
      return;
    }

    // Recharger l'article pour vérifier les changements
    await fetchPost();
    toast.success({
      title: 'Succès',
      message: 'Article modifié avec succès !'
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l’article', err);
    toast.error({
      title: 'Erreur',
      message: 'Une erreur est survenue lors de la mise à jour'
    });
  }
};

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
  if (!post.value) return
  post.value.category_id = post.value.category_id === categoryId ? null : categoryId
}

const isCategorySelected = (categoryId: string) => {
  return post.value?.category_id === categoryId
}

// Charger les catégories et tags au montage du composant
onMounted(async () => {
  if (!id) {
    toast.error({ title: 'Erreur', message: 'Aucun ID d\'article fourni' });
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    // Récupérer les catégories via l'API
    const { data: categoriesRes, error: categoriesError } = await useFetch<{ id: string; name: string }[]>('/api/categories', {
      method: 'GET'
    });

    if (categoriesError?.value) {
      toast.error({
        title: 'Erreur',
        message: categoriesError.value.message || 'Erreur lors du chargement des catégories'
      });
      return;
    }

    categories.value = categoriesRes?.value || [];

    // Récupérer les tags via l'API
    const { data: tagsRes, error: tagsError } = await useFetch<{ id: string; name: string }[]>('/api/tags', {
      method: 'GET'
    });

    if (tagsError?.value) {
      toast.error({
        title: 'Erreur',
        message: tagsError.value.message || 'Erreur lors du chargement des tags'
      });
      return;
    }

    tags.value = tagsRes?.value || [];

    // Récupérer les données de l'article
    await fetchPost();
  } catch (err) {
    console.error('Erreur lors du chargement des données', err);
    toast.error({
      title: 'Erreur',
      message: 'Une erreur est survenue lors du chargement des données'
    });
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="post" class='p-8 max-w-3xl mx-auto'>
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
            <MediaSelector :model-value="post.cover_url || ''" @update:model-value="post.cover_url = $event" />

            <!-- Séparateur ou texte -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-gray-200"/>
              <span class="text-sm text-gray-400">ou</span>
              <div class="flex-1 h-px bg-gray-200"/>
            </div>

            <!-- Composant pour uploader une nouvelle image -->
            <div>
              <ImageUploader
                v-model="post.cover_url"
                :post-title="post.title"
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
              v-model="post.title"
              type="text"
              placeholder="Titre de l'article"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
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

          <!-- Résumé -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Résumé</label>
            <textarea
              v-model="post.summary"
              placeholder="Résumé de l'article"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 h-24 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>

          <!-- Contenu -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
            <div class="editor-area">
              <DragonEditor v-model="post.content" />
            </div>
          </div>

          <!-- Statut -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              v-model="post.status"
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
          @click="updatePost"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  </div>
</template>

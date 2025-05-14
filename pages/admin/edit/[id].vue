<script setup lang='ts'>
import type { FormattedPost } from '@/types/post'

definePageMeta({
  layout: 'admin'
})

useAdminGuard()

const route = useRoute()
const id = route.params.id as string

const post = ref<FormattedPost | null>(null)
const loading = ref(true)
const error = ref('')
const success = ref(false)
const categories = ref<{ id: string; name: string }[]>([]);
const tags = ref<{ id: string; name: string }[]>([]);
const selectedTags = ref<string[]>([])

const fetchPost = async () => {
  try {
    const { data: res, error: fetchError } = await useFetch<FormattedPost>(`/api/posts/${id}`, {
      method: 'GET'
    })

    if (fetchError.value || !res.value) {
      error.value = fetchError.value?.message || 'Article introuvable'
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
  } finally {
    loading.value = false
  }
}

const updatePost = async () => {
  if (!post.value) {
    error.value = 'Aucun article à mettre à jour';
    return;
  }

  error.value = '';
  success.value = false;

  if (!post.value.title || !post.value.summary || !post.value.content) {
    error.value = 'Tous les champs sont requis';
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
      error.value = updateError.value.message || 'Erreur inconnue';
      return;
    }

    // Recharger l'article pour vérifier les changements
    await fetchPost();
    success.value = true;
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l’article', err);
    error.value = 'Une erreur est survenue lors de la mise à jour';
  }
};

// Charger les catégories et tags au montage du composant
onMounted(async () => {
  try {
    // Récupérer les catégories via l'API
    const { data: categoriesRes, error: categoriesError } = await useFetch<{ id: string; name: string }[]>('/api/categories', {
      method: 'GET'
    });

    if (categoriesError?.value) {
      error.value = categoriesError.value.message || 'Erreur lors du chargement des catégories';
      return;
    }

    categories.value = categoriesRes?.value || [];

    // Récupérer les tags via l'API
    const { data: tagsRes, error: tagsError } = await useFetch<{ id: string; name: string }[]>('/api/tags', {
      method: 'GET'
    });

    if (tagsError?.value) {
      error.value = tagsError.value.message || 'Erreur lors du chargement des tags';
      return;
    }

    tags.value = tagsRes?.value || [];

    // Récupérer les données de l'article
    await fetchPost();
  } catch (err) {
    console.error('Erreur lors du chargement des données', err);
    error.value = 'Une erreur est survenue lors du chargement des données';
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
          <!-- Aperçu de l'image actuelle -->
          <div v-if="post.cover_url" class="mb-4">
            <img :src="post.cover_url" alt="Image de couverture" class="h-48 w-full object-cover rounded-lg" >
          </div>

          <div class="space-y-4">
            <!-- Composant MediaSelector intégré avec son bouton -->
            <MediaSelector v-model="post.cover_url" />

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

          <!-- Sélection de catégorie -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              v-model="post.category_id"
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
                  @change="handleTagChange"
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
              v-model="post.summary"
              placeholder="Résumé de l'article"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 h-24 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>

          <!-- Contenu -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
            <textarea
              v-model="post.content"
              placeholder="Contenu de l'article"
              class="w-full p-3 bg-gray-50 border-0 rounded-xl text-gray-800 h-48 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
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

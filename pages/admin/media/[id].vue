<script setup lang="ts">
import type { Posts } from '@/types/post'

interface MediaImage {
  id: string;
  name: string;
  url: string;
  created_at: string;
  size: number;
  metadata?: {
    size?: number;
    [key: string]: unknown;
  };
}

definePageMeta({
  layout: 'admin'
})

useAdminGuard()

const supabase = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const imageId = route.params.id as string
const image = ref<MediaImage | null>(null)
const loading = ref(true)
const linkedPosts = ref<Posts[]>([])
const showPostSelector = ref(false)
const availablePosts = ref<Posts[]>([])
const loadingPosts = ref(false)
const selectedPostId = ref('')
const linkSuccess = ref(false)
const showDeleteModal = ref(false)

// Récupérer les détails de l'image
const fetchImageDetails = async () => {
  loading.value = true

  try {
    // Récupérer la liste des fichiers pour trouver celui qui correspond à l'ID
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('media')  // Correction du nom du bucket
      .list()

    if (storageError) throw storageError

    const targetFile = storageData?.find(file => file.id === imageId)
    if (!targetFile) {
      throw new Error('Image non trouvée')
    }

    // Créer l'URL publique pour cette image
    const { data: publicURL } = supabase
      .storage
      .from('media')  // Correction du nom du bucket
      .getPublicUrl(targetFile.name)

    // Récupérer les articles qui utilisent cette image
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, cover_url')
      .or(`cover_url.eq.${publicURL.publicUrl},cover_url.ilike.%${targetFile.name}%`)

    if (postsError) throw postsError

    // Construire l'objet image avec toutes les informations
    image.value = {
      id: targetFile.id,
      name: targetFile.name,
      url: publicURL.publicUrl,
      created_at: targetFile.created_at,
      size: targetFile.metadata?.size || 0,
      metadata: targetFile.metadata,
    }

    linkedPosts.value = posts || []

  } catch (error) {
    console.error('Erreur lors du chargement des détails de l\'image:', error)
    // Rediriger vers la page principale en cas d'erreur
    router.push('/admin/media')
  } finally {
    loading.value = false
  }
}

// Récupérer tous les articles disponibles
const fetchAvailablePosts = async () => {
  loadingPosts.value = true
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, cover_url')
      .order('title', { ascending: true })

    if (error) throw error

    // Exclure les articles déjà liés à cette image
    availablePosts.value = (data?.filter(post =>
      !linkedPosts.value.some((linked: Posts) => linked.id === post.id)
    ) as Posts[] || [])
  } catch (error) {
    console.error("Erreur lors de la récupération des articles:", error)
  } finally {
    loadingPosts.value = false
  }
}

// Lier l'image à l'article sélectionné
const linkImageToPost = async () => {
  if (!selectedPostId.value) return

  try {
    // Mise à jour de l'article avec l'URL de l'image
    const { error } = await supabase
      .from('posts')
      .update({ cover_url: image.value.url })
      .eq('id', selectedPostId.value)

    if (error) throw error

    // Récupérer les informations de l'article mis à jour
    const { data: postData } = await supabase
      .from('posts')
      .select('id, title, cover_url')
      .eq('id', selectedPostId.value)
      .single()

    if (postData) {
      // Ajouter l'article à la liste des articles liés
      linkedPosts.value.push(postData)
    }

    // Réinitialiser les états
    selectedPostId.value = ''
    showPostSelector.value = false

    // Afficher le message de succès
    linkSuccess.value = true
    setTimeout(() => {
      linkSuccess.value = false
    }, 3000)

  } catch (error) {
    console.error("Erreur lors de la liaison de l'image:", error)
    alert("Une erreur s'est produite lors de la liaison de l'image à l'article.")
  }
}

// Ouvrir le sélecteur d'articles
const openPostSelector = () => {
  fetchAvailablePosts()
  showPostSelector.value = true
}

// Supprimer l'image
const deleteImage = async () => {
  try {
    loading.value = true

    // Mettre à jour les articles liés à cette image
    if (linkedPosts.value.length) {
      for (const post of linkedPosts.value) {
        await supabase
          .from('posts')
          .update({ cover_url: null })
          .eq('id', post.id)
      }
    }

    // Supprimer l'image du stockage
    const { error } = await supabase
      .storage
      .from('media')  // Correction du nom du bucket
      .remove([image.value.name])

    if (error) throw error

    // Rediriger vers la médiathèque
    router.push('/admin/media')
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    loading.value = false
  }
}

// Formater la taille du fichier
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

// Formater la date
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchImageDetails()
})
</script>

<template>
  <div class="bg-gray-50 min-h-screen p-6 lg:p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Retour à la liste -->
      <NuxtLink to="/admin/media" class="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Retour à la médiathèque
      </NuxtLink>

      <!-- État de chargement avec animation -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="relative">
          <div class="h-16 w-16 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin" />
          <div
            class="h-12 w-12 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin absolute top-2 left-2" />
        </div>
      </div>

      <div v-else-if="image" class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Image avec aperçu -->
        <div class="md:col-span-2 bg-white rounded-2xl overflow-hidden shadow-sm">
          <div class="bg-gray-100 p-1">
            <img :src="image.url" :alt="image.name" class="w-full h-auto object-contain max-h-[500px]" >
          </div>
        </div>

        <!-- Informations et actions -->
        <div class="space-y-6">
          <!-- Détails de l'image -->
          <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div class="p-5 border-b border-gray-100">
              <h2 class="text-lg font-semibold text-gray-800">
                Détails de l'image
              </h2>
            </div>

            <div class="p-5 space-y-4">
              <div>
                <p class="text-sm text-gray-500">Nom du fichier</p>
                <p class="text-gray-700 font-medium break-all">
                  {{ image.name }}
                </p>
              </div>

              <div>
                <p class="text-sm text-gray-500">Date d'ajout</p>
                <p class="text-gray-700">{{ formatDate(image.created_at) }}</p>
              </div>

              <div>
                <p class="text-sm text-gray-500">Taille</p>
                <p class="text-gray-700">{{ formatFileSize(image.size) }}</p>
              </div>

              <div>
                <p class="text-sm text-gray-500">URL publique</p>
                <div class="flex items-center gap-2">
                  <input
                    type="text" :value="image.url" readonly
                    class="text-xs p-2 bg-gray-50 border border-gray-200 rounded w-full"
                    @click="($event.target as HTMLInputElement).select()" >
                  <button
                    class="p-2 bg-gray-100 rounded hover:bg-gray-200" title="Copier l'URL"
                    @click="navigator.clipboard.writeText(image.url)">
                    <svg
                      xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Bouton de suppression -->
              <div class="pt-3 border-t border-gray-100">
                <button
                  class="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  @click="showDeleteModal = true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Supprimer l'image
                </button>
              </div>
            </div>
          </div>

          <!-- Articles liés -->
          <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div class="p-5 border-b border-gray-100">
              <h2 class="text-lg font-semibold text-gray-800">
                Articles liés
                <span class="bg-indigo-100 text-indigo-700 text-xs py-1 px-2 rounded-full ml-2">
                  {{ linkedPosts.length }}
                </span>
              </h2>
            </div>

            <div v-if="linkedPosts.length === 0" class="p-5">
              <div class="text-center py-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-12 w-12 mx-auto text-gray-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <p class="text-gray-500 mb-4">
                  Aucun article n'utilise cette image
                </p>
                <button
                  class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm hover:shadow-indigo-200 transition-all hover:translate-y-[-1px] flex items-center gap-2 mx-auto"
                  @click="openPostSelector">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Lier à un article
                </button>
              </div>
            </div>

            <ul v-else class="divide-y divide-gray-100">
              <li v-for="post in linkedPosts" :key="post.id" class="p-4 hover:bg-gray-50">
                <NuxtLink
                  :to="`/admin/edit/${post.id}`"
                  class="flex items-center gap-2 text-gray-700 hover:text-indigo-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {{ post.title }}
                </NuxtLink>
              </li>

              <!-- Bouton pour ajouter un autre article -->
              <li class="p-4 text-center">
                <button
                  class="text-indigo-600 hover:text-indigo-800 text-sm font-medium inline-flex items-center gap-1.5"
                  @click="openPostSelector">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Lier à un autre article
                </button>
              </li>
            </ul>

            <!-- Notification de succès -->
            <div
              v-if="linkSuccess"
              class="m-4 p-3 bg-green-50 rounded-lg border border-green-100 flex items-center text-green-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-2 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              Image liée avec succès !
            </div>
          </div>

          <!-- Modal de sélection de post -->
          <div v-if="showPostSelector" class="fixed inset-0 z-50 overflow-y-auto">
            <!-- Overlay -->
            <div
              class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
              @click="showPostSelector = false" />

            <!-- Modal -->
            <div class="relative min-h-screen flex items-center justify-center p-4">
              <div
                class="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden transition-all transform">
                <!-- En-tête -->
                <div class="flex items-center justify-between p-5 border-b border-gray-100">
                  <h3
                    class="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Sélectionner un article
                  </h3>
                  <button
                    class="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    @click="showPostSelector = false"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Contenu -->
                <div class="p-5">
                  <!-- État de chargement -->
                  <div v-if="loadingPosts" class="flex justify-center items-center py-10">
                    <div class="relative">
                      <div class="h-10 w-10 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin" />
                      <div
                        class="h-6 w-6 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin absolute top-2 left-2" />
                    </div>
                  </div>

                  <!-- Message s'il n'y a pas d'articles disponibles -->
                  <div v-else-if="availablePosts.length === 0" class="text-center py-6">
                    <p class="text-gray-500">
                      Tous les articles sont déjà liés à cette image
                    </p>
                  </div>

                  <!-- Liste des articles disponibles -->
                  <div v-else class="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    <label
                      v-for="post in availablePosts"
                      :key="post.id"
                      :class="[
                          'block p-3 border rounded-xl cursor-pointer transition',
                          selectedPostId === post.id
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        ]"
                    >
                      <input v-model="selectedPostId" type="radio" name="article" :value="post.id" class="hidden" >
                      <div class="flex items-center">
                        <div class="flex-1 truncate">
                          <div class="font-medium text-gray-800">
                            {{ post.title }}
                          </div>
                        </div>
                        <div v-if="selectedPostId === post.id" class="ml-3 text-indigo-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </label>
                  </div>

                  <!-- Bouton d'action -->
                  <div class="mt-6 flex justify-end">
                    <button
                      :disabled="!selectedPostId"
                      :class="[
                        'py-2 px-4 rounded-xl text-white font-medium transition-all',
                        selectedPostId
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-md hover:translate-y-[-1px]'
                          : 'bg-gray-300 cursor-not-allowed'
                      ]"
                      @click="linkImageToPost"
                    >
                      Lier l'image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal de confirmation de suppression -->
          <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
            <!-- Overlay avec flou -->
            <div
              class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
              @click="showDeleteModal = false"
            />

            <!-- Modal -->
            <div class="relative min-h-screen flex items-center justify-center p-4">
              <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all transform">
                <!-- En-tête -->
                <div class="p-6 border-b border-gray-100">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Confirmation de suppression
                  </h3>
                </div>

                <!-- Corps de la modal -->
                <div class="p-6">
                  <div class="mb-6">
                    <p class="text-gray-700 mb-4">
                      Êtes-vous sûr de vouloir supprimer cette image ?
                      <span class="font-semibold text-gray-800 block mt-2">{{ image.name }}</span>
                    </p>

                    <div
                      v-if="linkedPosts.length > 0"
                      class="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded-r"
                    >
                      <p class="font-medium mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fill-rule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        Attention !
                      </p>
                      <p>
                        Cette image est utilisée dans
                        <strong>{{ linkedPosts.length }}</strong>
                        article{{ linkedPosts.length > 1 ? 's' : '' }}.
                        <br >
                        La suppression de l'image l'enlèvera également de ces
                        articles.
                      </p>
                    </div>
                  </div>

                  <div class="flex justify-between">
                    <button
                      class="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                      :disabled="loading"
                      @click="showDeleteModal = false"
                    >
                      Annuler
                    </button>
                    <button
                      class="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                      :disabled="loading"
                      @click="deleteImage"
                    >
                      <template v-if="loading">
                        <svg
                          class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none" viewBox="0 0 24 24"
                        >
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Suppression...
                      </template>
                      <template v-else>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Confirmer la suppression
                      </template>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

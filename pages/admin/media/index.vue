<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

useAdminGuard()

interface MediaImage {
  id: string
  name: string
  url: string
  created_at: string
  size: number
  linkedPosts: Array<{ id: string; title: string; cover_url: string }>
  isLinked: boolean
}

interface FileSizeFormatter {
  (bytes: number): string;
}

const supabase = useSupabaseClient()
const images = ref<MediaImage[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedFilter = ref('all')
const imageUploadedUrl = ref('')
const showCleanupModal = ref(false)
const cleanupLoading = ref(false)
const cleanupSuccess = ref(false)
const cleanupCount = ref(0)

// Récupération des images du bucket
const fetchImages = async () => {
  loading.value = true

  try {
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('media')
      .list('', { sortBy: { column: 'name', order: 'asc' } })

    if (storageError) throw storageError

    if (!storageData?.length) {
      images.value = []
      loading.value = false
      return
    }

    // Récupérer les articles pour vérifier les associations
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, cover_url')

    if (postsError) throw postsError

    // Créer les URLs publiques pour chaque image
    const imageList = await Promise.all(storageData.map(async (file) => {
      // Vérifier si c'est bien un fichier image
      if (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        // Obtention de l'URL publique
        const { data } = supabase
          .storage
          .from('media')
          .getPublicUrl(file.name)

        // Trouver les posts liés à cette image
        const linkedPosts = posts?.filter(post => {
          const isLinked = post.cover_url === data.publicUrl ||
                          (post.cover_url && post.cover_url.includes(file.name))
          return isLinked
        }) || []

        return {
          id: file.id,
          name: file.name,
          url: data.publicUrl,
          created_at: file.created_at,
          size: file.metadata?.size || 0,
          linkedPosts,
          isLinked: linkedPosts.length > 0
        }
      }
      return null
    }))

    // Filtrer pour ne garder que les images valides
    images.value = imageList.filter((img): img is MediaImage => img !== null)
  } catch (error) {
    console.error('Erreur lors du chargement des images:', error)
  } finally {
    loading.value = false
  }
}

const formatFileSize: FileSizeFormatter = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

// Filtrer les images en fonction de la recherche et du filtre
const filteredImages = computed(() => {
  let filtered = [...images.value]

  // Filtre par état de liaison
  if (selectedFilter.value === 'linked') {
    filtered = filtered.filter(img => img.isLinked)
  } else if (selectedFilter.value === 'unlinked') {
    filtered = filtered.filter(img => !img.isLinked)
  }

  // Filtre par recherche textuelle
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(img =>
      img.name.toLowerCase().includes(query)
    )
  }

  return filtered
})

const uploadImageSuccess = async () => {
  await fetchImages()
  imageUploadedUrl.value = ''
}

// Fonction pour compter les images non liées
const countUnlinkedImages = () => {
  const unlinked = images.value.filter(img => !img.isLinked)
  cleanupCount.value = unlinked.length
  if (unlinked.length > 0) {
    showCleanupModal.value = true
  } else {
    // Afficher un message s'il n'y a rien à nettoyer
    alert('Aucune image non utilisée à supprimer')
  }
}

// Fonction pour supprimer toutes les images non liées
const cleanupUnlinkedImages = async () => {
  cleanupLoading.value = true

  try {
    const unlinkedImages = images.value.filter(img => !img.isLinked)

    // Supprimer les images une par une
    for (const image of unlinkedImages) {
      await supabase
        .storage
        .from('media')
        .remove([image.name])
    }

    // Masquer la modal et afficher le succès
    showCleanupModal.value = false
    cleanupSuccess.value = true

    // Actualiser la liste des images
    await fetchImages()

    // Masquer le message de succès après 3 secondes
    setTimeout(() => {
      cleanupSuccess.value = false
    }, 3000)

  } catch (error) {
    console.error('Erreur lors du nettoyage des images:', error)
    alert('Une erreur est survenue lors de la suppression des images')
  } finally {
    cleanupLoading.value = false
  }
}

onMounted(() => {
  fetchImages()
})
</script>

<template>
  <div class="bg-gray-50 min-h-screen p-6 lg:p-8">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- En-tête moderne avec recherche -->
      <div class="bg-white rounded-2xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Médiathèque</h1>
          <p class="text-gray-500 text-sm mt-1">Gérez les images utilisées sur votre site</p>
        </div>

        <div class="flex gap-3 items-center">
          <!-- Bouton balayette pour le nettoyage -->
          <button
            v-if="images.filter(img => !img.isLinked).length > 0"
            class="flex justify-center items-center p-2 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-all relative group"
            title="Nettoyer les images non utilisées"
            @click="countUnlinkedImages"
          >
            <Icon name="mingcute:broom-line" class="text-2xl" />
            <span class="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full transition-opacity">
              {{ images.filter(img => !img.isLinked).length }}
            </span>
          </button>

          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher..."
              class="pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-sm text-gray-800 w-full md:w-64 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- Filtres -->
          <div class="inline-flex rounded-xl shadow-sm">
            <button
              :class="[
                'py-2 px-4 text-sm font-medium rounded-l-xl transition-colors',
                selectedFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              ]"
              @click="selectedFilter = 'all'"
            >
              Tous
            </button>
            <button
              :class="[
                'py-2 px-4 text-sm font-medium transition-colors',
                selectedFilter === 'linked'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              ]"
              @click="selectedFilter = 'linked'"
            >
              Liés
            </button>
            <button
              :class="[
                'py-2 px-4 text-sm font-medium rounded-r-xl transition-colors',
                selectedFilter === 'unlinked'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              ]"
              @click="selectedFilter = 'unlinked'"
            >
              Non liés
            </button>
          </div>
        </div>
      </div>

      <!-- Notification de succès du nettoyage -->
      <div
        v-if="cleanupSuccess"
        class="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg text-green-700 flex justify-between items-center"
      >
        <div class="flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          Images non utilisées supprimées avec succès !
        </div>
        <button
          class="text-sm hover:underline"
          @click="cleanupSuccess = false"
        >
          Fermer
        </button>
      </div>

      <!--  Upload image -->
      <ImageUploader v-model.sync="imageUploadedUrl" @success="uploadImageSuccess" />

      <!-- État de chargement avec animation -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="relative">
          <div class="h-16 w-16 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin"/>
          <div class="h-12 w-12 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin absolute top-2 left-2"/>
        </div>
      </div>

      <!-- Message d'absence d'images -->
      <div v-else-if="!filteredImages.length" class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <img src="https://illustrations.popsy.co/amber/taking-notes.svg" alt="No media" class="w-48 h-48 mx-auto mb-6" >
        <p class="text-xl font-medium text-gray-700">Aucune image disponible</p>
        <p class="text-gray-500 mt-2 mb-6">Commencez par téléverser des images sur votre site</p>
      </div>

      <!-- Grille d'images -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div
          v-for="image in filteredImages"
          :key="image.id"
          class="bg-white rounded-2xl overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group"
        >
          <!-- Image avec aperçu -->
          <NuxtLink :to="`/admin/media/${image.id}`" class="block relative aspect-square overflow-hidden">
            <img :src="image.url" :alt="image.name" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" >

            <!-- Badge indiquant si l'image est liée à un article -->
            <div v-if="image.isLinked" class="absolute top-3 right-3 bg-indigo-600/90 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm shadow-sm flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>{{ image.linkedPosts.length }}</span>
            </div>
          </NuxtLink>

          <!-- Informations et actions -->
          <div class="p-4">
            <div class="truncate mb-1 font-medium text-gray-800">{{ image.name }}</div>
            <div class="text-xs text-gray-500 mb-3">{{ formatFileSize(image.size) }}</div>

            <div class="flex justify-end items-center">
              <NuxtLink
                :to="`/admin/media/${image.id}`"
                class="text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
              >
                Voir les détails →
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de confirmation de nettoyage -->
      <div v-if="showCleanupModal" class="fixed inset-0 z-50 overflow-y-auto">
        <!-- Overlay avec flou -->
        <div
          class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
          @click="showCleanupModal = false"
        />

        <!-- Modal -->
        <div class="relative min-h-screen flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all transform">
            <!-- En-tête -->
            <div class="p-6 border-b border-gray-100">
              <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirmation de suppression
              </h3>
            </div>

            <!-- Corps de la modal -->
            <div class="p-6">
              <p class="text-gray-700 mb-6">
                Vous êtes sur le point de supprimer <strong class="text-indigo-600">{{ cleanupCount }}</strong> image{{ cleanupCount > 1 ? 's' : '' }}
                qui {{ cleanupCount > 1 ? 'ne sont' : 'n\'est' }} pas liée{{ cleanupCount > 1 ? 's' : '' }} à des articles.
                <br><br>
                Cette action est <strong class="text-red-600">irréversible</strong>.
              </p>

              <div class="flex justify-between">
                <button
                  class="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  :disabled="cleanupLoading"
                  @click="showCleanupModal = false"
                >
                  Annuler
                </button>
                <button
                  class="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  :disabled="cleanupLoading"
                  @click="cleanupUnlinkedImages"
                >
                  <template v-if="cleanupLoading">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Suppression...
                  </template>
                  <template v-else>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer {{ cleanupCount }} image{{ cleanupCount > 1 ? 's' : '' }}
                  </template>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

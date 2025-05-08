<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  buttonLabel?: string
  buttonStyle?: 'default' | 'minimal'
}>(), {
  buttonLabel: 'Choisir dans la médiathèque',
  buttonStyle: 'default'
})

const emit = defineEmits(['update:modelValue', 'select'])

const supabase = useSupabaseClient()
const images = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')
const showModal = ref(false)

// Récupérer les images stockées
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

    // Créer les URLs publiques pour chaque image
    const imageList = await Promise.all(storageData.map(async (file) => {
      if (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        const { data } = supabase
          .storage
          .from('media')
          .getPublicUrl(file.name)

        return {
          id: file.id,
          name: file.name,
          url: data.publicUrl,
          created_at: file.created_at,
          size: file.metadata?.size || 0
        }
      }
      return null
    }))

    images.value = imageList.filter(Boolean)
  } catch (error) {
    console.error('Erreur lors du chargement des images:', error)
  } finally {
    loading.value = false
  }
}

const selectImage = (imageUrl: string) => {
  emit('update:modelValue', imageUrl)
  emit('select', imageUrl)
  closeModal()
}

const openModal = () => {
  showModal.value = true
  fetchImages()
}

const closeModal = () => {
  showModal.value = false
}

// Filtrer les images en fonction de la recherche
const filteredImages = computed(() => {
  if (!searchQuery.value) return images.value

  const query = searchQuery.value.toLowerCase()
  return images.value.filter(img =>
    img.name.toLowerCase().includes(query)
  )
})
</script>

<template>
  <div>
    <!-- Bouton pour ouvrir le sélecteur -->
    <button
      v-if="buttonStyle === 'default'"
      class="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 text-gray-700 transition-all hover:shadow-sm"
      @click="openModal"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {{ buttonLabel }}
    </button>

    <button
      v-else-if="buttonStyle === 'minimal'"
      class="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 text-sm"
      @click="openModal"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {{ buttonLabel }}
    </button>

    <!-- Modal de sélection d'images -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto">
      <!-- Overlay avec animation -->
      <div
        class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        @click="closeModal"
      />

      <!-- Modal -->
      <div class="relative min-h-screen flex items-center justify-center p-4">
        <div
          class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden transition-all transform"
        >
          <!-- En-tête -->
          <div class="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 class="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Sélectionner une image
            </h3>

            <div class="flex items-center gap-4">
              <!-- Recherche -->
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Rechercher..."
                  class="pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-sm text-gray-800 w-64 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <!-- Bouton fermer -->
              <button
                class="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                @click="closeModal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Contenu -->
          <div class="overflow-y-auto p-6" style="max-height: calc(80vh - 70px)">
            <!-- État de chargement -->
            <div v-if="loading" class="flex justify-center items-center py-20">
              <div class="relative">
                <div class="h-12 w-12 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin"/>
                <div class="h-8 w-8 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin absolute top-2 left-2"/>
              </div>
            </div>

            <!-- Message si pas d'images -->
            <div v-else-if="images.length === 0" class="text-center py-12">
              <p class="text-gray-500">Aucune image disponible dans la médiathèque</p>
            </div>

            <!-- Grille d'images -->
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <div
                v-for="image in filteredImages"
                :key="image.id"
                class="group relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500"
                :class="{'ring-2 ring-purple-600': modelValue === image.url}"
                @click="selectImage(image.url)"
              >
                <img
                  :src="image.url"
                  :alt="image.name"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                >
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p class="text-white text-xs truncate">{{ image.name }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

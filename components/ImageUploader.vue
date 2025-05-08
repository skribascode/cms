<script setup lang='ts'>
const props = defineProps<{
  modelValue: string | null
  postTitle?: string // Nouvel prop pour l'ID de l'article (optionnel)
}>()

const emit = defineEmits(['update:modelValue', 'success'])
const supabase = useSupabaseClient()

const uploading = ref(false)
const errorMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
const imagePreview = ref(props.modelValue || '')

const openFileDialog = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

const upload = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  await uploadFile(files[0])
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  dragActive.value = false

  if (e.dataTransfer?.files?.length) {
    await uploadFile(e.dataTransfer.files[0])
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  dragActive.value = true
}

const handleDragLeave = () => {
  dragActive.value = false
}

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop() || ''
}

const uploadFile = async (file: File) => {
  const timestamp = Date.now()
  const extension = getFileExtension(file.name)

  // Format de nom de fichier : articleId_timestamp.extension
  // Si articleId n'est pas fourni, utiliser un identifiant aléatoire
  const articleIdPrefix = props.postTitle || 'img'
  const fileName = `${articleIdPrefix}_${timestamp}.${extension}`

  errorMessage.value = ''
  uploading.value = true

  try {
    const { error } = await supabase.storage
      .from('article-images')
      .upload(fileName, file)

    if (error) {
      errorMessage.value = `Erreur: ${error.message}`
      console.error('Erreur lors du chargement de l\'image:', error)
      return
    }

    const { data } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName)

    // Mise à jour locale de l'aperçu
    imagePreview.value = data.publicUrl

    // Émission pour mettre à jour la propriété parent
    emit('update:modelValue', data.publicUrl)
    emit('success')

    // Débogage
    console.log('Image uploadée avec succès:', data.publicUrl)
  } catch (e) {
    console.error('Exception:', e)
    errorMessage.value = `Exception: ${e instanceof Error ? e.message : String(e)}`
  } finally {
    uploading.value = false
  }
}

const removeImage = () => {
  imagePreview.value = ''
  emit('update:modelValue', '')
}

watch(() => props.modelValue, (newValue) => {
  imagePreview.value = newValue || ''
})
</script>

<template>
  <div class="space-y-4">
    <!-- Aperçu de l'image -->
    <div v-if="imagePreview" class="relative group rounded-lg overflow-hidden shadow-md">
      <img :src="imagePreview" class="w-full h-64 object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3">
        <button
          class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
          title="Supprimer l'image"
          @click="removeImage">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Zone de drop et input caché -->
    <div
      v-if="!imagePreview"
      :class="[
        'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer text-center',
        uploading ? 'border-blue-400 bg-blue-50' :
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
      ]"
      @click="openFileDialog"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop">

      <div class="flex flex-col items-center justify-center space-y-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-12 h-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>

        <div class="text-lg font-medium text-gray-700">
          {{ dragActive ? 'Déposez l\'image ici' : 'Glissez une image ou cliquez pour parcourir' }}
        </div>

        <p v-if="!uploading" class="text-sm text-gray-500">
          PNG, JPG ou GIF (max. 10MB)
        </p>

        <div v-if="uploading" class="flex items-center space-x-2 text-blue-600">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span>Chargement en cours...</span>
        </div>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="upload">

    <div v-if="errorMessage" class="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm">
      {{ errorMessage }}
    </div>
  </div>
</template>

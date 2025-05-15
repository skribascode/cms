<script setup lang='ts'>
const props = defineProps<{
  title: string
  table: 'categories' | 'tags'
}>()

const toast = useToast()

const items = ref<{ id: string; name: string; usage_count: number }[]>([])
const newName = ref('')
const editItemId = ref('')
const editName = ref('')
const loading = ref(true)
const showDeleteModal = ref(false)
const itemToDelete = ref<string | null>(null)
const itemToDeleteName = ref('')

const fetchItems = async () => {
  loading.value = true

  try {
    const response = await $fetch<{ id: string; name: string; usage_count: number }[]>(`/api/${props.table}`)
    items.value = response || []
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Erreur de récupération des éléments:', error)
    toast.error({
      title: 'Erreur',
      message: `Impossible de récupérer les ${props.title.toLowerCase()}: ${errorMsg}`
    })
  } finally {
    loading.value = false
  }
}

const createItem = async () => {
  if (!newName.value.trim()) {
    toast.warning({
      title: 'Attention',
      message: 'Veuillez saisir un nom'
    })
    return
  }

  try {
    await $fetch(`/api/${props.table}`, {
      method: 'POST',
      body: { name: newName.value }
    })

    toast.success({
      title: 'Succès',
      message: `${props.title.slice(0, -1)} "${newName.value}" ajouté avec succès`
    })
    newName.value = ''
    await fetchItems()
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
    toast.error({
      title: 'Erreur',
      message: `Impossible de créer ${props.title.toLowerCase().slice(0, -1)}: ${errorMsg}`
    })
  }
}

const openDeleteModal = (id: string, name: string) => {
  itemToDelete.value = id
  itemToDeleteName.value = name
  showDeleteModal.value = true
}

const cancelDelete = () => {
  showDeleteModal.value = false
  itemToDelete.value = null
  itemToDeleteName.value = ''
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return

  try {
    await $fetch(`/api/${props.table}/${itemToDelete.value}`, {
      method: 'DELETE'
    })

    toast.success({
      title: 'Suppression effectuée',
      message: `${props.title.slice(0, -1)} "${itemToDeleteName.value}" supprimé`
    })

    // Réinitialiser les valeurs
    showDeleteModal.value = false
    itemToDelete.value = null
    itemToDeleteName.value = ''

    // Rafraîchir la liste
    await fetchItems()
  } catch (error: unknown) {
    // Traiter spécifiquement les erreurs HTTP 400 (contrainte de clé étrangère)
    if (error instanceof Error) {
      // Définir un type pour les erreurs de l'API
      type FetchErrorWithData = Error & {
        status?: number;
        data?: {
          data?: {
            constraint?: string;
          }
        }
      }
      const fetchError = error as FetchErrorWithData

      if (fetchError.status === 400 ||
         (fetchError.data?.data?.constraint === 'foreign_key_constraint')) {
        // Erreur spécifique à la contrainte de clé étrangère
        toast.error({
          title: 'Impossible de supprimer',
          message: `Ce ${props.title.slice(0, -1).toLowerCase()} "${itemToDeleteName.value}" est utilisé par des articles. Veuillez d'abord modifier ces articles.`
        })
      } else if (fetchError.message && fetchError.message.includes('foreign key constraint')) {
        // Fallback pour les anciennes erreurs de contrainte de clé étrangère
        toast.error({
          title: 'Impossible de supprimer',
          message: `Ce ${props.title.slice(0, -1).toLowerCase()} "${itemToDeleteName.value}" est utilisé par des articles. Veuillez d'abord modifier ces articles.`
        })
      } else {
        // Autres types d'erreurs
        const errorMsg = fetchError.message || 'Erreur inconnue'
        toast.error({
          title: 'Erreur',
          message: `Impossible de supprimer: ${errorMsg}`
        })
      }
    } else {
      // Fallback pour des erreurs non standardisées
      toast.error({
        title: 'Erreur',
        message: `Impossible de supprimer: Une erreur inattendue s'est produite`
      })
    }

    // Même en cas d'erreur, fermer la modale
    showDeleteModal.value = false
  }
}

// Fonction simplifiée qui ouvre la modale au lieu de faire la suppression directement
const deleteItem = (id: string, name: string) => {
  openDeleteModal(id, name)
}

const startEdit = (item: { id: string; name: string }) => {
  editItemId.value = item.id
  editName.value = item.name
}

const saveEdit = async () => {
  if (!editItemId.value || !editName.value.trim()) {
    toast.warning({
      title: 'Attention',
      message: 'Le nom ne peut pas être vide'
    })
    return
  }

  try {
    await $fetch(`/api/${props.table}/${editItemId.value}`, {
      method: 'PUT',
      body: { name: editName.value }
    })

    toast.success({
      title: 'Succès',
      message: `${props.title.slice(0, -1)} modifié avec succès`
    })

    editItemId.value = ''
    editName.value = ''
    await fetchItems()
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
    toast.error({
      title: 'Erreur',
      message: `Impossible de modifier: ${errorMsg}`
    })
  }
}

onMounted(fetchItems)
</script>

<template>
  <div class="bg-gray-50 min-h-screen p-6 lg:p-8">
    <div class="max-w-3xl mx-auto">
      <!-- En-tête moderne -->
      <div class="bg-white rounded-2xl shadow-sm p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{{ title }}</h1>
          <p class="text-gray-500 text-sm mt-1">Gérez les {{ title.toLowerCase() }} de votre site</p>
        </div>
      </div>

      <!-- Formulaire d'ajout -->
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm mb-8">
        <div class="p-6 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-800">Ajouter un nouvel élément</h2>
        </div>
        <div class="p-6">
          <form class="flex flex-col sm:flex-row gap-3" @submit.prevent="createItem">
            <input
              v-model="newName"
              class="flex-1 p-3 bg-gray-50 border-0 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              placeholder="Nom"
            >
            <button
              type="submit"
              class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium shadow-sm hover:shadow-indigo-200 transition-all hover:translate-y-[-1px]"
            >
              Ajouter
            </button>
          </form>
        </div>
      </div>

      <!-- État de chargement avec animation -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="relative">
          <div class="h-12 w-12 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin" />
          <div class="h-8 w-8 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin absolute top-2 left-2" />
        </div>
      </div>

      <!-- Liste des éléments -->
      <div v-else-if="items.length > 0" class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">Liste des {{ title.toLowerCase() }}</h2>
          <span class="bg-indigo-100 text-indigo-700 text-xs py-1 px-2 rounded-full">{{ items.length }} élément{{ items.length > 1 ? 's' : '' }}</span>
        </div>

        <ul class="divide-y divide-gray-100">
          <li
            v-for="item in items"
            :key="item.id"
            class="p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex justify-between items-center">
              <!-- Mode affichage -->
              <div
                v-if="editItemId !== item.id"
                class="font-medium text-gray-700 flex items-center gap-3"
              >
                <div class="h-2 w-2 rounded-full bg-indigo-500" />
                {{ item.name }}
              </div>

              <!-- Mode édition -->
              <div v-else class="flex-1 max-w-md">
                <div class="flex gap-2 items-center">
                  <input
                    v-model="editName"
                    class="w-full p-2 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                    @keyup.enter="saveEdit"
                  >
                  <button
                    title="Enregistrer"
                    class="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                    @click="saveEdit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    title="Annuler"
                    class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    @click="editItemId = ''"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div v-if="editItemId !== item.id" class="flex gap-2 items-center">
                <!-- Compteur d'utilisation -->
                <span
                  v-if="item.usage_count > 0"
                  class="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full bg-indigo-100 text-indigo-700 mr-1"
                  :title="`Utilisé dans ${item.usage_count} article${item.usage_count > 1 ? 's' : ''}`"
                >
                  {{ item.usage_count }}
                </span>

                <button
                  title="Modifier"
                  class="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                  @click="startEdit(item)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  v-if="item.usage_count === 0"
                  title="Supprimer"
                  class="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  @click="deleteItem(item.id, item.name)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <span
                  v-else
                  :title="`Impossible de supprimer - Utilisé dans ${item.usage_count} article${item.usage_count > 1 ? 's' : ''}`"
                  class="p-2 rounded-lg text-gray-300 cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- Message d'absence d'éléments -->
      <div v-else class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <div class="text-5xl mb-4 text-indigo-200">
          {{ props.table === 'categories' ? '📂' : '🏷️' }}
        </div>
        <p class="text-xl font-medium text-gray-700">Aucun élément pour le moment</p>
        <p class="text-gray-500 mt-2">Ajoutez votre premier élément à l'aide du formulaire ci-dessus</p>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
      <!-- Overlay avec flou -->
      <div
        class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        @click="cancelDelete"
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
                Êtes-vous sûr de vouloir supprimer {{ props.title.slice(0, -1).toLowerCase() }} <span class="font-medium">"{{ itemToDeleteName }}"</span> ?
              </p>
              <p class="text-gray-500">
                Cette action est irréversible.
              </p>
            </div>

            <div class="flex justify-between">
              <button
                class="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                @click="cancelDelete"
              >
                Annuler
              </button>
              <button
                class="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                @click="confirmDelete"
              >
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
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

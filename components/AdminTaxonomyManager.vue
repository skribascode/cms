<script setup lang='ts'>
const props = defineProps<{
  title: string
  table: 'categories' | 'tags'
}>()

const supabase = useSupabaseClient()

const items = ref<{ id: string; name: string }[]>([])
const newName = ref('')
const editItemId = ref('')
const editName = ref('')
const loading = ref(true)

const fetchItems = async () => {
  loading.value = true
  console.log('Récupération des éléments de la table:', props.table)
  const { data, error } = await supabase.from(props.table).select().order('name')

  if (error) {
    console.error('Erreur de récupération des éléments:', error)
    loading.value = false
    return
  }

  items.value = data || []
  loading.value = false
}

const createItem = async () => {
  if (!newName.value.trim()) return

  const { error } = await supabase.from(props.table).insert({ name: newName.value })

  if (error) {
    console.error('Erreur de création de l\'élément:', error)
    return
  }

  newName.value = ''
  await fetchItems()
}

const deleteItem = async (id: string) => {
  if (!confirm('Supprimer ?')) return

  await supabase.from(props.table).delete().eq('id', id)
  await fetchItems()
}

const startEdit = (item: { id: string; name: string }) => {
  editItemId.value = item.id
  editName.value = item.name
}

const saveEdit = async () => {
  if (!editItemId.value || !editName.value.trim()) return

  await supabase.from(props.table).update({ name: editName.value }).eq('id', editItemId.value)
  editItemId.value = ''
  editName.value = ''
  await fetchItems()
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
          <form @submit.prevent="createItem" class="flex flex-col sm:flex-row gap-3">
            <input
              v-model="newName"
              placeholder="Nom"
              class="flex-1 p-3 bg-gray-50 border-0 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
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
          <div class="h-12 w-12 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin"></div>
          <div class="h-8 w-8 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin absolute top-2 left-2"></div>
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
                <div class="h-2 w-2 rounded-full bg-indigo-500"></div>
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
                    class="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                    @click="saveEdit"
                    title="Enregistrer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    @click="editItemId = ''"
                    title="Annuler"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div v-if="editItemId !== item.id" class="flex gap-2">
                <button
                  class="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                  @click="startEdit(item)"
                  title="Modifier"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  class="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  @click="deleteItem(item.id)"
                  title="Supprimer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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
  </div>
</template>

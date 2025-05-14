<script setup lang='ts'>
import type { Posts } from '@/types/post'

definePageMeta({
  layout: 'admin'
})

useAdminGuard()

const posts = ref<Posts[]>([])
const loading = ref(true)

const fetchPosts = async () => {
  try {
    const res = await $fetch<Posts[]>('/api/posts')
    posts.value = res
  } catch (error) {
    console.error('Erreur lors du chargement des posts', error)
  } finally {
    loading.value = false
  }
}

const deletePost = async (id: string) => {
  if (!confirm('Supprimer cet article ?')) return

  try {
    const { error } = await useFetch(`/api/posts/${id}`, {
      method: 'DELETE'
    })

    if (error.value) {
      console.error(error.value.message)
      return
    }

    await fetchPosts()
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'article', err)
  }
}


onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="bg-gray-50 min-h-screen p-6 lg:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- En-tête moderne avec recherche -->
      <div class="bg-white rounded-2xl shadow-sm p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Articles</h1>
          <p class="text-gray-500 text-sm mt-1">Gérez votre contenu en quelques clics</p>
        </div>

        <div class="flex gap-3 items-center">
          <div class="relative">
            <input
              type="text"
              placeholder="Rechercher..."
              class="pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-sm text-gray-800 w-full md:w-64 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <NuxtLink
            to="/admin/create"
            class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-5 rounded-xl font-medium flex items-center gap-2 shadow-sm hover:shadow-indigo-200 transition-all hover:translate-y-[-1px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Créer
          </NuxtLink>
        </div>
      </div>

      <!-- État de chargement avec animation -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="relative">
          <div class="h-16 w-16 rounded-full border-t-2 border-b-2 border-indigo-500 animate-spin"/>
          <div class="h-12 w-12 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin absolute top-2 left-2"/>
        </div>
      </div>

      <!-- Message d'absence d'articles -->
      <div v-else-if="posts.length === 0" class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <img src="https://illustrations.popsy.co/amber/digital-nomad.svg" alt="No content" class="w-48 h-48 mx-auto mb-6" >
        <p class="text-xl font-medium text-gray-700">Aucun article pour le moment</p>
        <p class="text-gray-500 mt-2 mb-6">Commencez à créer du contenu pour votre site</p>
        <NuxtLink to="/admin/create" class="inline-flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-5 rounded-xl font-medium gap-2 shadow-sm hover:shadow-md transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Créer votre premier article
        </NuxtLink>
      </div>

      <!-- Liste des articles -->
      <div v-else class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="post in posts"
          :key="post.id"
          :to="`/admin/edit/${post.id}`"
          class="bg-white rounded-2xl overflow-hidden border-0 shadow-sm hover:shadow-md transition-all group block cursor-pointer"
        >
          <!-- Image de couverture -->
          <div class="h-48 relative overflow-hidden">
            <!-- Image réelle si disponible -->
            <div v-if="post.cover_url" class="absolute inset-0">
              <img :src="post.cover_url" alt="Couverture" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" >
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
            </div>

            <!-- Fallback avec gradient moderne si pas d'image -->
            <div v-else class="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 opacity-10">
              <div class="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <!-- Badge de statut avec design amélioré -->
            <div class="absolute top-4 right-4 flex items-center">
              <span
                :class="[
                  'text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-md shadow-sm',
                 post.status === 'published'
                    ? 'bg-green-500/90 text-white'
                    : 'bg-amber-500/90 text-white'
                ]"
              >
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-white"/>
                  {{ post.status === 'published' ? 'Publié' : 'Brouillon' }}
                </div>
              </span>
            </div>
          </div>

          <!-- Contenu de l'article -->
          <div class="p-5">
            <h2 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {{ post.title }}
            </h2>
            <p class="text-gray-500 text-sm line-clamp-2 mb-3">{{ post.summary }}</p>

            <!-- Catégorie et tags -->
            <div class="mb-4">
              <!-- Catégorie -->
              <div class="flex items-center mb-2" v-if="post.category">
                <span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {{ post.category.name }}
                </span>
              </div>

              <!-- Tags -->
              <div class="flex flex-wrap gap-1" v-if="post.tags && post.tags.length">
                <span
                  v-for="tag in post.tags"
                  :key="tag.id"
                  class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md"
                >
                  #{{ tag.name }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <p class="text-xs text-gray-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </p>

              <div class="flex gap-2">
                <button
                  class="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors z-10"
                  title="Modifier"
                  @click.prevent
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  class="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors z-10"
                  title="Supprimer"
                  @click.prevent="deletePost(post.id)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

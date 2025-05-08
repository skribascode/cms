<script setup lang='ts'>
const supabase = useSupabaseClient()

const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    alert('Erreur de déconnexion')
    return
  }

  useRouter().push('/login')
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <!-- Sidebar moderne avec dégradé -->
    <aside class="w-72 bg-gradient-to-b from-gray-800 to-gray-900 text-white p-6 relative overflow-hidden">
      <!-- Forme décorative en arrière-plan -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl"/>

      <!-- En-tête avec logo stylisé -->
      <div class="relative mb-8">
        <h1 class="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          SkribPress
        </h1>
        <div class="h-1 w-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2"/>
      </div>

      <!-- Navigation avec icônes -->
      <nav class="space-y-2 relative">
        <NuxtLink
          to="/admin"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
          :class="useRoute().path === '/admin'
            ? 'bg-gradient-to-r from-indigo-600/80 to-indigo-700/80 text-white shadow-lg shadow-indigo-900/30'
            : 'text-gray-300 hover:bg-gray-700/50'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span>Articles</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/categories"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
          :class="useRoute().path === '/admin/categories'
            ? 'bg-gradient-to-r from-indigo-600/80 to-indigo-700/80 text-white shadow-lg shadow-indigo-900/30'
            : 'text-gray-300 hover:bg-gray-700/50'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>Catégories</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/tags"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
          :class="useRoute().path === '/admin/tags'
            ? 'bg-gradient-to-r from-indigo-600/80 to-indigo-700/80 text-white shadow-lg shadow-indigo-900/30'
            : 'text-gray-300 hover:bg-gray-700/50'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>Tags</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/media"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
          :class="useRoute().path.startsWith('/admin/media')
            ? 'bg-gradient-to-r from-indigo-600/80 to-indigo-700/80 text-white shadow-lg shadow-indigo-900/30'
            : 'text-gray-300 hover:bg-gray-700/50'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Médiathèque</span>
        </NuxtLink>
      </nav>

      <!-- Séparateur -->
      <div class="my-8 border-t border-gray-700/50"/>

      <!-- Bouton de déconnexion -->
      <button
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              text-gray-300 hover:bg-red-500/20 hover:text-red-300"
        @click="logout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Se déconnecter</span>
      </button>
    </aside>

    <!-- Contenu principal -->
    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>

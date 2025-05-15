<script setup lang="ts">
const supabase = useSupabaseClient()
const posts = ref<any[]>([])

async function getPosts() {
  const { data } = await supabase.from('posts').select()
  posts.value = data || []
}

onMounted(() => {
  getPosts()
})
</script>

<template>
  <ul v-if="posts.length" class="flex flex-col gap-4">
    <li v-for="post in posts" :key="post.id" class="flex flex-col gap-4 shadow rounded-2xl mx-auto p-4 bg-white">
      <div class="flex items-center gap-2">
        <img :src="post.cover_url" alt="Image de l'article" class="w-16 h-16 rounded-full">
        <div>
          <h2 class="text-lg font-bold">{{ post.title }}</h2>
          <p class="text-sm text-gray-500">{{ post.created_at }}</p>
        </div>
      </div>
      <h3>{{ post.title }}</h3>
      <DragonEditorViewer :content="post.content" />
    </li>
  </ul>
  <p v-else>No articles found.</p>
</template>

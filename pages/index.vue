<script setup lang="ts">
const supabase = useSupabaseClient()
const posts = ref([])

async function getPosts() {
  const { data } = await supabase.from('articles').select()
  posts.value = data
}

onMounted(() => {
  getPosts()
})
</script>

<template>
  <ul v-if="posts.length">
    <li v-for="post in posts" :key="post.id">{{ post.title }}</li>
  </ul>
  <p v-else>No articles found.</p>
</template>

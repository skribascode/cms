<script setup lang="ts">
const supabase = useSupabaseClient()
const articles = ref([])

async function getTodos() {
  const { data } = await supabase.from('articles').select()
  articles.value = data
}

onMounted(() => {
  getTodos()
})
</script>

<template>
  <ul v-if="articles.length">
    <li v-for="article in articles" :key="article.id">{{ article.name }}</li>
  </ul>
  <p v-else>No articles found.</p>
</template>

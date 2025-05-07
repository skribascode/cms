<script setup lang='ts'>
definePageMeta({
  layout: 'admin'
})

useAdminGuard()
</script>

<template>
  <AdminTaxonomyManager title='Catégories' table='categories' />
</template>

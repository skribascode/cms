<script setup lang='ts'>
definePageMeta({
  layout: 'admin'
})

useAdminGuard()
</script>

<template>
  <AdminTaxonomyManager title='Tags' table='tags' />
</template>

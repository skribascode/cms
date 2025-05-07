<script setup lang='ts'>
const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')

const login = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    alert('Erreur de connexion')
    return
  }

  useRouter().push('/admin')
}
</script>

<template>
  <div class='min-h-screen flex items-center justify-center bg-gray-100'>
    <div class='bg-white p-6 rounded shadow w-full max-w-sm space-y-4'>
      <h1 class='text-xl font-bold'>Connexion Admin</h1>

      <input
        v-model='email'
        type='email'
        placeholder='Email'
        class='w-full p-2 border rounded'
      >

      <input
        v-model='password'
        type='password'
        placeholder='Mot de passe'
        class='w-full p-2 border rounded'
      >

      <button class='w-full bg-blue-600 text-white py-2 rounded' @click='login'>
        Se connecter
      </button>
    </div>
  </div>
</template>

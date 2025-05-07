export const useAdminGuard = () => {
  const user = useSupabaseUser()

  watchEffect(() => {
    if (!user.value) return

    const role = user.value.user_metadata?.role

    if (role !== 'admin') {
      useRouter().push('/login')
    }
  })
}

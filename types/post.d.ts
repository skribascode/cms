export type Post = {
  id?: string,
  created_at?: string,
  title: string,
  summary: string,
  content: string,
  cover_url: string | null,
  category_id: string | null,
  status: 'draft' | 'published',
}

export type Posts = Post[]



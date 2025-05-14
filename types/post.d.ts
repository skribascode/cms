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

export type Category = {
  id: string;
  name: string;
};

export type Tag = {
  id: string;
  name: string;
};

export type PostWithRelations = Post & {
  categories: Category | null;
  posts_tags: { tags: Tag }[] | { tags: Tag } | null;
  category: Category | null;
  tags: Tag[];
};

export type FormattedPost = Post & {
  category: Category | null;
  tags: Tag[];
};



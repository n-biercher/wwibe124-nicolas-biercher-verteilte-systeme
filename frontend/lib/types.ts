export type ApiCommunity = {
  id: number
  slug: string
  name: string
  description: string
  visibility: "public" | "restricted"
  icon_url: string | null
  banner_url: string | null
  created_by: number
  created_at: string
  members_count: number
  posts_count: number
  my_role: "owner" | "moderator" | "member" | "pending" | null
}

export type CommunityCardProps = {
  slug: string
  name: string
  description: string
  visibility: "public" | "restricted" | string
  membersCount: number
  postsCount: number
  myRole: "owner" | "moderator" | "member" | null | undefined
  iconUrl?: string | null
  bannerUrl?: string | null
  createdAt?: string | null
}


export type PostImage = {
  id: number
  image_url: string
  position: number
}

export type Post = {
  id: number
  community_slug: string
  title: string
  body: string
  image_url: string | null
  images: PostImage[]
  score: number
  my_vote: number
  author_email: string
  author_username: string
  author_image_url?: string | null
  created_at: string
  is_pinned: boolean
  is_locked: boolean
  comment_count: number
}

export type PostComment = {
  id: number
  body: string
  author_username: string
  author_email: string
  created_at: string
}

export type ApiComment = {
  id: number
  body: string
  author_username: string
  author_email: string
  created_at: string
}

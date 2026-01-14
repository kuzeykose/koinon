export interface Community {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  created_at: string;
  created_by: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export interface Member {
  user_id: string;
  role: string;
  profile?: Profile;
}

export interface ReadingActivity {
  id: string;
  user_id: string;
  status: string;
  progress: number;
  capacity: number | null;
  unit: string | null;
  completed: boolean;
  book: {
    book_key: string;
    isbn13?: string | null; // ISBN-13 for source-agnostic identification
    title: string;
    cover: string | null;
    authors: any;
  };
  profile?: Profile;
  updated_at: string;
}

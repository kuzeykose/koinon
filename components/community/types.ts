export interface Community {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
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
  book: {
    title: string;
    cover: string | null;
    authors: any;
  };
  profile?: Profile;
  updated_at: string;
}

export interface AdItem {
  id: string;
  title: string;
  status: string;
  platform: string;
  city: string;
  createdAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
  owner: { id: string; name: string; email: string };
}

export interface CreatorItem {
  id: string;
  title: string;
  fullName: string;
  city: string;
  isPublished: boolean;
  verified: boolean;
  featured: boolean;
  verificationStatus: string;
  verificationRequestedAt: string | null;
  createdAt: string;
  publishedAt: string | null;
  user: { id: string; name: string; email: string };
}

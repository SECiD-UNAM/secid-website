export interface AlumniSpotlight {
  id: string;
  memberUid?: string;
  name: string;
  title: string;
  company: string;
  graduationYear: number;
  story: string; // HTML content
  excerpt: string;
  featuredImage?: string;
  tags: string[];
  publishedAt: Date;
  featured: boolean;
  status: 'draft' | 'published';
}

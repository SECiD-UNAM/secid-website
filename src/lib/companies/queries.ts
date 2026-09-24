/**
 * Company read operations: list, lookup by ID/domain, pending review.
 */

import { db } from '../firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import type { Company } from '@/types/company';

const COLLECTION = 'companies';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapCompanyDoc(id: string, data: Record<string, unknown>): Company {
  const name = (data.name as string) || '';
  return {
    id,
    name,
    domain: (data.domain as string) || '',
    slug: (data.slug as string) || slugify(name),
    logoUrl: (data.logoUrl as string) || undefined,
    industry: (data.industry as string) || undefined,
    location: (data.location as string) || undefined,
    website: (data.website as string) || undefined,
    description: (data.description as string) || undefined,
    memberCount: (data.memberCount as number) || 0,
    createdBy: (data.createdBy as string) || '',
    createdAt:
      (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt:
      (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    pendingReview: (data.pendingReview as boolean) ?? false,
    lastReviewedBy: (data.lastReviewedBy as string) || undefined,
    lastReviewedAt:
      (data.lastReviewedAt as { toDate?: () => Date })?.toDate?.() || undefined,
  };
}

export async function getCompanies(): Promise<Company[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => mapCompanyDoc(d.id, d.data()));
}

export async function getCompaniesWithMembers(): Promise<Company[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('memberCount', '>', 0))
  );
  return snapshot.docs
    .map((d) => mapCompanyDoc(d.id, d.data()))
    .sort((a, b) => b.memberCount - a.memberCount);
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, companyId));
  if (!docSnap.exists()) return null;
  return mapCompanyDoc(docSnap.id, docSnap.data());
}

export async function getCompanyByDomain(
  domain: string
): Promise<Company | null> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('domain', '==', domain))
  );
  if (snapshot.empty) return null;
  const d = snapshot.docs[0]!;
  return mapCompanyDoc(d.id, d.data());
}

export async function getPendingReviewCompanies(): Promise<Company[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('pendingReview', '==', true))
  );
  return snapshot.docs.map((d) => mapCompanyDoc(d.id, d.data()));
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('slug', '==', slug))
  );
  if (!snapshot.empty) {
    const d = snapshot.docs[0]!;
    return mapCompanyDoc(d.id, d.data());
  }
  // Fallback: compute slug from name for companies without stored slug
  const allSnapshot = await getDocs(collection(db, COLLECTION));
  for (const d of allSnapshot.docs) {
    const company = mapCompanyDoc(d.id, d.data());
    if (company.slug === slug) return company;
  }
  return null;
}

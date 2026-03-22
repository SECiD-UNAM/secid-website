/**
 * Company write operations: create, update, delete, logo upload, review.
 */

import { db, storage } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { CompanyCreateInput, CompanyUpdateInput } from '@/types/company';

const COLLECTION = 'companies';

export async function createCompany(
  input: CompanyCreateInput,
  createdBy: string
): Promise<string> {
  const docRef = doc(collection(db, COLLECTION));
  await setDoc(docRef, {
    ...input,
    memberCount: 0,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    pendingReview: true,
  });
  return docRef.id;
}

export async function updateCompany(
  companyId: string,
  input: CompanyUpdateInput
): Promise<void> {
  // Filter out undefined values — Firestore rejects them
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  await updateDoc(doc(db, COLLECTION, companyId), {
    ...cleaned,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCompany(companyId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, companyId));
}

export async function uploadCompanyLogo(
  companyId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const logoRef = ref(storage, `companies/${companyId}/logo.${ext}`);
  await uploadBytes(logoRef, file, { contentType: file.type });
  return getDownloadURL(logoRef);
}

export async function approveCompany(
  companyId: string,
  reviewerUid: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, companyId), {
    pendingReview: false,
    lastReviewedBy: reviewerUid,
    lastReviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectCompany(companyId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, companyId));
}

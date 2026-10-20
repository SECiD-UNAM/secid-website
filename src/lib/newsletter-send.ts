/**
 * Client for sending a newsletter issue to the confirmed subscribers (F21).
 *
 * Wraps the `sendNewsletterIssue` callable (functions/src/newsletter-send.ts).
 * `dryRun` returns the subscriber count only; `force` re-sends an issue
 * that already has a send receipt.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface SendNewsletterIssueInput {
  issueId: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface SendNewsletterIssueResult {
  recipientCount: number;
}

export async function sendNewsletterIssue(
  input: SendNewsletterIssueInput
): Promise<SendNewsletterIssueResult> {
  const call = httpsCallable<
    SendNewsletterIssueInput,
    SendNewsletterIssueResult
  >(functions, 'sendNewsletterIssue');
  const { data } = await call(input);
  return data;
}

export function previewNewsletterAudience(
  issueId: string
): Promise<SendNewsletterIssueResult> {
  return sendNewsletterIssue({ issueId, dryRun: true });
}

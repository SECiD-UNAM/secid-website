import { z } from 'zod';

/**
 * Password rules shared by sign-up and password reset: at least 8 characters,
 * one uppercase letter and one digit. Keep both forms on the same schema so a
 * password accepted at reset time is also accepted at sign-up time.
 */
export interface PasswordRuleMessages {
  tooShort: string;
  needsUppercase: string;
  needsNumber: string;
}

export const PASSWORD_MIN_LENGTH = 8;

export const defaultPasswordRuleMessages: PasswordRuleMessages = {
  tooShort: 'Password must be at least 8 characters',
  needsUppercase: 'Password must contain at least one uppercase letter',
  needsNumber: 'Password must contain at least one number',
};

export function passwordSchema(
  messages: PasswordRuleMessages = defaultPasswordRuleMessages
) {
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, messages.tooShort)
    .regex(/[A-Z]/, messages.needsUppercase)
    .regex(/[0-9]/, messages.needsNumber);
}

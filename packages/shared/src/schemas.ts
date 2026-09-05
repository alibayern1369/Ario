import { z } from 'zod';
import { USERNAME_RE } from './constants';

export const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(USERNAME_RE, 'نام کاربری فقط حروف انگلیسی کوچک، عدد و _ است');

export const displayNameSchema = z.string().trim().min(1).max(48);
export const bioSchema = z.string().max(280);
export const passwordSchema = z.string().min(8).max(128);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  inviteToken: z.string().min(8).optional(),
});

export const messageTextSchema = z.string().trim().min(1).max(8000);
export const conversationTitleSchema = z.string().trim().min(1).max(80);

export const visibilitySchema = z.enum(['everyone', 'contacts', 'nobody']);

export const privacySchema = z.object({
  lastSeen: visibilitySchema,
  online: visibilitySchema,
  profilePhoto: visibilitySchema,
  calls: visibilitySchema,
  groupInvites: visibilitySchema,
  readReceipts: z.boolean(),
});

export const landingContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  ctaLabel: z.string(),
  contactEmail: z.string(),
  contactText: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PrivacyInput = z.infer<typeof privacySchema>;

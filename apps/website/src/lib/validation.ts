import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(5, 'Email must be at least 5 characters')
  .max(100, 'Email must be at most 100 characters')
  .email('Email must be a valid email');

export const usernameSchema = z
  .string()
  .trim()
  .min(2, 'Username must be at least 2 characters')
  .max(200, 'Username must be at most 200 characters');

export const passwordSchema = z
  .string()
  .trim()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().trim(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
      });
    }
  });

export const editProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
  })
  .superRefine((values, ctx) => {
    const hasUsername = Boolean(values.username?.trim());
    const hasEmail = Boolean(values.email?.trim());
    if (!hasUsername && !hasEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field is required.',
        path: ['username'],
      });
    }
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type EditProfileValues = z.infer<typeof editProfileSchema>;

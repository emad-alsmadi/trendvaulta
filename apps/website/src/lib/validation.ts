import { z } from 'zod';

// Messages are translation keys (messages/*.json); forms show them with t().

export const emailSchema = z
  .string()
  .trim()
  .min(5, 'auth.validation.emailMin')
  .max(100, 'auth.validation.emailMax')
  .email('auth.validation.emailInvalid');

export const usernameSchema = z
  .string()
  .trim()
  .min(2, 'auth.validation.usernameMin')
  .max(200, 'auth.validation.usernameMax');

export const passwordSchema = z
  .string()
  .trim()
  .min(8, 'security.validation.minLength')
  .max(100, 'auth.validation.passwordMax');

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
        message: 'auth.validation.passwordMismatch',
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
        message: 'auth.validation.atLeastOneField',
        path: ['username'],
      });
    }
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type EditProfileValues = z.infer<typeof editProfileSchema>;

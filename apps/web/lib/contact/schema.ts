import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address."),
  subject: z
    .string()
    .trim()
    .max(200, "Subject is too long.")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(5000, "Message is too long."),
  _gotcha: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export function parseContactForm(body: unknown):
  | { ok: true; data: ContactFormValues }
  | { ok: false; error: string } {
  const result = contactFormSchema.safeParse(body);
  if (!result.success) {
    const first = result.error.errors[0];
    return { ok: false, error: first?.message ?? "Invalid form data." };
  }
  if (result.data._gotcha) {
    return { ok: false, error: "Invalid submission." };
  }
  return { ok: true, data: result.data };
}

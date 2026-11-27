/**
 * Contact form rules, shared by the form (instant feedback) and the Server Action (the real
 * check). Keep in sync with the CHECK constraints in supabase/messages.sql.
 */
export const LIMITS = {
  name: 100,
  email: 254,
  messageMin: 10,
  message: 5000,
  links: 3,
  /** A real person takes longer than this to fill in the form (ms). */
  minFillMs: 3000,
} as const;

/** The honeypot field's name: deliberately not a word browsers autofill (like "company"). */
export const TRAP_FIELD = "hp_x7";

export type ContactFields = { name: string; email: string; message: string };
export type FieldErrors = Partial<Record<keyof ContactFields, string>>;

export type ContactState =
  | { status: "idle" }
  | { status: "error"; fieldErrors?: FieldErrors; message?: string; values?: ContactFields }
  | { status: "sent"; name: string; email: string };

/** Length in characters as Postgres counts them (code points), so an emoji counts once. */
export const charLength = (s: string) => [...s].length;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LINK_RE = /(https?:\/\/|www\.)/gi;

export function readFields(form: FormData): ContactFields {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  return { name: get("name").trim(), email: get("email").trim(), message: get("message").trim() };
}

export function validate({ name, email, message }: ContactFields): FieldErrors {
  const e: FieldErrors = {};
  if (!name) e.name = "Please enter your name.";
  else if (charLength(name) > LIMITS.name) e.name = `Please keep your name under ${LIMITS.name} characters.`;

  if (!email) e.email = "Please enter your email address.";
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email))
    e.email = "Please enter a valid email address, like name@example.com.";

  if (!message) e.message = "Please write a message.";
  else if (charLength(message) < LIMITS.messageMin)
    e.message = `Please write at least ${LIMITS.messageMin} characters.`;
  else if (charLength(message) > LIMITS.message)
    e.message = `Please keep your message under ${LIMITS.message} characters.`;
  else if ((message.match(LINK_RE) ?? []).length > LIMITS.links)
    e.message = `Please include at most ${LIMITS.links} links.`;
  return e;
}

"use client";

import { sendMessage } from "@/app/actions/contact";
import {
  LIMITS,
  TRAP_FIELD,
  charLength,
  validate,
  type ContactFields,
  type ContactState,
  type FieldErrors,
} from "@/lib/contact";
import { useActionState, useEffect, useRef, useState } from "react";
import { SendIcon } from "./icons";

const EMPTY: ContactFields = { name: "", email: "", message: "" };
const ORDER: (keyof ContactFields)[] = ["name", "email", "message"];

const field =
  "mt-2 block w-full rounded-xl border bg-ink/70 px-4 py-3 text-base text-fg transition-colors placeholder:text-muted/70 focus:border-violet-soft";
const label = "block text-base font-medium text-fg";
const errorText = "mt-2 text-base text-rose-300";

/**
 * Contact form (Step 6b). Checks fields as you send (same rules as the server), then a Server
 * Action saves the message to Supabase. Spam: a hidden honeypot field and the time the form
 * appeared go along with each send; the server and database do the rest.
 */
export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendMessage, { status: "idle" });
  const [values, setValues] = useState<ContactFields>(EMPTY);
  // Per-field errors, from the client check or the server reply; each clears as its field is edited.
  const [errors, setErrors] = useState<FieldErrors>({});
  // The "sent" result the visitor has dismissed with "Send another" (shows the form again).
  const [dismissed, setDismissed] = useState<ContactState | null>(null);
  // When the form appeared (written into the hidden "started" field on send).
  const startedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const sentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // A new server reply: keep what was typed on errors, clear it on success. (Adjusting state
  // while rendering, React's pattern for responding to a changed value without an effect.)
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "sent") setValues(EMPTY);
    else if (state.status === "error") {
      if (state.values) setValues(state.values);
      setErrors(state.fieldErrors ?? {});
    }
  }

  // ...and move focus to the first problem, or to the confirmation.
  useEffect(() => {
    if (state.status === "sent") sentRef.current?.focus();
    else if (state.status === "error") {
      const first = ORDER.find((k) => state.fieldErrors?.[k]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name=${first}]`)?.focus();
    }
  }, [state]);

  // After "Send another message", put the cursor in Name (the button that had focus is gone).
  useEffect(() => {
    if (dismissed) formRef.current?.querySelector<HTMLElement>("[name=name]")?.focus();
  }, [dismissed]);

  const showSent = state.status === "sent" && dismissed !== state;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const found = validate({
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
    });
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      e.preventDefault(); // the action doesn't run
      e.currentTarget.querySelector<HTMLElement>(`[name=${first}]`)?.focus();
      return;
    }
    const startedField = e.currentTarget.elements.namedItem("started");
    if (startedField instanceof HTMLInputElement) startedField.value = String(startedAt.current);
  };

  const onChange =
    (k: keyof ContactFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [k]: e.target.value }));
      if (errors[k])
        setErrors((prev) => {
          const next = { ...prev };
          delete next[k];
          return next;
        });
    };

  if (showSent && state.status === "sent")
    return (
      <div
        ref={sentRef}
        tabIndex={-1}
        data-contact-sent
        role="status"
        className="rounded-2xl border border-violet/40 bg-panel/70 p-6 outline-none md:p-7"
      >
        <p className="font-display text-2xl font-semibold text-fg">Message sent</p>
        <p className="mt-2 text-base text-muted">
          Thanks, {state.name}! I&apos;ll reply to <span className="text-fg">{state.email}</span>.
        </p>
        <button
          type="button"
          onClick={() => {
            setDismissed(state);
            setErrors({});
            startedAt.current = Date.now();
          }}
          className="mt-5 inline-flex min-h-11 items-center rounded-full border border-line px-5 font-medium text-fg transition-colors hover:border-violet-soft hover:text-violet-soft"
        >
          Send another message
        </button>
      </div>
    );

  const described = (k: keyof ContactFields) => (errors[k] ? `contact-${k}-error` : undefined);
  const formError = state.status === "error" && !state.fieldErrors ? state.message : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      data-contact-form
      aria-labelledby="contact-form-heading"
      className="relative rounded-2xl border border-violet/40 bg-panel/70 p-6 md:p-7"
    >
      <h3 id="contact-form-heading" className="font-display text-xl font-semibold text-fg">
        Or send a message
      </h3>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={label}>
            Your name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={LIMITS.name}
            value={values.name}
            onChange={onChange("name")}
            readOnly={pending}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={described("name")}
            className={`${field} ${errors.name ? "border-rose-300" : "border-line"}`}
          />
          {errors.name && (
            <p id="contact-name-error" className={errorText}>
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="contact-email" className={label}>
            Your email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={LIMITS.email}
            value={values.email}
            onChange={onChange("email")}
            readOnly={pending}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={described("email")}
            className={`${field} ${errors.email ? "border-rose-300" : "border-line"}`}
          />
          {errors.email && (
            <p id="contact-email-error" className={errorText}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className={label}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          maxLength={LIMITS.message}
          value={values.message}
          onChange={onChange("message")}
          readOnly={pending}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={described("message")}
          className={`${field} resize-y ${errors.message ? "border-rose-300" : "border-line"}`}
        />
        {errors.message && (
          <p id="contact-message-error" className={errorText}>
            {errors.message}
          </p>
        )}
        {charLength(values.message) > LIMITS.message - 500 && (
          <p className="mt-2 text-right text-base text-muted">
            {charLength(values.message)} / {LIMITS.message}
          </p>
        )}
      </div>

      {/* Honeypot: off screen and skipped by keyboards and screen readers; bots fill it in. */}
      {/* Its name and label are words browsers don't autofill, so a real visitor's autofill
          never fills it by accident. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="contact-hp">Leave this field empty</label>
        <input id="contact-hp" name={TRAP_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="started" defaultValue="" />

      {formError && (
        <p role="alert" data-contact-error className="mt-5 text-base text-rose-300">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-violet px-7 font-medium text-white shadow-[0_0_28px_-4px_rgb(109_74_255/0.7)] transition-[background-color,box-shadow] hover:bg-violet-hover disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {pending ? "Sending…" : "Send message"}
        <SendIcon className="size-4" />
      </button>
      <p role="status" className="sr-only">
        {pending ? "Sending your message" : ""}
      </p>
    </form>
  );
}

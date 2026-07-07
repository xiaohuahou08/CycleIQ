"use client";

import { FormEvent, useState } from "react";
import {
  BTN_PRIMARY,
  CARD_BASE,
  MARKETING_INPUT_CLS,
  MARKETING_LABEL_CLS,
  MARKETING_TEXTAREA_CLS,
} from "@/app/components/marketing/styles";
import { useTranslations } from "@/lib/i18n/locale-context";

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const { t } = useTranslations("contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [gotcha, setGotcha] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject: subject || undefined,
          message,
          _gotcha: gotcha,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        setFormState("error");
        setErrorMessage(json.error ?? t("form.error.generic"));
        return;
      }

      setFormState("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setFormState("error");
      setErrorMessage(t("form.error.generic"));
    }
  };

  if (formState === "success") {
    return (
      <div className="mx-auto mt-10 max-w-xl">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-6 py-8 text-center">
          <p className="text-base font-semibold text-emerald-800">{t("form.success.title")}</p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-700/90">
            {t("form.success.body")}
          </p>
          <button
            type="button"
            onClick={() => setFormState("idle")}
            className="mt-6 text-sm font-medium text-emerald-800 underline-offset-2 hover:underline"
          >
            {t("form.success.again")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`mx-auto mt-10 max-w-xl ${CARD_BASE} p-6 sm:p-8`}>
      <div className="space-y-5">
        <div>
          <label htmlFor="contact-name" className={MARKETING_LABEL_CLS}>
            {t("form.name")}
          </label>
          <input
            id="contact-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={MARKETING_INPUT_CLS}
            disabled={formState === "submitting"}
          />
        </div>

        <div>
          <label htmlFor="contact-email" className={MARKETING_LABEL_CLS}>
            {t("form.email")}
          </label>
          <input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={MARKETING_INPUT_CLS}
            disabled={formState === "submitting"}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="contact-subject" className={MARKETING_LABEL_CLS}>
              {t("form.subject")}
            </label>
            <span className="text-sm text-slate-500">{t("form.optional")}</span>
          </div>
          <input
            id="contact-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={MARKETING_INPUT_CLS}
            disabled={formState === "submitting"}
          />
        </div>

        <div>
          <label htmlFor="contact-message" className={MARKETING_LABEL_CLS}>
            {t("form.message")}
          </label>
          <textarea
            id="contact-message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={MARKETING_TEXTAREA_CLS}
            disabled={formState === "submitting"}
          />
        </div>

        <div className="sr-only" aria-hidden="true">
          <label htmlFor="contact-gotcha">{t("gotcha")}</label>
          <input
            id="contact-gotcha"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={gotcha}
            onChange={(e) => setGotcha(e.target.value)}
          />
        </div>
      </div>

      {errorMessage ? (
        <div
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={formState === "submitting"}
        className={`${BTN_PRIMARY} mt-6 w-full`}
      >
        {formState === "submitting" ? t("form.submitting") : t("form.submit")}
      </button>
    </form>
  );
}

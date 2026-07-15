import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { parseContactForm } from "@/lib/contact/schema";

function getContactConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const toEmail = process.env.CONTACT_TO_EMAIL?.trim();
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim();
  if (!apiKey || !toEmail || !fromEmail) {
    console.error("[contact] Missing RESEND_API_KEY, CONTACT_TO_EMAIL, or CONTACT_FROM_EMAIL");
    return null;
  }
  return { apiKey, toEmail, fromEmail };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseContactForm(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Honeypot tripped — pretend success so bots get no signal.
  if (parsed.spam) {
    return NextResponse.json({ ok: true });
  }

  const config = getContactConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Contact form is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const { name, email, subject, message } = parsed.data;
  const emailSubject = subject?.trim()
    ? `[CycleIQ Contact] ${subject.trim()}`
    : `[CycleIQ Contact] Message from ${name}`;

  try {
    const resend = new Resend(config.apiKey);
    const { data, error } = await resend.emails.send({
      from: config.fromEmail,
      to: config.toEmail,
      replyTo: email,
      subject: emailSubject,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        subject?.trim() ? `Subject: ${subject.trim()}` : null,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
        `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
        subject?.trim()
          ? `<p><strong>Subject:</strong> ${escapeHtml(subject.trim())}</p>`
          : "",
        `<p><strong>Message:</strong></p>`,
        `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return NextResponse.json(
        { error: "Unable to send your message. Please try again later." },
        { status: 502 }
      );
    }

    if (!data?.id) {
      console.error("[contact] Resend returned no message id:", data);
      return NextResponse.json(
        { error: "Unable to send your message. Please try again later." },
        { status: 502 }
      );
    }

    console.info("[contact] Sent via Resend:", data.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Unexpected send failure:", err);
    return NextResponse.json(
      { error: "Unable to send your message. Please try again later." },
      { status: 502 }
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

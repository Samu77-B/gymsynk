import { Resend } from "resend";

import { getAppUrl } from "@/lib/stripe";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const fromAddress =
  process.env.RESEND_FROM_ADDRESS?.trim() ||
  "GymSynk <hello@gymsynk.net>";

function escapeHtmlPlainText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeResendError(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const anyErr = error as { message?: string; name?: string };
    return anyErr.message || anyErr.name || "Email error";
  }

  return String(error);
}

function emailButton(href: string, label: string, accent: string) {
  return `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:${accent};color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">${label}</a></p>`;
}

export type MemberWelcomeEmailParams = {
  to: string;
  memberName: string;
  gymName: string;
  tenantSlug: string;
  primaryColor?: string | null;
};

export async function sendMemberWelcomeEmail(
  params: MemberWelcomeEmailParams,
): Promise<{ error?: string }> {
  if (!resend) {
    return { error: "Resend not configured (RESEND_API_KEY missing)" };
  }

  const appUrl = getAppUrl().replace(/\/$/, "");
  const loginUrl = `${appUrl}/login?tenant=${encodeURIComponent(params.tenantSlug)}`;
  const accent = params.primaryColor?.trim() || "#111111";

  const html = `
    <p>Hi ${escapeHtmlPlainText(params.memberName)},</p>
    <p>Welcome to <strong>${escapeHtmlPlainText(params.gymName)}</strong> — your member account is ready on GymSynk.</p>
    <p>Sign in with this email address to book classes, view your membership, and use your digital access pass where your gym has it enabled.</p>
    ${emailButton(loginUrl, "Open member login", accent)}
    <p style="color:#666;font-size:14px;">Use gym slug <strong>${escapeHtmlPlainText(params.tenantSlug)}</strong> if prompted. If you have not set a password yet, leave the password field blank or contact the gym team.</p>
    <p style="color:#666;font-size:14px;">Questions? Reply to this email or contact your gym directly.</p>
  `;

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [params.to],
    subject: `Welcome to ${params.gymName}`,
    html,
  });

  const normalized = normalizeResendError(error);
  if (normalized) {
    return { error: normalized };
  }

  if (!data?.id) {
    return { error: "Email provider did not accept the message." };
  }

  return {};
}

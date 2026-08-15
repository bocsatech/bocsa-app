/** Gmail SMTP (vagy más) — file (~/.bymy|~/.autosweb/smtp.json) vagy env (Vercel). */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import nodemailer from "nodemailer";

const EXAMPLE = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "te@gmail.com",
  pass: "xxxx xxxx xxxx xxxx",
  from: "Bymy <te@gmail.com>",
};

function homeCandidates() {
  const fromEnv = process.env.BYMY_DATA_DIR || process.env.AUTOSWEB_DATA_DIR;
  if (fromEnv) return [fromEnv];
  return [join(homedir(), ".bymy"), join(homedir(), ".autosweb")];
}

export function smtpConfigPath() {
  if (process.env.BYMY_SMTP_PATH) return process.env.BYMY_SMTP_PATH;
  if (process.env.AUTOSWEB_SMTP_PATH) return process.env.AUTOSWEB_SMTP_PATH;
  for (const dir of homeCandidates()) {
    const p = join(dir, "smtp.json");
    if (existsSync(p)) return p;
  }
  return join(homeCandidates()[0], "smtp.json");
}

export function ensureSmtpExample() {
  const dir = homeCandidates()[0];
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const examplePath = join(dir, "smtp.example.json");
  if (!existsSync(examplePath)) {
    writeFileSync(examplePath, JSON.stringify(EXAMPLE, null, 2) + "\n", "utf8");
  }
  return examplePath;
}

function loadSmtpFromEnv() {
  const user = String(process.env.SMTP_USER || process.env.BYMY_SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || process.env.BYMY_SMTP_PASS || "").replace(/\s+/g, "");
  if (!user || !pass) return null;
  const fromRaw = String(process.env.SMTP_FROM || process.env.BYMY_SMTP_FROM || user).trim();
  return {
    host: String(process.env.SMTP_HOST || process.env.BYMY_SMTP_HOST || "smtp.gmail.com").trim(),
    port: Number(process.env.SMTP_PORT || process.env.BYMY_SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    user,
    pass,
    from: fromRaw.includes("<") ? fromRaw : `Bymy <${fromRaw}>`,
  };
}

function loadSmtpFromFile() {
  const path = smtpConfigPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    if (!raw?.user || !raw?.pass) return null;
    return {
      host: raw.host || "smtp.gmail.com",
      port: Number(raw.port ?? 587),
      secure: Boolean(raw.secure),
      user: String(raw.user).trim(),
      pass: String(raw.pass).replace(/\s+/g, ""),
      from: String(raw.from || raw.user).trim(),
    };
  } catch {
    return null;
  }
}

export function loadSmtpConfig() {
  return loadSmtpFromEnv() || loadSmtpFromFile();
}

export function isSmtpConfigured() {
  return Boolean(loadSmtpConfig());
}

export async function sendMail({ to, subject, text, html }) {
  const cfg = loadSmtpConfig();
  if (!cfg) {
    const err = new Error(
      `Nincs SMTP beállítás. Vercel: SMTP_USER + SMTP_PASS env, vagy smtp.json (Gmail app jelszó) a ${smtpConfigPath()} helyen.`
    );
    err.code = "SMTP_NOT_CONFIGURED";
    throw err;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const info = await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });
  return { messageId: info.messageId, from: cfg.user };
}

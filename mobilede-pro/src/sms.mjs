import { formatMessage } from './parse.mjs';
import { isAllowedMobile, normalizePhone } from './phone.mjs';

async function sendTwilioMessage(sms, to, body) {
  if (!sms.accountSid || !sms.authToken || !sms.fromNumber) {
    throw new Error('Twilio nincs beállítva (SID, Token, feladó szám)');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sms.accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: sms.fromNumber,
    Body: body,
  });

  const auth = Buffer.from(`${sms.accountSid}:${sms.authToken}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Twilio HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    to,
    body,
    sid: data.sid || null,
  };
}

export async function sendSms(config, ad, template) {
  const sms = config.sms || {};
  const body = formatMessage(template, ad);
  const to = ad.phone;

  if (!to) {
    throw new Error('Nincs céltelefonszám');
  }

  if (sms.dryRun || !sms.accountSid || !sms.authToken || !sms.fromNumber) {
    return {
      dryRun: true,
      to,
      body,
      sid: null,
    };
  }

  const result = await sendTwilioMessage(sms, to, body);
  return {
    dryRun: false,
    ...result,
  };
}

export async function sendTestSms(config, { to, message }) {
  const sms = config.sms || {};
  const prefixes = config.allowedPrefixes || ['15', '16', '17'];
  const normalized = normalizePhone(to);

  if (!normalized || !isAllowedMobile(normalized, prefixes)) {
    throw new Error('Csak +49 15 / 16 / 17 mobil számra küldhető teszt SMS');
  }

  const body =
    String(message || '').trim() ||
    'Mobile.de Pro Test-SMS — Twilio funktioniert.';

  const result = await sendTwilioMessage(sms, normalized, body);
  return {
    dryRun: false,
    ...result,
  };
}

import { formatMessage } from './parse.mjs';

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
    throw new Error(`Twilio HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    dryRun: false,
    to,
    body,
    sid: data.sid || null,
  };
}

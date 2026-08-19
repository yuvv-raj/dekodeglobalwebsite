const VISUAL_INTENT_PATTERNS = [
  ['calendar', /\b(calendar|meeting|schedule|booking|book a call|availability|available time|date|time slot|discovery call)\b/i],
  ['journey', /\b(art|artist|artwork|gallery|portfolio|donat(?:e|ion|ions)|fundrais(?:e|ing)|membership|subscription)\b/i],
  ['ecommerce', /\b(e-?commerce|shop|store|cart|checkout|retail|marketplace|payment)\b/i],
  ['mobile', /\b(mobile|phone|ios|android|tablet|app store|play store)\b/i],
  ['cloud', /\b(cloud|server|database|infrastructure|api|integration|security|authentication|hosting|aws|azure|gcp)\b/i],
  ['ai', /\b(ai|artificial intelligence|agent|automation|model|llm|chatbot|copilot|predictive|analytics|machine learning)\b/i],
  ['web', /\b(web|website|browser|desktop|portal|dashboard|saas)\b/i],
];

const VISUAL_FEATURES = [
  ['Gallery', /\b(art|artist|artwork|gallery|portfolio|showcase|catalogue|catalog)\b/i],
  ['Donations', /\b(donat(?:e|ion|ions)|fundrais(?:e|ing)|contribution)\b/i],
  ['Payments', /\b(payment|pay|checkout|card|transaction|purchase|buy)\b/i],
  ['Accounts', /\b(accounts?|logins?|sign[ -]?in|profiles?|members?)\b/i],
  ['Search', /\b(search|filter|discover|find)\b/i],
  ['Content', /\b(content|upload|publish|post|article|blog)\b/i],
  ['Admin', /\b(admin|manage|management|dashboard|report)\b/i],
  ['Bookings', /\b(book|booking|appointment|reservation|schedule)\b/i],
  ['Notifications', /\b(notifications?|alerts?|emails?|messages?|reminders?)\b/i],
  ['Security', /\b(security|secure|permission|privacy|authentication)\b/i],
];

export function resolveVisualFeatures(messages = []) {
  const projectText = messages
    .filter((message) => message.sender === 'user')
    .slice(-6)
    .map((message) => String(message.text || ''))
    .join(' ');
  return VISUAL_FEATURES
    .filter(([, pattern]) => pattern.test(projectText))
    .map(([label]) => label)
    .slice(0, 5);
}

export function resolveVisualMode(projectType, messages = []) {
  const latestUserMessages = messages
    .filter((message) => message.sender === 'user')
    .slice(-3)
    .reverse();

  for (const message of latestUserMessages) {
    const text = String(message.text || '');
    const match = VISUAL_INTENT_PATTERNS.find(([, pattern]) => pattern.test(text));
    if (match) return match[0];
  }

  const projectText = String(projectType || '');
  return VISUAL_INTENT_PATTERNS.find(([, pattern]) => pattern.test(projectText))?.[0] || 'web';
}

const REPLACEMENTS = [
  [/\bbookameeting\b/g, 'book a meeting'],
  [/\bameeting\b/g, 'a meeting'],
  [/\b(?:meting|metting|meating|meetng)\b/g, 'meeting'],
  [/\b(?:bok|boook)\b/g, 'book'],
  [/\bcalanders?\b|\bcalenders?\b/g, 'calendar'],
  [/\bscheduals?\b/g, 'schedule'],
  [/\bbussiness(?:es)?\b/g, 'business'],
  [/\bmob\s+apps?\b/g, 'mobile app'],
  [/\be[\s-]?comm?erce\b/g, 'ecommerce'],
  [/\bwebistes?\b|\bwesbites?\b/g, 'website'],
  [/\bwnat\b/g, 'want'],
  [/\bcreat\b/g, 'create'],
  [/\bautomashun\b/g, 'automation'],
  [/\bmordern(?:ise|ize)?\b/g, 'modernise'],
  [/\battendence\b/g, 'attendance'],
  [/\bwoek\b/g, 'work'],
  [/\bur\b/g, 'your'],
  [/\bu\b/g, 'you'],
];

export function normalizeVisitorMessage(value) {
  let text = String(value ?? '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9\s&+'-]/g, ' ');

  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, ' ').trim();
}

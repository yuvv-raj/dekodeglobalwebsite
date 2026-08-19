import { isStarTrustIntent } from '../knowledge/starRecommendation.js';
import { resolveVisualFeatures } from './visualIntent.js';

export const NARRATIVE_SCENES = Object.freeze({
  BUILD: 'product_build',
  AI: 'ai_intelligence',
  AUTOMATION: 'process_automation',
  CLOUD: 'cloud_system',
  SECURITY: 'security_boundary',
  COMMERCE: 'digital_commerce',
  METHODOLOGY: 'delivery_methodology',
  PORTFOLIO: 'project_evidence',
  BRIDGE: 'cross_border_bridge',
  STAR: 'star_trust_system',
  CALENDAR: 'calendar_booking',
  COMPANY: 'company_network',
  BOUNDARY: 'safe_boundary',
});

const SCENE_META = {
  [NARRATIVE_SCENES.BUILD]: ['Shaping the product', 'Requirements becoming a working system', '#39b9ff', '#facc15'],
  [NARRATIVE_SCENES.AI]: ['Intelligence in motion', 'Signals becoming useful decisions', '#9f7aea', '#36d6c6'],
  [NARRATIVE_SCENES.AUTOMATION]: ['Flow without friction', 'Manual steps becoming a connected workflow', '#36d6c6', '#facc15'],
  [NARRATIVE_SCENES.CLOUD]: ['Connected foundation', 'Services moving through resilient infrastructure', '#4aa8ff', '#36d6c6'],
  [NARRATIVE_SCENES.SECURITY]: ['Protected by design', 'Trust boundaries surrounding every exchange', '#58d68d', '#4aa8ff'],
  [NARRATIVE_SCENES.COMMERCE]: ['A connected buying journey', 'Discovery, payment and fulfilment working together', '#ffb547', '#ef6f6c'],
  [NARRATIVE_SCENES.METHODOLOGY]: ['How work moves', 'Discovery through Evolve as one continuous journey', '#facc15', '#4aa8ff'],
  [NARRATIVE_SCENES.PORTFOLIO]: ['Evidence in focus', 'DEKODE work arranged around the question', '#ffb547', '#9f7aea'],
  [NARRATIVE_SCENES.BRIDGE]: ['Australia and India, connected', 'Talent, ideas and delivery moving both ways', '#39b9ff', '#facc15'],
  [NARRATIVE_SCENES.STAR]: ['The STAR trust system', 'Simple. Transparent. Accountable. Reliable.', '#facc15', '#4aa8ff'],
  [NARRATIVE_SCENES.CALENDAR]: ['Finding the right moment', 'Availability aligning across time zones', '#4aa8ff', '#facc15'],
  [NARRATIVE_SCENES.COMPANY]: ['DEKODE at a glance', 'People, capabilities and outcomes connected', '#4aa8ff', '#9f7aea'],
  [NARRATIVE_SCENES.BOUNDARY]: ['A clear boundary', 'Keeping the conversation useful and responsible', '#94a3b8', '#4aa8ff'],
};

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s'-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const BRIDGE_INTENT = /\b(?:bridge initiative|australia.{0,45}india|india.{0,45}australia|cross[- ]border|global delivery|distributed teams?|offshore collaboration|talent exchange|r&d collaboration|work across (?:countries|time zones))\b/;
const LOCATION_INTENT = /\b(?:where (?:is|are) (?:dekode|your offices?|you located)|dekode locations?|your locations?|offices? in australia|offices? in india)\b/;
const STAR_EXPLICIT = /\bstar(?:\s+(?:principles?|standard|values?))?\b/;
const STAR_VALUES = /\b(?:your|dekode'?s) (?:working )?(?:principles|values)\b/;
const METHODOLOGY_INTENT = /\b(?:methodology|delivery process|how (?:do|does) (?:you|dekode) (?:work|deliver|build)|discovery.{0,50}prototype|prototype.{0,50}design)\b/;
const PORTFOLIO_INTENT = /\b(?:portfolio|case stud(?:y|ies)|success stor(?:y|ies)|past work|previous work|show (?:me )?(?:your )?work|what (?:has|have) (?:dekode|you) built|attendme|chauffr|smartbroker|smart loan helper|recycled market|estrado|food manufacturing company|primary school)\b/;
const SECURITY_INTENT = /\b(?:cybersecurity|security|secure|privacy|authentication|authorisation|authorization|permissions?|protect(?:ion|ed)?|data safety|compliance)\b/;
const AUTOMATION_INTENT = /\b(?:automation|automate|workflow|manual process|repetitive|bottleneck|approval flow|process orchestration)\b/;
const AI_INTENT = /\b(?:artificial intelligence|generative ai|agentic ai|predictive ai|analytical ai|machine learning|\bai\b|llm|copilot|chatbot|intelligent agent)\b/;
const CLOUD_INTENT = /\b(?:cloud|infrastructure|aws|azure|gcp|google cloud|server|database|systems? integration|apis?)\b/;
const COMMERCE_INTENT = /\b(?:e-?commerce|online store|marketplace|checkout|shopping cart|retail platform|payment gateway)\b/;
const MOBILE_INTENT = /\b(?:mobile app|android|ios|iphone|ipad|app store|play store)\b/;
const BUILD_INTENT = /\b(?:build|create|develop|design|make|launch|moderni[sz]e|improve)\b/;

const hashText = (value) => {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
};

const lastUserMessages = (messages) => (Array.isArray(messages) ? messages : [])
  .filter((message) => message?.sender === 'user' || message?.role === 'user')
  .slice(-6);

export function resolveNarrativeScene({
  question = '',
  intent = '',
  action = '',
  topic = '',
  projectType = '',
  messages = [],
  conversationSummary = '',
  bookingActive = false,
  bookingComplete = false,
} = {}) {
  const userMessages = lastUserMessages(messages);
  const latestQuestion = question || userMessages.at(-1)?.text || '';
  const latest = normalize(latestQuestion);
  const context = normalize(`${userMessages.map((message) => message.text).join(' ')} ${conversationSummary}`);
  const normalizedTopic = normalize(topic);
  const normalizedProjectType = normalize(projectType);
  let id = NARRATIVE_SCENES.COMPANY;

  if (bookingActive || bookingComplete || action === 'open_calendar' || intent === 'book_meeting') {
    id = NARRATIVE_SCENES.CALENDAR;
  } else if (intent === 'safety_refusal') {
    id = NARRATIVE_SCENES.BOUNDARY;
  } else if (BRIDGE_INTENT.test(latest) || LOCATION_INTENT.test(latest) || ['bridge', 'initiatives', 'locations', 'location'].includes(normalizedTopic)) {
    id = NARRATIVE_SCENES.BRIDGE;
  } else if (STAR_EXPLICIT.test(latest) || STAR_VALUES.test(latest) || isStarTrustIntent(latest)) {
    id = NARRATIVE_SCENES.STAR;
  } else if (intent === 'methodology' || ['methodology', 'process'].includes(normalizedTopic) || METHODOLOGY_INTENT.test(latest)) {
    id = NARRATIVE_SCENES.METHODOLOGY;
  } else if (intent === 'case_study' || ['casestudies', 'portfolio'].includes(normalizedTopic) || PORTFOLIO_INTENT.test(latest)) {
    id = NARRATIVE_SCENES.PORTFOLIO;
  } else if (SECURITY_INTENT.test(latest)) {
    id = NARRATIVE_SCENES.SECURITY;
  } else if (AUTOMATION_INTENT.test(latest)) {
    id = NARRATIVE_SCENES.AUTOMATION;
  } else if (AI_INTENT.test(latest)) {
    id = NARRATIVE_SCENES.AI;
  } else if (COMMERCE_INTENT.test(latest)) {
    id = NARRATIVE_SCENES.COMMERCE;
  } else if (CLOUD_INTENT.test(latest)) {
    id = NARRATIVE_SCENES.CLOUD;
  } else if (intent === 'project_build' || action === 'show_project_panel' || BUILD_INTENT.test(latest) || normalizedProjectType) {
    id = NARRATIVE_SCENES.BUILD;
  }

  const [title, caption, accent, secondary] = SCENE_META[id];
  const features = resolveVisualFeatures([
    ...userMessages,
    ...(conversationSummary ? [{ sender: 'user', text: conversationSummary }] : []),
  ]);
  const projectFormat = MOBILE_INTENT.test(latest || context)
    ? 'mobile'
    : COMMERCE_INTENT.test(latest || context) ? 'commerce' : 'web';

  return {
    id,
    title,
    caption,
    accent,
    secondary,
    features,
    projectFormat,
    progress: Math.max(1, Math.min(6, userMessages.length || 1)),
    seed: hashText(`${id}:${context || latest || normalizedProjectType}`),
  };
}


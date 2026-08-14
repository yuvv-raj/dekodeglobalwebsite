import { findTopic } from './knowledgeIndex.js';
import { normalizeVisitorMessage } from './messageNormalization.js';
import { isProjectRequest } from './projectResponseGenerator.js';
import { getSensitiveRequestRefusal } from './safetyResponse.js';

const OUT_OF_SCOPE_PATTERNS = [
  /\b(tell|write|make).{0,12}\b(joke|poem|story|code)\b/i,
  /\b(explain|teach me)\s+(react|javascript|python|history|science)\b/i,
  /\b(who won|weather|news|time|translate)\b/i,
];

const GREETING_PATTERNS = [/^(hello|hi|hey|thanks|thank you)\b[.!?\s]*$/i];

const BOOKING_ACTION = /\b(book|schedule|reserve|arrange|set up|fix)\b/i;
const BOOKING_OBJECT = /\b(meet|meeting|call|consultation|discovery call|talk)\b/i;
const DUAL_USE_TERM = /\b(meet|meeting|call|calendar|booking|appointment|schedule|scheduling)\b/i;
const PROJECT_ACTION = /\b(build|create|make|develop|design|launch|add|integrate)\b/i;
const PRODUCT_NOUN = /\b(app|application|website|web app|platform|system|software|product|feature|portal|workflow|integration)\b/i;
const PROJECT_CONTEXT = /\b(users?|customers?|visitors?|workflow|integration|calendar feature|booking system|appointment system)\b/i;
const CAPABILITY_QUESTION = /^(can|could|do|does|would)\s+you\b/i;

export function scoreCompetingIntents(message) {
  const text = normalizeVisitorMessage(message);
  const hasBookingAction = BOOKING_ACTION.test(text);
  const hasBookingObject = BOOKING_OBJECT.test(text);
  const hasDualUseTerm = DUAL_USE_TERM.test(text);
  const hasProjectAction = PROJECT_ACTION.test(text);
  const hasProductNoun = PRODUCT_NOUN.test(text);
  const hasProjectContext = PROJECT_CONTEXT.test(text);
  const isCapabilityQuestion = CAPABILITY_QUESTION.test(text);
  const hasBookingPair = hasBookingAction && hasBookingObject;
  const hasExplicitBookingPurpose = /\b(?:book|schedule|reserve|arrange|set up|fix)\b.{0,28}\b(?:discovery call|consultation|call|meeting)\b.{0,18}\b(?:with|to discuss|about|regarding)\b/i.test(text);
  const hasBookingTarget = /\b(?:book|schedule|arrange|meet|meeting|call|talk)\b.{0,36}\b(?:with|to)\s+(?:dekode|you|your team|the team|someone|a person|a human)\b/i.test(text)
    || /\b(?:meet|meeting|call|talk)\b.{0,24}\b(?:someone|team|person|human)\b/i.test(text)
    || /\b(?:your|dekode)\s+(?:availability|slots?)\b/i.test(text);
  const hasInformalMeetingRequest = !hasProductNoun
    && /\b(?:i|we)?\s*(?:want|need|would like|can i|could i|like)\b.{0,28}\b(?:meet|meeting|call|talk)\b/i.test(text);
  const hasDirectBookingNeed = !hasProductNoun
    && /\b(?:i|we)?\s*(?:want|need|would like|can i|could i|like)\b.{0,28}\b(?:calendar|booking)\b/i.test(text);
  const asksAvailability = /\b(?:meet|meeting|call|consultation|discovery call)\b.{0,32}\b(?:availability|available|slots?|times?)\b/i.test(text)
    || /\b(?:availability|available|slots?|times?)\b.{0,32}\b(?:meet|meeting|call|consultation|discovery call)\b/i.test(text);
  const hasCallPreference = /\b(?:rather|prefer|instead)\b.{0,28}\b(?:on|in|over)?\s*a?\s*(?:call|meeting|talk)\b/i.test(text)
    || /\b(?:do|talk|discuss)\s+(?:this|it)?\s*(?:on|over|in)\s+a\s+call\b/i.test(text);
  const hasProjectContainer = /\b(?:in|for|on)\s+(?:my|our)\s+(?:website|app|application|platform|system|software|product)\b/i.test(text);
  const hasOwnedProductRequest = /\b(?:i|we)\s+(?:want|need|would like)\b.{0,36}\b(?:app|application|website|platform|system|software|product|feature)\b/i.test(text);
  const strongProject = hasProjectContainer
    || (hasProjectAction && hasProductNoun && (!isCapabilityQuestion || hasDualUseTerm));

  let bookingScore = 0;
  let projectScore = 0;

  if (/^(?:please\s+)?book$/i.test(text)) bookingScore += 5;
  if (hasBookingPair) bookingScore += 5;
  if (hasExplicitBookingPurpose) bookingScore += 6;
  if (hasCallPreference) bookingScore += 6;
  if (hasInformalMeetingRequest) bookingScore += 4;
  if (hasDirectBookingNeed) bookingScore += 4;
  if (hasBookingTarget) bookingScore += 4;
  if (asksAvailability) bookingScore += 4;
  if (hasDualUseTerm) bookingScore += 1;

  if (strongProject) projectScore += 6;
  if (hasDualUseTerm && hasProductNoun) projectScore += 4;
  if (hasProjectContext) projectScore += 2;
  if (hasOwnedProductRequest) projectScore += 2;
  if (hasProductNoun) projectScore += 1;

  let route = null;
  if (hasCallPreference) route = 'meeting';
  else if (strongProject && !hasBookingTarget && !hasExplicitBookingPurpose) route = 'project';
  else if (bookingScore >= 4 && projectScore >= 4 && Math.abs(bookingScore - projectScore) <= 2) route = 'clarify';
  else if (bookingScore >= 4 && bookingScore > projectScore) route = 'meeting';
  else if (projectScore >= 5 && projectScore >= bookingScore) route = 'project';
  else if (hasDualUseTerm) route = 'clarify';

  return {
    bookingScore,
    projectScore,
    route,
    signals: { hasBookingTarget, hasExplicitBookingPurpose, hasDualUseTerm, hasProductNoun, strongProject },
  };
}

function conversationConfirmsBooking(context = {}) {
  const selectedSuggestion = context?.interaction?.type === 'suggestion'
    && (context.interaction.intent === 'book_meeting' || context.interaction.action === 'open_calendar');
  const memory = context?.conversation;
  if (selectedSuggestion || memory?.booking?.requested || memory?.booking?.initiated || memory?.lastIntent === 'meeting') {
    return true;
  }
  return (Array.isArray(memory?.recentMessages) ? memory.recentMessages : [])
    .filter((entry) => entry?.role === 'user')
    .slice(-4)
    .some((entry) => scoreCompetingIntents(entry.text).route === 'meeting');
}

export function resolveCalendarIntent(message, context = {}) {
  const current = scoreCompetingIntents(message);
  if (current.route === 'project') return 'project';
  if (current.route === 'meeting' || conversationConfirmsBooking(context)) return 'meeting';
  return 'clarify';
}

const ORIGIN_PATTERNS = [
  /\bwhy\b.{0,32}\b(dekode|company|you)\b.{0,28}\b(start|started|found|founded|create|created|begin|began)\b/i,
  /\bwhy\b.{0,32}\b(start|started|found|founded|create|created)\b.{0,28}\b(dekode|company|you)\b/i,
];

const CLEAR_EXTERNAL_QUESTION = /^(who|what|when|where|why|how)\b/i;
const PORTFOLIO_QUESTION = /\b(?:projects?|portfolio|past work|previous work|show me (?:some of )?(?:your )?work|what (?:have|has) you built|what work (?:have you done|did you do)|case studies|success stories)\b/i;

const COMPANY_CUES = [
  /\bdekode\b/i,
  /\b(your|the)\s+(company|business|services?|capabilities|team|culture|values?|technolog(?:y|ies)|stack|process|clients?|industr(?:y|ies)|projects?|works?|case studies|success stories|locations?|address|privacy|terms|polic(?:y|ies))\b/i,
  /\b(who are you|what do you do|why (?:should i )?choose you|how do you work)\b/i,
  /\bhow do you\s+(?:approach|deliver|manage|run|support|take)\b/i,
  /\b(do|can)\s+you\s+(build|provide|offer|support|work|help|develop|design)\b/i,
  /\bwhat\s+(?:services?|solutions?|industries|technologies)\s+do\s+you\b/i,
  /\b(where are you|where (?:is|are).{0,20}(?:office|located|based)|office address|headquarters|privacy policy|terms (?:and conditions|of service))\b/i,
  /\b(contact us|contact information|email address|phone number|company location)\b/i,
  /\b(what (?:have|has) you built|work have you done|show me your work|case stud(?:y|ies)|success stor(?:y|ies)|past projects?)\b/i,
];

const SHORT_COMPANY_TOPICS = /^(about|company|services?|capabilities|industr(?:y|ies)|technolog(?:y|ies)|tech stack|process|case studies|success stories|portfolio|past work|contact|location|locations|privacy|privacy policy|terms|terms and conditions|terms of service|why dekode)$/i;

export function classifyCompanyIntent(message, context = {}) {
  const text = normalizeVisitorMessage(message);
  if (!text) return { isCompanyRelated: false, topic: null, kind: 'ambiguous' };
  if (getSensitiveRequestRefusal(text)) {
    return { isCompanyRelated: false, topic: null, kind: 'unsafe' };
  }
  if (GREETING_PATTERNS.some((pattern) => pattern.test(text))) {
    return { isCompanyRelated: false, topic: null, kind: 'greeting' };
  }
  const competingIntent = scoreCompetingIntents(text);
  if (competingIntent.route === 'meeting') {
    return { isCompanyRelated: false, topic: 'meeting', kind: 'meeting' };
  }
  if (competingIntent.route === 'project') {
    return { isCompanyRelated: false, topic: null, kind: 'project' };
  }
  if (competingIntent.route === 'clarify') {
    return { isCompanyRelated: false, topic: 'meeting', kind: 'meeting_project_ambiguous' };
  }
  if (OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { isCompanyRelated: false, topic: null, kind: 'out_of_scope' };
  }
  if (isProjectRequest(text)) {
    return { isCompanyRelated: false, topic: null, kind: 'project' };
  }
  if (ORIGIN_PATTERNS.some((pattern) => pattern.test(text))) {
    return { isCompanyRelated: true, topic: 'origin', kind: 'company' };
  }

  const match = findTopic(text);
  const hasCompanyCue = COMPANY_CUES.some((pattern) => pattern.test(text));
  const asksAboutSolution =
    Boolean(match.solutionArea) &&
    /\b(what is|tell me about|do you|can you|offer|provide|help with|explain)\b/i.test(text);
  const asksAboutPortfolio = Boolean(match.portfolioProject);
  const asksAboutVerifiedEntity = Boolean(match.caseStudy || match.initiative || match.developmentStep);
  const asksAboutKnownTopic = Boolean(match.topic && match.score > 0);
  const contextualFollowUp =
    context.isCompanyConversation &&
    (match.score > 0 || /^(what about|how about|and|also|tell me more|why|how|which|do you|can you)\b/i.test(text));

  const isShortCompanyTopic = SHORT_COMPANY_TOPICS.test(text);
  const isCompanyRelated = hasCompanyCue || PORTFOLIO_QUESTION.test(text) || asksAboutSolution || asksAboutPortfolio || asksAboutVerifiedEntity || asksAboutKnownTopic || contextualFollowUp || isShortCompanyTopic;

  if (!isCompanyRelated && !match.topic && CLEAR_EXTERNAL_QUESTION.test(text)) {
    return { isCompanyRelated: false, topic: null, kind: 'out_of_scope' };
  }

  return {
    isCompanyRelated,
    kind: isCompanyRelated ? 'company' : 'ambiguous',
    topic: PORTFOLIO_QUESTION.test(text) ? 'caseStudies' : match.topic || (contextualFollowUp ? context.lastTopic : null) || 'company',
    service: match.service,
    solutionArea: match.solutionArea,
    portfolioProject: match.portfolioProject,
    caseStudy: match.caseStudy,
    initiative: match.initiative,
    developmentStep: match.developmentStep,
  };
}

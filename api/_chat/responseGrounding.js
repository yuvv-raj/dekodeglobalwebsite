import companyKnowledge from '../../src/knowledge/companyKnowledge.json' with { type: 'json' };
import { normalizeVisitorMessage } from '../../src/knowledge/messageNormalization.js';

const FACTUAL_INTENTS = new Set(['company_info', 'pricing', 'case_study', 'methodology']);
const PROJECT_EVIDENCE_PATTERN = /\b(?:projects?|portfolio|past work|previous work|client work|examples?|case studies|success stories|clients?|what have you built|show me (?:some of )?(?:your )?work|what work (?:have you done|did you do))\b/i;
const HISTORICAL_CLAIM_PATTERN = /\b(?:dekode|we)\b.{0,60}\b(?:built|delivered|developed|created|worked with|client|case study|project)\b/i;
const STOP_WORDS = new Set([
  'about', 'after', 'also', 'answer', 'because', 'been', 'being', 'could', 'does',
  'from', 'have', 'help', 'into', 'more', 'only', 'other', 'that', 'their', 'there',
  'these', 'they', 'this', 'through', 'what', 'when', 'where', 'which', 'with',
  'would', 'your', 'dekode',
]);

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9+&\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokens = (value) => [...new Set(normalize(value).match(/[a-z0-9+&-]{4,}/g) || [])]
  .filter((token) => !STOP_WORDS.has(token));

const approvedEvidenceNames = [
  ...(companyKnowledge.portfolioProjects || []).flatMap((project) => [project.name, ...(project.aliases || [])]),
  ...(companyKnowledge.caseStudies || []).flatMap((study) => [study.name, ...(study.aliases || [])]),
].map(normalize).filter((name) => name.length >= 4);

export function isProjectEvidenceQuestion(question) {
  return PROJECT_EVIDENCE_PATTERN.test(normalizeVisitorMessage(question));
}

export function requiresCompanyGrounding(result, question) {
  if (FACTUAL_INTENTS.has(result?.intent) || result?.action === 'show_company_panel') return true;
  return (result?.intent === 'project_build' && HISTORICAL_CLAIM_PATTERN.test(String(result?.answer || '')))
    || isProjectEvidenceQuestion(question);
}

export function isGroundedCompanyResult(result, question, matches = []) {
  if (!requiresCompanyGrounding(result, question)) return true;
  if (!Array.isArray(matches) || matches.length === 0) return false;

  const answer = String(result?.answer || '');
  const sourceText = matches.map((match) => `${match.label || ''} ${match.text || ''}`).join(' ');
  const answerTokens = tokens(answer);
  const sourceTokens = new Set(tokens(sourceText));
  if (answerTokens.length === 0) return false;

  const supportedTokens = answerTokens.filter((token) => sourceTokens.has(token)).length;
  const coverage = supportedTokens / answerTokens.length;
  if (isProjectEvidenceQuestion(question) || result?.intent === 'case_study') {
    const normalizedAnswer = normalize(answer);
    const namesVerified = approvedEvidenceNames.some((name) => normalizedAnswer.includes(name));
    return namesVerified && coverage >= 0.65;
  }
  return coverage >= 0.55;
}

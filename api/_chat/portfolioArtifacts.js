import companyKnowledge from '../../src/knowledge/companyKnowledge.json' with { type: 'json' };
import { isProjectEvidenceQuestion } from './responseGrounding.js';

const portfolioIds = new Set((companyKnowledge.portfolioProjects || []).map((item) => item.id));
const caseStudyIds = new Set((companyKnowledge.caseStudies || []).map((item) => item.id));
const allEvidenceIds = [
  ...(companyKnowledge.caseStudies || []).map((item) => item.id),
  ...(companyKnowledge.portfolioProjects || []).map((item) => item.id),
];
const evidenceById = new Map([
  ...(companyKnowledge.caseStudies || []).map((item) => [item.id, {
    id: item.id,
    name: item.name,
    category: 'Published case study',
    summary: item.solution,
    detail: item.outcome,
  }]),
  ...(companyKnowledge.portfolioProjects || []).map((item) => [item.id, {
    id: item.id,
    name: item.name,
    category: 'Verified portfolio',
    summary: item.description,
    detail: item.outcome,
  }]),
]);

function idFromMatch(match) {
  if (String(match?.id || '').startsWith('portfolio-')) {
    const id = match.id.slice('portfolio-'.length);
    return portfolioIds.has(id) ? id : null;
  }
  if (String(match?.id || '').startsWith('case-study-')) {
    const id = match.id.slice('case-study-'.length);
    return caseStudyIds.has(id) ? id : null;
  }
  return null;
}

export function buildVerifiedPortfolioArtifacts(question, verifiedIntent, matches = []) {
  const isPortfolioIntent = verifiedIntent?.topic === 'caseStudies' || isProjectEvidenceQuestion(question);
  if (!isPortfolioIntent) return [];

  const explicitIds = [verifiedIntent?.caseStudy?.id, verifiedIntent?.portfolioProject?.id]
    .filter((id) => caseStudyIds.has(id) || portfolioIds.has(id));
  const matchedIds = matches.map(idFromMatch).filter(Boolean);
  const broadRequest = isProjectEvidenceQuestion(question) && explicitIds.length === 0;
  const itemIds = [...new Set(broadRequest ? allEvidenceIds : [...explicitIds, ...matchedIds])];
  const items = itemIds.map((id) => evidenceById.get(id)).filter(Boolean);
  if (items.length === 0) return [];

  return [{
    id: 'verified-dekode-work',
    type: 'portfolio_peek',
    label: 'Our Work',
    items,
  }];
}

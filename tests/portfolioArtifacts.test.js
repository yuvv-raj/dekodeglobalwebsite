import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveCompanyKnowledge } from '../api/_chat/companyRetrieval.js';
import { buildVerifiedPortfolioArtifacts } from '../api/_chat/portfolioArtifacts.js';
import { classifyCompanyIntent } from '../src/knowledge/intentClassifier.js';

test('adds verified work only for portfolio and case-study intent', () => {
  const question = 'show me some of ur woek';
  const artifacts = buildVerifiedPortfolioArtifacts(
    question,
    classifyCompanyIntent(question),
    retrieveCompanyKnowledge(question),
  );
  assert.equal(artifacts[0]?.label, 'Our Work');
  assert.deepEqual(artifacts[0]?.items.map((item) => item.id), [
    'food-manufacturing', 'primary-school', 'attendme', 'chauffr',
    'smart-loan-helper', 'smartbroker', 'recycled-market', 'estrado',
  ]);

  assert.deepEqual(buildVerifiedPortfolioArtifacts(
    'What services does DEKODE offer?',
    classifyCompanyIntent('What services does DEKODE offer?'),
    retrieveCompanyKnowledge('What services does DEKODE offer?'),
  ), []);
});

test('limits a named project artifact to approved matching evidence', () => {
  const question = 'What is CHAUFFR?';
  const [artifact] = buildVerifiedPortfolioArtifacts(
    question,
    classifyCompanyIntent(question),
    retrieveCompanyKnowledge(question),
  );
  assert.equal(artifact.type, 'portfolio_peek');
  assert.deepEqual(artifact.items.map((item) => item.id), ['chauffr']);
  assert.match(artifact.items[0].summary, /mobile app/i);
});

test('keeps case-study requests separate from the broader portfolio', () => {
  const caseStudyQuestion = 'Do you have any case studies?';
  const [caseStudyArtifact] = buildVerifiedPortfolioArtifacts(
    caseStudyQuestion,
    classifyCompanyIntent(caseStudyQuestion),
    retrieveCompanyKnowledge(caseStudyQuestion),
  );
  assert.deepEqual(caseStudyArtifact.items.map((item) => item.id), [
    'food-manufacturing', 'primary-school',
  ]);

  const portfolioQuestion = 'Show me your portfolio and projects';
  const [portfolioArtifact] = buildVerifiedPortfolioArtifacts(
    portfolioQuestion,
    classifyCompanyIntent(portfolioQuestion),
    retrieveCompanyKnowledge(portfolioQuestion),
  );
  assert.deepEqual(portfolioArtifact.items.map((item) => item.id), [
    'food-manufacturing', 'primary-school', 'attendme', 'chauffr',
    'smart-loan-helper', 'smartbroker', 'recycled-market', 'estrado',
  ]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveCompanyKnowledge } from '../api/_chat/companyRetrieval.js';
import { isGroundedCompanyResult } from '../api/_chat/responseGrounding.js';

const portfolioMatches = retrieveCompanyKnowledge('show me your work');

test('accepts portfolio answers that name retrieved DEKODE evidence', () => {
  const result = {
    intent: 'case_study',
    action: 'show_company_panel',
    answer: 'Verified DEKODE projects include AttendMe, CHAUFFR, SmartBroker, and Estrado.',
  };
  assert.equal(isGroundedCompanyResult(result, 'show me your work', portfolioMatches), true);
});

test('rejects invented project catalogues even when they sound plausible', () => {
  for (const answer of [
    'DEKODE built a Department of Defense tax platform and military logistics system.',
    'Pioneering Digital Health delivered clinical decision support using serverless architecture.',
    'An enterprise cargo tracking portal processes international shipments in real time.',
  ]) {
    assert.equal(isGroundedCompanyResult({
      intent: 'case_study', action: 'show_company_panel', answer,
    }, 'show me your work', portfolioMatches), false, answer);
  }
});

test('does not let a real project name camouflage invented client or sector claims', () => {
  const result = {
    intent: 'case_study',
    action: 'show_company_panel',
    answer: 'AttendMe was a military logistics and national tax platform delivered for a defence department.',
  };
  assert.equal(isGroundedCompanyResult(result, 'show me your work', portfolioMatches), false);
});

test('does not constrain ordinary reasoning about a visitor project', () => {
  const result = {
    intent: 'project_build',
    action: 'show_project_panel',
    answer: 'A useful first step is to identify the users and the outcome the product should create.',
  };
  assert.equal(isGroundedCompanyResult(result, 'I want to build a website', []), true);
});

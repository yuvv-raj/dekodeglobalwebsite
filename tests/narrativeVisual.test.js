import test from 'node:test';
import assert from 'node:assert/strict';
import { NARRATIVE_SCENES, resolveNarrativeScene } from '../src/utils/narrativeVisual.js';

const sceneFor = (question, extra = {}) => resolveNarrativeScene({
  question,
  messages: [{ sender: 'user', text: question }],
  ...extra,
}).id;

test('maps trust evaluation to STAR without capturing product attributes', () => {
  assert.equal(sceneFor('What makes DEKODE different from other agencies?'), NARRATIVE_SCENES.STAR);
  assert.equal(sceneFor('Can I trust your team to deliver?'), NARRATIVE_SCENES.STAR);
  assert.equal(sceneFor("Explain DEKODE's STAR principles"), NARRATIVE_SCENES.STAR);
  assert.equal(sceneFor('Build a reliable mobile app', { intent: 'project_build' }), NARRATIVE_SCENES.BUILD);
  assert.equal(sceneFor('Create a transparent reporting dashboard', { intent: 'project_build' }), NARRATIVE_SCENES.BUILD);
});

test('maps genuine Australia-India collaboration to BRIDGE without capturing a market mention', () => {
  assert.equal(sceneFor('How do you work across Australia and India?'), NARRATIVE_SCENES.BRIDGE);
  assert.equal(sceneFor('What is the BRIDGE initiative?'), NARRATIVE_SCENES.BRIDGE);
  assert.equal(sceneFor('Where is DEKODE located?'), NARRATIVE_SCENES.BRIDGE);
  assert.equal(sceneFor('Build a website for Australian customers', { intent: 'project_build' }), NARRATIVE_SCENES.BUILD);
});

test('maps major conversation intents to distinct narrative scenes', () => {
  assert.equal(sceneFor('How does your methodology work?', { intent: 'methodology' }), NARRATIVE_SCENES.METHODOLOGY);
  assert.equal(sceneFor('Show me your case studies', { intent: 'case_study' }), NARRATIVE_SCENES.PORTFOLIO);
  assert.equal(sceneFor('We need AI agents for customer support', { intent: 'project_build' }), NARRATIVE_SCENES.AI);
  assert.equal(sceneFor('Automate our manual approval workflow', { intent: 'project_build' }), NARRATIVE_SCENES.AUTOMATION);
  assert.equal(sceneFor('Secure our customer portal', { intent: 'project_build' }), NARRATIVE_SCENES.SECURITY);
  assert.equal(sceneFor('Can I book a discovery call?', { intent: 'book_meeting', action: 'open_calendar' }), NARRATIVE_SCENES.CALENDAR);
});

test('preserves scene variation and progress from accumulated conversation', () => {
  const result = resolveNarrativeScene({
    intent: 'project_build',
    messages: [
      { sender: 'user', text: 'I want to build an artist website.' },
      { sender: 'user', text: 'Visitors need accounts and donations.' },
      { sender: 'user', text: 'Add search and notifications.' },
    ],
  });
  assert.equal(result.id, NARRATIVE_SCENES.BUILD);
  assert.deepEqual(result.features, ['Gallery', 'Donations', 'Accounts', 'Search', 'Notifications']);
  assert.equal(result.progress, 3);
  assert.ok(Number.isInteger(result.seed));
});


import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoolean } from '../src/voice/config.js';
import { VOICE_STATES, VoiceSessionController, canTransition } from '../src/voice/voiceSessionController.js';
import { KnowledgeConversationProvider } from '../src/voice/realtimeConversationProvider.js';
import {
  emptyLeadProfile,
  extractLeadProfile,
  reuseAuthenticatedProfile,
} from '../src/voice/leadQualificationManager.js';
import { MockMeetingSlotProvider } from '../src/meetings/mockMeetingSlotProvider.js';
import { generateLeadForm, validateLeadForm } from '../src/leads/leadFormGenerator.js';
import { LeadNotificationService, prepareLeadPayload } from '../src/leads/leadNotificationService.js';

test('feature flag can disable voice without changing the legacy path', () => {
  assert.equal(readBoolean('false', true), false);
  assert.equal(readBoolean('0', true), false);
  assert.equal(readBoolean(undefined, true), true);
});

test('voice session supports permission, listening, speaking, interruption, and ending transitions', () => {
  const session = new VoiceSessionController();
  assert.equal(session.transition(VOICE_STATES.REQUESTING_PERMISSION), VOICE_STATES.REQUESTING_PERMISSION);
  assert.equal(session.transition(VOICE_STATES.LISTENING), VOICE_STATES.LISTENING);
  assert.equal(session.transition(VOICE_STATES.PROCESSING), VOICE_STATES.PROCESSING);
  assert.equal(session.transition(VOICE_STATES.SPEAKING), VOICE_STATES.SPEAKING);
  assert.equal(session.transition(VOICE_STATES.INTERRUPTED), VOICE_STATES.INTERRUPTED);
  assert.equal(session.transition(VOICE_STATES.LISTENING), VOICE_STATES.LISTENING);
  assert.equal(session.transition(VOICE_STATES.ENDED), VOICE_STATES.ENDED);
  assert.equal(canTransition('ended', 'processing'), false);
});

test('company voice answers use approved knowledge and avoid invented pricing', async () => {
  const provider = new KnowledgeConversationProvider();
  const company = await provider.respond('What services do you provide?', { leadProfile: emptyLeadProfile() });
  const pricing = await provider.respond('What is your fixed price?', { leadProfile: emptyLeadProfile() });
  assert.match(company.text, /AI Strategy & Consulting/);
  assert.match(pricing.text, /do not have an approved fixed price/i);
});

test('voice distinguishes DEKODE booking from a scheduling-product project', async () => {
  const provider = new KnowledgeConversationProvider();
  const context = { leadProfile: emptyLeadProfile() };
  const booking = await provider.respond('book ameeting', context);
  const project = await provider.respond('i want to create a meeting app', context);
  const ambiguous = await provider.respond('Can I schedule a meeting app?', context);

  assert.equal(booking.action, 'offer_meeting');
  assert.equal(project.intent, 'project_discussion');
  assert.equal(ambiguous.intent, 'meeting_project_clarification');
  assert.match(ambiguous.text, /arrange time with DEKODE.*meeting and scheduling functionality/i);
});

test('unknown questions are bounded to DEKODE and project discovery', async () => {
  const provider = new KnowledgeConversationProvider();
  const response = await provider.respond('Who won the football match?', { leadProfile: emptyLeadProfile() });
  assert.match(response.text, /focused on approved information about DEKODE/i);
});

test('lead profile extracts contact, project, timeline, and recommendations', () => {
  const profile = extractLeadProfile(
    'My name is Alex Morgan and my email is alex@example.com. My phone is +61 421 196 363. We need an AI platform in 3 months with cloud automation.',
  );
  assert.equal(profile.name, 'Alex Morgan');
  assert.equal(profile.email, 'alex@example.com');
  assert.equal(profile.phone, '+61 421 196 363');
  assert.match(profile.projectType, /AI/i);
  assert.equal(profile.timeline, '3 months');
  assert.ok(profile.recommendedServices.length > 0);
});

test('authenticated profile data is reused only after consent', () => {
  const user = { name: 'Sam Lee', email: 'sam@example.com', company: 'Acme', phone: '+61 421 196 363' };
  assert.deepEqual(reuseAuthenticatedProfile(emptyLeadProfile(), user, false), emptyLeadProfile());
  const reused = reuseAuthenticatedProfile(emptyLeadProfile(), user, true);
  assert.equal(reused.email, 'sam@example.com');
  assert.equal(reused.company, 'Acme');
  assert.equal(reused.phone, '+61 421 196 363');
});

test('mock slots are future weekday ISO values with visitor timezone labels', async () => {
  const now = new Date('2026-07-24T00:00:00.000Z'); // Friday
  const provider = new MockMeetingSlotProvider({ minimumBookingNoticeHours: 0 });
  const slots = await provider.getAvailableSlots(now, 'UTC');
  assert.ok(slots.length >= 14);
  for (const slot of slots) {
    const date = new Date(slot.iso);
    assert.ok(date > now);
    assert.ok(date.getUTCDay() !== 0 && date.getUTCDay() !== 6);
    assert.equal(slot.visitorTimezone, 'UTC');
    assert.equal(slot.isMock, true);
  }
});

test('guest enquiry form is editable and requires valid fields plus consent', () => {
  const profile = extractLeadProfile('We need an AI platform for customer support in 3 months.');
  const form = generateLeadForm(profile);
  assert.match(form.projectSummary, /customer support/);
  assert.ok(form.inferredFields.includes('projectSummary'));
  assert.ok(validateLeadForm(form, false).consent);
  const validForm = { ...form, name: 'Alex', email: 'alex@example.com', company: 'Acme', phone: '+61 421 196 363' };
  assert.deepEqual(validateLeadForm(validForm, true), {});
});

test('lead payload is sanitised and mock submission never claims delivery', async () => {
  const form = {
    name: '<Alex>',
    email: 'alex@example.com',
    company: '<Acme>',
    phone: '+61 421 196 363',
    projectSummary: 'Build <script>alert(1)</script> an AI tool',
    interestedServices: ['Custom AI Development'],
    timeline: '3 months',
    budgetRange: '',
    preferredMeetingTime: '',
    timezone: 'UTC',
  };
  const payload = prepareLeadPayload(form, '/');
  assert.equal(payload.visitorName, 'Alex');
  assert.equal(payload.phone, '+61 421 196 363');
  assert.doesNotMatch(payload.projectSummary, /[<>]/);
  const service = new LeadNotificationService({ mode: 'mock' });
  await assert.rejects(() => service.submit(form, false), /consent/i);
  const result = await service.submit(form, true);
  assert.equal(result.delivered, false);
});

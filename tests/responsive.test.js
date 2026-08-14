import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexCss = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const voiceCss = await readFile(new URL('../src/components/voice/voice.css', import.meta.url), 'utf8');
const chatApp = await readFile(new URL('../src/components/ChatApp.jsx', import.meta.url), 'utf8');
const backToTop = await readFile(new URL('../src/components/BackToTopButton.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const projectOptions = await readFile(new URL('../src/config/projectOptions.js', import.meta.url), 'utf8');
const animationPanel = await readFile(new URL('../src/components/AnimationPanel.jsx', import.meta.url), 'utf8');
const interactiveContent = await readFile(new URL('../src/components/InteractiveContentSections.jsx', import.meta.url), 'utf8');
const interactiveStyles = await readFile(new URL('../src/components/interactive-content.css', import.meta.url), 'utf8');
const meetingScheduler = await readFile(new URL('../src/components/MeetingScheduler.jsx', import.meta.url), 'utf8');
const bookingSummary = await readFile(new URL('../src/components/BookingSummary.jsx', import.meta.url), 'utf8');
const typewriterText = await readFile(new URL('../src/components/TypewriterText.jsx', import.meta.url), 'utf8');
const companyKnowledgePanel = await readFile(new URL('../src/components/CompanyKnowledgePanel.jsx', import.meta.url), 'utf8');
const inlinePortfolioAccordion = await readFile(new URL('../src/components/InlinePortfolioAccordion.jsx', import.meta.url), 'utf8');

test('uses dynamic viewport units and safe-area spacing for app and voice surfaces', () => {
  assert.match(indexCss, /height:\s*100dvh/);
  assert.match(indexCss, /env\(safe-area-inset-bottom\)/);
  assert.match(voiceCss, /100dvh/);
  assert.match(voiceCss, /env\(safe-area-inset-bottom\)/);
});

test('keeps the visual panel restorable while disabling it in the current chat layout', () => {
  assert.equal((chatApp.match(/renderAnimationCard\('responsive-visual-panel'\)/g) || []).length, 1);
  assert.match(chatApp, /SUPPORTING_VISUAL_PANEL_ENABLED = false/);
  assert.match(chatApp, /SUPPORTING_VISUAL_PANEL_ENABLED && Boolean/);
  assert.doesNotMatch(chatApp, /renderAnimationCard\('mobile-only'\)/);
  assert.doesNotMatch(indexCss, /width:\s*600px\s*!important/);
  assert.doesNotMatch(indexCss, /\bzoom\s*:/);
});

test('provides content-driven breakpoints, touch targets, and reduced motion', () => {
  assert.match(indexCss, /@media \(max-width:\s*1180px\)/);
  assert.match(indexCss, /@media \(max-width:\s*767px\)/);
  assert.match(indexCss, /@media \(max-width:\s*380px\)/);
  assert.match(indexCss, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(voiceCss, /min-height:\s*44px/);
  assert.match(voiceCss, /@media \(max-height:\s*640px\) and \(orientation:\s*landscape\)/);
});

test('uses multiline keyboard-aware composers and an accessible visual-panel control', () => {
  assert.match(chatApp, /<textarea/);
  assert.match(chatApp, /requestSubmit\(\)/);
  assert.match(chatApp, /aria-label=\{isVisualPanelExpanded/);
  assert.match(chatApp, /max-height:\s*640px/);
});

test('keeps the composer responsive with rotating hints and separate voice typing', () => {
  assert.match(chatApp, /placeholderMessages\[placeholderIndex\]/);
  assert.match(chatApp, /Start voice typing/);
  assert.match(chatApp, /Stop voice typing/);
  assert.match(chatApp, /BrowserSpeechToTextProvider/);
  assert.match(chatApp, /<DekodeVoiceEntry compact onClick=\{handleOpenDekodeVoice\}/);
  assert.match(chatApp, /const handleOpenDekodeVoice = \(\) =>/);
  assert.match(chatApp, /onClick=\{handleSpeech\}/);
  assert.doesNotMatch(chatApp, /<DekodeVoiceEntry onClick=/);
  assert.match(indexCss, /\.hero-title\s*\{[^}]*font-size:\s*clamp\(1\.65rem,\s*2\.4vw,\s*2\.2rem\)[^}]*max-width:\s*min\(720px,\s*90%\)/s);
  assert.match(chatApp, /className="action-pill proposal-entry-button client-portal-top-right"/);
  assert.match(chatApp, /className="action-pill calendar-entry-button"/);
  assert.match(chatApp, /aria-label="Book a meeting"/);
  assert.match(chatApp, /setStep\('scheduling'\)/);
  assert.match(chatApp, /result\.action === "open_calendar"/);
  assert.match(chatApp, /activateMeetingScheduler\(\)/);
  assert.match(chatApp, /> Client Portal/);
  assert.doesNotMatch(chatApp, /Access Client Portal|Access client proposal/);
  assert.equal((projectOptions.match(/label:\s*"/g) || []).length, 4);
  assert.match(indexCss, /\.option-row\s*\{[^}]*flex-wrap:\s*nowrap/s);
  assert.match(indexCss, /@media \(min-width:\s*768px\) and \(max-width:\s*1100px\)/);
  assert.match(indexCss, /@media \(max-width:\s*767px\)[\s\S]*\.option-row/s);
  assert.match(indexCss, /\.proposal-entry-button\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(indexCss, /\.chat-mic-btn\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(indexCss, /\.contact-panel-grid \.knowledge-panel-button span,[\s\S]*overflow-wrap:\s*anywhere/);
});

test('caps long answer reveal time instead of typing every character slowly', () => {
  assert.match(typewriterText, /maxAnimationDuration = 1800/);
  assert.match(typewriterText, /charactersPerTick/);
  assert.match(typewriterText, /text\.slice\(0, nextIndex\)/);
});

test('switches legal documents in one shared panel and tightens story spacing', () => {
  assert.match(interactiveContent, /activeLegalDocument/);
  assert.match(interactiveContent, /role="tablist"/);
  assert.match(interactiveContent, /role="tabpanel"/);
  assert.doesNotMatch(interactiveContent, /<details/);
  assert.match(interactiveStyles, /\.company-legal-toggle/);
  assert.match(interactiveStyles, /padding: clamp\(3rem, 6vw, 5\.5rem\) 0/);
  assert.match(interactiveStyles, /min-height: 380px/);
});

test('pauses rotating hints for active voice typing states', () => {
  assert.match(chatApp, /\['requesting', 'listening', 'processing'\]\.includes\(voiceTypingState\)/);
  assert.match(chatApp, /data-state=\{voiceTypingState\}/);
});

test('renders composer inspiration only on the home screen', () => {
  assert.match(chatApp, /step !== "centered"/);
  assert.match(chatApp, /step === "centered" && !inputValue && !readOnly/);
  assert.doesNotMatch(chatApp, /Message DEKODE|active-chat-placeholder/);
});

test('provides one translucent back-to-top control across every DEKODE layout', () => {
  assert.match(app, /<BackToTopButton[^>]*disabled=\{isChatActive && !proposal\}/);
  assert.match(chatApp, /onChatModeChange\?\.\(step !== "centered"\)/);
  assert.match(backToTop, /if \(disabled\)/);
  assert.match(backToTop, /storySections\[2\]/);
  assert.match(backToTop, /\.app-container, \.chat-scroll-area, \.proposal-source-stage/);
  assert.match(backToTop, /document\.addEventListener\('scroll', handleScroll, true\)/);
  assert.match(backToTop, /aria-label="Back to top"/);
  assert.match(backToTop, /reduceMotion \? 'auto' : 'smooth'/);
  assert.match(indexCss, /\.back-to-top-button\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(indexCss, /right:\s*calc\(40px \+ env\(safe-area-inset-right, 0px\)\)/);
  assert.match(indexCss, /bottom:\s*calc\(40px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(indexCss, /right:\s*calc\(24px \+ env\(safe-area-inset-right, 0px\)\)/);
  assert.match(indexCss, /background:\s*rgba\(5, 51, 100, 0\.72\)/);
});

test('guides booking from date to time, summary, and details', () => {
  assert.match(meetingScheduler, /30 minutes with the DEKODE team/);
  assert.match(meetingScheduler, /meeting-duration-chip/);
  assert.match(meetingScheduler, /30 min · Video call/);
  assert.doesNotMatch(meetingScheduler, /Step 1|Step 2|Steps 3 and 4/);
  assert.match(meetingScheduler, /id="meeting-calendar-title">Choose a date/);
  assert.match(meetingScheduler, /className="meeting-date-rail"/);
  assert.match(meetingScheduler, /dateRailDays\.map/);
  assert.doesNotMatch(meetingScheduler, /Calendar month|Calendar year|Previous month|Next month|ChevronLeft|ChevronRight/);
  assert.match(meetingScheduler, /className=\{`meeting-scheduler \$\{activeSelectedDateKey \? 'has-selected-date' : ''\}`\}/);
  assert.match(indexCss, /\.meeting-date-rail,[\s\S]*\.meeting-time-rail\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(indexCss, /\.meeting-time-rail button\s*\{[^}]*border-radius:\s*999px[^}]*box-shadow:/);
  assert.match(indexCss, /\.meeting-date-rail button\s*\{[^}]*border-radius:\s*999px[^}]*box-shadow:/);
  assert.match(indexCss, /\.meeting-booking-fields input:not\(\[type="checkbox"\]\)\s*\{[^}]*border-radius:\s*999px/);
  assert.match(indexCss, /\.meeting-booking-fields textarea\s*\{[^}]*border-radius:\s*18px/);
  assert.match(indexCss, /\.meeting-floating-field:focus-within > span/);
  assert.match(indexCss, /:has\(input:not\(:placeholder-shown\)\)/);
  assert.match(meetingScheduler, /placeholder=" "/);
  assert.match(meetingScheduler, /disabled=\{!hasSlots\}/);
  assert.match(meetingScheduler, /activeSelectedDateKey && status !== 'loading'/);
  assert.match(meetingScheduler, /selectedDateSlots\.map/);
  assert.match(meetingScheduler, /\.sort\(\(left, right\) => Date\.parse\(left\.iso\) - Date\.parse\(right\.iso\)\)/);
  assert.match(meetingScheduler, /const firstAvailableDateKey = nextSlots\.map/);
  assert.match(meetingScheduler, /if \(firstAvailableDateKey\) selectDate\(firstAvailableDateKey\)/);
  assert.match(meetingScheduler, /slots\.length > 0 && \(/);
  assert.match(meetingScheduler, /className=\{`meeting-details-stage \$\{selectedSlot \? 'is-unlocked' : 'is-locked'\}`\}/);
  assert.match(meetingScheduler, /<fieldset className="meeting-booking-fields" disabled=\{!selectedSlot\}/);
  assert.match(meetingScheduler, /Choose a time to unlock/);
  assert.match(indexCss, /\.meeting-details-stage\.is-locked \.meeting-booking-fields\s*\{[^}]*pointer-events:\s*none/);
  assert.match(meetingScheduler, /Review and complete your details/);
  assert.doesNotMatch(meetingScheduler, /Company <small>\(optional\)<\/small>/);
  assert.match(meetingScheduler, /<span>Company<\/span><input required/);
  assert.match(meetingScheduler, /<span>Phone number<\/span><input required type="tel"/);
  assert.match(chatApp, /meetingSlots=\{meetingSlots\}/);
  assert.match(chatApp, /selectedDateKey=\{selectedMeetingDateKey\}/);
  assert.match(chatApp, /selectedSlotId=\{selectedMeetingSlotId\}/);
  assert.match(meetingScheduler, /onSlotsChange\?\.\(nextSlots\)/);
  assert.match(meetingScheduler, /onSlotSelect\?\.\(slot\)/);
  assert.match(animationPanel, /<BookingSummary/);
  assert.match(bookingSummary, /No meeting selected yet/);
  assert.match(bookingSummary, /Choose an available time/);
});

test('communicates availability, timezone conversion, progress, and mobile ordering', () => {
  assert.match(meetingScheduler, /Mon-Fri/);
  assert.match(meetingScheduler, /9:00-17:00/);
  assert.match(meetingScheduler, /Shown in/);
  assert.match(indexCss, /\.meeting-availability-card\s*\{[^}]*display:\s*flex[^}]*border-radius:\s*10px/s);
  assert.match(bookingSummary, /Your timezone/);
  assert.match(bookingSummary, /Company timezone/);
  assert.match(bookingSummary, /progressLabels = \['Choose date', 'Choose time', 'Details', 'Confirm'\]/);
  assert.match(meetingScheduler, /className="meeting-mobile-summary"/);
  assert.ok(meetingScheduler.indexOf('className={`meeting-details-stage') < meetingScheduler.indexOf('className="meeting-mobile-summary"'));
  assert.match(indexCss, /\.meeting-mobile-summary\s*\{\s*display:\s*none/);
  assert.match(indexCss, /@media \(max-width:\s*767px\)[\s\S]*\.meeting-mobile-summary\s*\{\s*display:\s*block/s);
  assert.match(indexCss, /\.is-booking-layout \.booking-summary-panel\s*\{\s*display:\s*none/);
  assert.ok(indexCss.indexOf('.meeting-date-rail button:disabled') < indexCss.indexOf('.meeting-date-rail button.is-today'));
});

test('keeps booking controls accessible and motion-sensitive', () => {
  assert.match(meetingScheduler, /aria-pressed=\{activeSelectedDateKey === dateKey\}/);
  assert.match(meetingScheduler, /aria-pressed=\{selectedSlot\?\.id === slot\.id\}/);
  assert.match(meetingScheduler, /requestAnimationFrame/);
  assert.match(meetingScheduler, /useReducedMotion/);
  assert.match(bookingSummary, /aria-live="polite"/);
  assert.match(indexCss, /\.meeting-date-rail button:focus-visible/);
  assert.match(indexCss, /\.meeting-time-rail button:focus-visible/);
});

test('keeps consent aligned and resumes normal chat after booking', () => {
  assert.match(indexCss, /\.meeting-consent\s*\{[^}]*align-items:\s*center/);
  assert.match(indexCss, /\.meeting-consent input\s*\{[^}]*margin:\s*0/);
  assert.match(chatApp, /handleModelPrompt\(userMessage\)/);
  assert.match(chatApp, /result\.action === "open_calendar"/);
  assert.match(chatApp, /activateMeetingScheduler\(\)/);
  assert.doesNotMatch(chatApp, /readOnly:\s*step === "scheduling"/);
  assert.doesNotMatch(chatApp, /if \(step === "scheduling" \|\| isTyping\) return/);
  assert.match(chatApp, /if \(step === "centered" \|\| step === "done"\) setStep\("company"\)/);
  assert.match(chatApp, /We have sent the invitation and meeting details to your email/);
  assert.doesNotMatch(chatApp, /Google Calendar has sent the invitation/);
});

test('removes obsolete numbered progress from dynamic project conversations', () => {
  assert.doesNotMatch(chatApp, /showDiscoveryProgress/);
  assert.doesNotMatch(chatApp, /className="step-dot"/);
});

test('centers chat, aligns the shared header, and distinguishes message roles', () => {
  assert.match(chatApp, /<header className="chat-header">/);
  assert.match(indexCss, /--conversation-max-width:\s*880px/);
  assert.match(indexCss, /\.chat-section\s*\{[^}]*max-width:\s*var\(--conversation-max-width\)[^}]*margin:\s*0 auto/s);
  assert.match(indexCss, /\.chat-header\s*\{[^}]*display:\s*flex[^}]*align-items:\s*center[^}]*justify-content:\s*space-between/s);
  assert.match(indexCss, /\.message-ai \.message-bubble\s*\{[^}]*background:\s*var\(--chat-ai-bg\)/s);
  assert.match(indexCss, /\.message-user \.message-bubble\s*\{[^}]*background:\s*var\(--chat-user-bg\)/s);
  assert.match(indexCss, /\.chat-input-wrapper \.input-container\s*\{\s*max-width:\s*none/);
});

test('renders contextual suggestions through the normal chat pipeline', () => {
  assert.match(chatApp, /aria-label="Suggested follow-up questions"/);
  assert.match(chatApp, /handleModelPrompt\(suggestion\.prompt,\s*\{/);
  assert.match(chatApp, /type:\s*"suggestion"/);
  assert.match(chatApp, /usedSuggestions:/);
  assert.match(chatApp, /suggestions:\s*result\.suggestions \|\| \[\]/);
  assert.match(chatApp, /suggestion\.kind === "discovery"/);
  assert.match(chatApp, /suggestion-context-label/);
  assert.match(indexCss, /\.company-suggestion-chips button\.is-discovery/);
});

test('uses a readable translucent booking surface', () => {
  assert.match(indexCss, /\.meeting-scheduler\s*\{[^}]*background:\s*rgba\(7, 24, 45, 0\.3[48]\)[^}]*backdrop-filter:\s*blur/s);
  assert.match(indexCss, /\.meeting-booking-fields\s*\{[^}]*background:\s*rgba\(8, 26, 49, 0\.42\)[^}]*backdrop-filter:\s*blur/s);
});

test('enters chat mode before waiting for the Gemini response', () => {
  const handlerStart = chatApp.indexOf('const handleModelPrompt = async');
  const handlerEnd = chatApp.indexOf('const handleProposalPrompt = async');
  const modelHandler = chatApp.slice(handlerStart, handlerEnd);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  assert.ok(modelHandler.indexOf('if (step === "centered") setStep("triage")') >= 0);
  assert.ok(
    modelHandler.indexOf('setStep("triage")') < modelHandler.indexOf('fetch("/api/chat"'),
    'chat mode should render before the model request completes',
  );
});

test('presents Gemini answers with topic, lead, points, and a separated follow-up', () => {
  assert.match(typewriterText, /className="answer-topic"/);
  assert.match(typewriterText, /className="answer-lead"/);
  assert.match(typewriterText, /className="answer-points"/);
  assert.match(typewriterText, /className="answer-follow-up"/);
  assert.match(chatApp, /topic=\{msg\.companyTopic\}/);
  assert.match(typewriterText, /const sentenceCount = sentences\.length/);
  assert.match(typewriterText, /const body = lead \? sentences\.join\(' '\) : ''/);
  assert.match(typewriterText, /bullets\.slice\(0, 8\)/);
  assert.match(typewriterText, /const bulletPattern/);
  assert.match(typewriterText, /target="_blank" rel="noopener noreferrer"/);
  assert.match(indexCss, /\.answer-presentation a\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

test('routes project evidence to a verified visual portfolio with real media', () => {
  assert.match(chatApp, /const resolvedCompanyTopic/);
  assert.match(chatApp, /const verifiedCompanyTopic/);
  assert.match(chatApp, /verifiedCompanyTopic \|\| result\.topic/);
  assert.match(typewriterText, /answer-presentation/);
  assert.match(indexCss, /\.portfolio-card-rail/);
  assert.match(indexCss, /scroll-snap-type:\s*x mandatory/);
  assert.match(companyKnowledgePanel, /function PortfolioPanel/);
  assert.match(companyKnowledgePanel, /case-study-food-manufacturing\.jpg/);
  assert.match(companyKnowledgePanel, /portfolio\/chauffr\.jpg/);
});

test('opens the existing scheduler from an AI qualification action', () => {
  assert.match(chatApp, /action\.type === "open_booking"/);
  assert.match(chatApp, /handleOpenMeetingScheduler\(\)/);
  assert.match(chatApp, /conversation: requestConversation/);
  assert.match(chatApp, /setConversationMemory\(result\.conversation\)/);
  assert.match(animationPanel, /conversationSummary/);
});

test('uses accessible peek accordions for capabilities, methodology, and services', () => {
  assert.equal((interactiveContent.match(/className="peek-accordion"/g) || []).length, 3);
  assert.match(interactiveContent, /aria-label="DEKODE capabilities"/);
  assert.match(interactiveContent, /aria-label="DEKODE delivery stages"/);
  assert.match(interactiveContent, /aria-label="DEKODE services by industry"/);
  assert.match(interactiveContent, /aria-expanded=\{item\.id === activeCapability\}/);
  assert.match(interactiveContent, /current === item\.id \? null : item\.id/);
  assert.match(interactiveStyles, /\.peek-panel\s*\{[^}]*grid-template-rows:\s*0fr/s);
  assert.match(interactiveStyles, /\.peek-item\.is-open \.peek-panel\s*\{[^}]*grid-template-rows:\s*1fr/s);
  assert.match(interactiveStyles, /@media \(max-width: 600px\)[\s\S]*\.capability-peek-content,[\s\S]*\.industry-peek-content\s*\{[^}]*grid-template-columns:\s*1fr/);
});

test('renders verified work as a transparent inline peek accordion', () => {
  assert.match(chatApp, /className="is-artifact"/);
  assert.match(chatApp, /<InlinePortfolioAccordion artifact=\{artifact\}/);
  assert.doesNotMatch(inlinePortfolioAccordion, /item\.summary|item\.detail/);
  assert.match(indexCss, /\.inline-work-stack\s*\{[^}]*border-top:/s);
  assert.match(indexCss, /\.inline-work-artifact,[\s\S]*\.inline-work-content\s*\{\s*background:\s*transparent;/);
  assert.match(indexCss, /\.inline-work-panel\s*\{[^}]*grid-template-rows:\s*0fr/s);
  assert.match(indexCss, /\.inline-work-item\.is-open \.inline-work-panel\s*\{[^}]*grid-template-rows:\s*1fr/s);
});

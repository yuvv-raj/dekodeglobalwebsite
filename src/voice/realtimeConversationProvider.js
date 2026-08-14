import {
  generateCompanyResponse,
  getSensitiveRequestRefusal,
} from '../knowledge/index.js';
import { classifyVoiceIntent } from './voiceIntentClassifier.js';
import { extractLeadProfile, getNextQualificationQuestion } from './leadQualificationManager.js';

const OPENING = "Hi, I’m DEKODE Voice, an AI assistant. I can explain DEKODE’s services, explore your project idea, recommend relevant capabilities, or help prepare a conversation with our team. What are you working on?";

export class KnowledgeConversationProvider {
  getOpening() {
    return OPENING;
  }

  async respond(message, context) {
    const classification = classifyVoiceIntent(message, context);
    const leadProfile = extractLeadProfile(message, context.leadProfile);

    if (classification.isCompanyRelated) {
      const response = generateCompanyResponse(message, classification);
      return { ...response, intent: classification.intent, leadProfile };
    }
    if (classification.intent === 'sensitive_refusal') {
      return {
        text: getSensitiveRequestRefusal(message),
        topic: 'company', panel: 'overview', intent: classification.intent, leadProfile,
      };
    }
    if (classification.intent === 'greeting') {
      return { text: OPENING, topic: 'company', panel: 'overview', intent: 'greeting', leadProfile };
    }
    if (classification.intent === 'pricing_interest') {
      return {
        text: 'I do not have an approved fixed price for that service. The scope would need to be reviewed by the DEKODE team. If you describe the outcome and current system, I can help prepare a useful enquiry.',
        topic: 'project', panel: 'services', intent: classification.intent, leadProfile,
      };
    }
    if (classification.intent === 'meeting_interest') {
      return {
        text: 'I can help you choose a preferred meeting time. This will create a request only; the DEKODE team will confirm availability after you review and submit your details.',
        topic: 'meeting', panel: 'meeting', intent: classification.intent, leadProfile: { ...leadProfile, meetingInterest: true }, action: 'offer_meeting',
      };
    }
    if (classification.intent === 'meeting_project_clarification') {
      return {
        text: 'I can help either way. Are you trying to arrange time with DEKODE, or add meeting and scheduling functionality to something you are building?',
        topic: 'project', panel: 'services', intent: classification.intent, leadProfile,
      };
    }
    if (classification.intent === 'project_discussion' || classification.intent === 'timeline_interest') {
      const services = leadProfile.recommendedServices;
      const recommendation = services.length
        ? `Based on that, the most relevant confirmed DEKODE capabilities appear to be ${services.join(', ')}.`
        : 'DEKODE can help shape the right combination of product design, development, AI, automation, and cloud services once the problem is clear.';
      return {
        text: `${recommendation} ${getNextQualificationQuestion(leadProfile)}`,
        topic: 'project', panel: 'recommendations', intent: classification.intent, leadProfile,
      };
    }
    return {
      text: 'I’m focused on approved information about DEKODE and on helping explore digital project requirements. I can explain our services, technologies, process, or help shape an enquiry.',
      topic: 'company', panel: 'overview', intent: 'unrelated_question', leadProfile,
    };
  }
}

export { OPENING };

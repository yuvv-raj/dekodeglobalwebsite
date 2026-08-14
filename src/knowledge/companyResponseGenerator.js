import { loadCompanyKnowledge } from './companyKnowledgeLoader.js';
import { findNamedOffering, findSolutionArea } from './knowledgeIndex.js';
import { getPanelForTopic } from './visualPanelMapper.js';
import { getSuggestedQuestions } from './suggestedQuestionGenerator.js';
import { getKnowledgeGapResponse } from './knowledgeGapResponse.js';
import { normalizeVisitorMessage } from './messageNormalization.js';

const knowledge = loadCompanyKnowledge();
const bullets = (items) => items.map((item) => `- ${item}`).join('\n');

function findLegalSection(document, message) {
  const input = message.toLowerCase();
  return document.sections.find((section) => {
    const title = section.title.toLowerCase();
    const meaningfulWords = title.split(/\s+/).filter((word) => word.length > 3);
    return input.includes(title) || meaningfulWords.length > 0 && meaningfulWords.every((word) => input.includes(word));
  });
}

function responseForTopic(topic, message, detectedService, detectedSolutionArea, detectedCaseStudy, detectedInitiative, detectedDevelopmentStep) {
  const normalizedMessage = normalizeVisitorMessage(message);
  const service = detectedService || findNamedOffering(message);
  const solutionArea = detectedSolutionArea || findSolutionArea(message);
  const portfolioProject = knowledge.portfolioProjects?.find((project) =>
    message.toLowerCase().includes(project.name.toLowerCase()),
  );
  const asksForPortfolio = /\b(?:projects?|portfolio|past work|previous work|show me (?:some of )?(?:your )?work|what (?:have|has) you built|what work (?:have you done|did you do))\b/i.test(normalizedMessage);

  if (detectedInitiative) {
    const regions = detectedInitiative.regions
      .map((region) => `${region.name}: ${region.description}`)
      .join('\n');
    return `${detectedInitiative.title} is a DEKODE initiative currently marked ${detectedInitiative.status.toLowerCase()}. ${detectedInitiative.summary}\n\n${regions}\n\nIts published pillars are ${detectedInitiative.pillars.join(', ')}.`;
  }

  if (portfolioProject) {
    return `${portfolioProject.name} is part of DEKODE's verified portfolio. ${portfolioProject.description}`;
  }

  if (solutionArea) {
    const parentService = knowledge.services.find((item) => item.id === solutionArea.serviceId);
    return `${solutionArea.name} is a DEKODE solution area. ${solutionArea.summary}\n\nIt sits within ${parentService?.name || 'DEKODE services'}. A useful first step is to define the users, desired outcome, available data or systems, and the safeguards the solution needs.`;
  }

  if (/\bsaas\b/i.test(message) && !service) {
    const webService = knowledge.services.find((item) => item.id === 'web-mobile');
    return `DEKODE's public company profile does not specifically name SaaS as a separate offering, so I do not want to overstate it.\n\nThe closest confirmed capability is ${webService.name}: ${webService.summary}\n\nThat service covers web applications, dashboards, internal portals, UX/UI design, and production-ready delivery.`;
  }

  if (topic === 'services' && service) {
    return `${service.name} is one of DEKODE's core services. ${service.summary}\n\nIt includes:\n${bullets(service.capabilities.slice(0, 5))}\n\nIt is designed for ${service.audience.charAt(0).toLowerCase()}${service.audience.slice(1)}`;
  }

  switch (topic) {
    case 'services':
      return `DEKODE brings strategy, build, infrastructure, security, and ongoing support together in one delivery partner.\n\nOur core services are:\n${bullets(knowledge.services.map((item) => item.name))}\n\nWhich area would you like to explore?`;
    case 'ai': {
      const aiServices = knowledge.services.filter((item) => /AI/i.test(item.name));
      return `Yes. DEKODE helps businesses adopt AI from strategy through production.\n\n${bullets(aiServices.map((item) => `${item.name}: ${item.summary}`))}\n\nThat includes custom machine learning, generative AI, internal copilots, intelligent search, knowledge systems, and AI-powered workflow tools.`;
    }
    case 'industries':
      return `DEKODE partners with small and medium businesses that want technology to solve real problems without creating new ones.\n\nIndustries named in our company profile include:\n${bullets(knowledge.industries)}\n\nOur approach is adapted to each organisation's workflows, constraints, and goals.`;
    case 'technologies':
      return `DEKODE chooses technology around the problem, with reliability, security, and maintainability in mind.\n\nThe platforms explicitly named in our company profile are:\n${bullets(knowledge.technologies)}\n\nWe also build with AI, machine learning, generative AI, APIs, mobile and web technologies. The public profile does not list a more detailed framework-by-framework stack.`;
    case 'process':
      if (detectedDevelopmentStep) {
        return `${detectedDevelopmentStep.name} is one of the six connected stages in DEKODE's delivery methodology. ${detectedDevelopmentStep.description}`;
      }
      return `DEKODE uses a simple, risk-reducing delivery methodology:\n\n${bullets(knowledge.developmentProcess.map((step) => `${step.name}: ${step.description}`))}\n\nSecurity, privacy, and maintainability apply throughout, from early validation to ongoing improvement.`;
    case 'caseStudies': {
      const namedStudy = detectedCaseStudy || knowledge.caseStudies.find((item) => {
        const input = message.toLowerCase();
        return input.includes(item.name.toLowerCase()) ||
          input.includes(item.id.replaceAll('-', ' ')) ||
          item.aliases?.some((alias) => input.includes(alias.toLowerCase())) ||
          item.id === 'primary-school' && input.includes('attendme');
      });
      if (namedStudy) {
        if (/\b(platform|cloud|host|hosting|aws|azure)\b/i.test(message)) {
          return `${namedStudy.name} used ${namedStudy.platform} as its published solution platform.`;
        }
        return `${namedStudy.name} is a published DEKODE case study in ${namedStudy.industry}.\n\nChallenge: ${namedStudy.challenge}\n\nSolution: ${namedStudy.solution}\n\nOutcome: ${namedStudy.outcome}`;
      }
      if (asksForPortfolio) {
        return `DEKODE's verified public portfolio includes:\n\n${bullets((knowledge.portfolioProjects || []).map((item) => `${item.name}: ${item.description}`))}\n\nPublished case studies:\n${bullets((knowledge.caseStudies || []).map((item) => `${item.name} (${item.industry}): ${item.outcome}`))}`;
      }
      return `DEKODE currently presents two published success stories:\n\n${bullets(knowledge.caseStudies.map((item) => `${item.name} (${item.industry}): ${item.outcome}`))}\n\nThese are the case studies confirmed in the public company information.`;
    }
    case 'why':
      if (/\bstar\b/i.test(message)) {
        return `DEKODE's STAR principles are **Simple, Transparent, Accountable, and Reliable**. They describe how we communicate, deliver, take ownership, and build dependable systems.`;
      }
      return `DEKODE is built around practical delivery, clear communication, and long-term accountability.\n\nWhat makes us different:\n${bullets(knowledge.whyChooseUs.map((item) => `${item.name}: ${item.description}`))}\n\nWe focus on useful outcomes, not technology hype.`;
    case 'origin':
      return knowledge.company.origin;
    case 'leadership': {
      const founder = knowledge.company.leadership.founder;
      return `Pankaj Banga is DEKODE's founder. DEKODE's published company content confirms his name and role, but does not provide a longer biography, so I won't add unsupported personal details.\n\nLinkedIn: ${founder.linkedin}`;
    }
    case 'contact':
      return `You can reach DEKODE at ${knowledge.contact.email}.\n\nAustralia: ${knowledge.contact.phoneLabels[0]}\nIndia: ${knowledge.contact.phoneLabels[1]}\nWhatsApp: ${knowledge.contact.phoneLabels[0]}\n\nTell us what you are exploring and we will help recommend a practical next step.`;
    case 'location':
      return `${knowledge.contact.operatingModel}\n\n${bullets(knowledge.contact.locations.map((location) => `${location.country}: ${location.address}`))}`;
    case 'privacy': {
      const section = findLegalSection(knowledge.legal.privacy, message);
      if (section) return `${section.title}\n\n${section.summary}`;
      return `${knowledge.legal.privacy.summary}\n\nThe policy covers:\n${bullets(knowledge.legal.privacy.sections.map((section) => section.title))}\n\nFor privacy questions or requests, contact ${knowledge.legal.privacy.contactEmail}.`;
    }
    case 'terms': {
      const section = findLegalSection(knowledge.legal.terms, message);
      if (section) return `${section.title}\n\n${section.summary}`;
      return `${knowledge.legal.terms.summary}\n\nThe terms cover:\n${bullets(knowledge.legal.terms.sections.map((section) => section.title))}\n\nThe full terms are available in the Company information section below.`;
    }
    case 'company':
    default:
      return `${knowledge.company.about}\n\nIn short, DEKODE combines:\n${bullets(['AI strategy and custom AI', 'Web and mobile products', 'E-commerce, integrations, and automation', 'Cloud, managed IT, and security'])}\n\n${knowledge.company.belief}`;
  }
}

export function generateCompanyResponse(message, intent) {
  const topic = intent.topic || 'company';
  const text = getKnowledgeGapResponse(message) ||
    responseForTopic(
      topic,
      message,
      intent.service,
      intent.solutionArea,
      intent.caseStudy,
      intent.initiative,
      intent.developmentStep,
    );
  return {
    text,
    topic,
    panel: getPanelForTopic(topic),
    suggestions: getSuggestedQuestions(topic),
  };
}

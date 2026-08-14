import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  CheckCircle2,
  Bot,
  Mic,
  CalendarDays,
  ChevronDown,
  LockKeyhole,
  Sparkles,
  Images,
  X,
} from "lucide-react";
import AnimationPanel from "./AnimationPanel";
import CompanyKnowledgePanel from "./CompanyKnowledgePanel";
import ParticleBackground from "./ParticleBackground";
import TypewriterText, { FormattedText } from "./TypewriterText";
import HeroScenery from "./HeroScenery";
// import PlaneBanner from "./PlaneBanner";
import DekodeVoiceEntry from "./voice/DekodeVoiceEntry";
import DekodeVoiceSession from "./voice/DekodeVoiceSession";
import MeetingScheduler from "./MeetingScheduler";
import InlinePortfolioAccordion from "./InlinePortfolioAccordion";
import { voiceConfig } from "../voice/config";
import { BrowserSpeechToTextProvider } from "../voice/providers/browserSpeechToTextProvider";
import { placeholderInterval, placeholderMessages } from "./chatComposerConfig";
import { PROJECT_OPTIONS } from "../config/projectOptions";
import {
  beginConversationTurn,
  buildConversationDirective,
  buildProjectConversationQuery,
  classifyCompanyIntent,
  createConversationMemory,
  completeConversationTurn,
  createCompanyConversationContext,
  generateCompanyResponse,
  generateProjectResponse,
  getSensitiveRequestRefusal,
  markBookingInitiated,
  rememberCompanyTurn,
} from "../knowledge";
import {
  publishSessionSummary,
  subscribeToContentChat,
  subscribeToVoiceOpen,
} from "../content/ContentToChatBridge";
import { toLocalDateKey } from "../utils/calendarPresentation";
import { cleanAssistantText, buildCleanProjectSummary } from "../utils/assistantText";

function getTimeAwareGreeting(date = new Date()) {
  const hour = date.getHours();
  let options = [];

  if (hour >= 0 && hour < 4) {
    options = [
      "Quiet hours for deep focus. Ready to strategize?",
      "Building the future of AI, no matter the hour.",
      "Late-night breakthrough? Let's refine your strategy."
    ];
  } else if (hour >= 4 && hour < 8) {
    options = [
      "A fresh start. Let's map out your AI transformation.",
      "Early focus. What strategic goals are we tackling today?",
      "Starting early? Let's align your technology with your vision."
    ];
  } else if (hour >= 8 && hour < 12) {
    options = [
      "Building momentum. What's the main focus today?",
      "Making good progress? Let's keep the productivity flowing.",
      "Let's drive your digital transformation forward today."
    ];
  } else if (hour >= 12 && hour < 16) {
    options = [
      "Midday check-in. Ready to scale your AI infrastructure?",
      "Let's maintain focus and optimize your workflows.",
      "Ready to elevate your business strategy today?"
    ];
  } else if (hour >= 16 && hour < 20) {
    options = [
      "Reviewing progress. How can we refine your AI models?",
      "Great work today. Let's plan the next strategic move.",
      "Wrapping up? Let's ensure your infrastructure is secure."
    ];
  } else {
    options = [
      "Focused on the future. What are we building next?",
      "The world slows down, but innovation doesn't.",
      "Late hours. A perfect time for strategic planning."
    ];
  }

  // Shuffle: Pick a random greeting from the available options
  return options[Math.floor(Math.random() * options.length)];
}

const PROJECT_OPTION_ROWS = [
  PROJECT_OPTIONS,
];

export const SUPPORTING_VISUAL_PANEL_ENABLED = false;

export default function ChatApp({
  proposalContext = null,
  proposalChatEnabled = true,
  onOpenProposalAccess,
  onExitProposal,
  onProposalSection,
  onProposalClarification,
  onCloseProposalChat,
  onChatModeChange,
  isProposalChatOpen = false,
}) {
  const [messages, setMessages] = useState([]);
  const [conversationMemory, setConversationMemory] = useState(() => createConversationMemory());
  const [realTime, setRealTime] = useState(() => {
    // Start 6 hours in the past to trigger the entrance animation
    const d = new Date();
    d.setHours(d.getHours() - 3);
    return d;
  });

  const timeOfDay = useMemo(() => {
    const hour = realTime.getHours();
    if (hour >= 4 && hour < 7) return "dawn";
    if (hour >= 7 && hour < 10) return "morning";
    if (hour >= 10 && hour < 15) return "noon";
    if (hour >= 15 && hour < 18) return "golden";
    if (hour >= 18 && hour < 20) return "evening";
    if (hour >= 20 && hour < 24) return "night";
    return "latenight";
  }, [realTime]);

  // Animate to current time on load, then monitor real time
  useEffect(() => {
    // Trigger the initial arrival animation after the page settles (starts quickly)
    const initialTimer = setTimeout(() => {
      setRealTime(new Date());
    }, 600);

    // Check the real time every minute so it naturally changes if they leave the tab open
    const realTimeChecker = setInterval(() => {
      setRealTime(new Date());
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(realTimeChecker);
    };
  }, []);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceTypingState, setVoiceTypingState] = useState("idle");
  const heroGreeting = useMemo(() => getTimeAwareGreeting(), []);

  // States: 'centered' (hero), 'active' (chatting)
  const [step, setStep] = useState("centered");
  const [projectType, setProjectType] = useState(null);
  const [gatheredTags, setGatheredTags] = useState([]);
  const [companyPanel, setCompanyPanel] = useState(null);
  const [meetingSlots, setMeetingSlots] = useState([]);
  const [selectedMeetingDateKey, setSelectedMeetingDateKey] = useState("");
  const [selectedMeetingSlotId, setSelectedMeetingSlotId] = useState(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isVisualPanelExpanded, setIsVisualPanelExpanded] = useState(false);
  const [expandedArtifactMessages, setExpandedArtifactMessages] = useState(() => new Set());
  const [isCompactLayout, setIsCompactLayout] = useState(
    () => window.matchMedia("(max-width: 1180px)").matches,
  );

  const scrollRef = useRef(null);
  const composerRef = useRef(null);
  const companyContextRef = useRef(createCompanyConversationContext());
  const speechProviderRef = useRef(null);
  const committedTranscriptRef = useRef("");
  const voiceStatusTimerRef = useRef(null);

  useEffect(() => {
    onChatModeChange?.(step !== "centered");
  }, [onChatModeChange, step]);

  useEffect(() => {
    if (proposalContext) {
      setMessages([
        {
          id: Date.now(),
          sender: "ai",
          text: "Your proposal is open. Ask me about its process, workflow, constraints, or prototype.",
        },
      ]);
      setExpandedArtifactMessages(new Set());
      setStep("proposal");
      setCompanyPanel(null);
      companyContextRef.current = createCompanyConversationContext();
    } else if (step === "proposal") {
      setMessages([]);
      setExpandedArtifactMessages(new Set());
      setStep("centered");
    }
  // The transition is intentionally keyed only to proposal identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalContext?.id]);

  useEffect(() => {
    speechProviderRef.current = new BrowserSpeechToTextProvider();
    return () => {
      speechProviderRef.current?.stop();
      if (voiceStatusTimerRef.current)
        clearTimeout(voiceStatusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isProposalChatOpen) return undefined;
    const focusTimer = window.setTimeout(() => composerRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [isProposalChatOpen]);

  useEffect(() => {
    const focusChatWithDraft = (event) => {
      const prompt = event.detail?.suggestedPrompt;
      if (!prompt) return;
      setInputValue(prompt);
      document.querySelector(".app-container")?.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      window.requestAnimationFrame(() => composerRef.current?.focus());
    };
    const openVoice = () => {
      document.querySelector(".app-container")?.scrollTo({ top: 0, behavior: "auto" });
      setIsVoiceOpen(true);
    };
    const unsubscribeChat = subscribeToContentChat(focusChatWithDraft);
    const unsubscribeVoice = subscribeToVoiceOpen(openVoice);
    return () => {
      unsubscribeChat();
      unsubscribeVoice();
    };
  }, []);

  useEffect(() => {
    if (!projectType) {
      publishSessionSummary("");
      return;
    }
    const details = gatheredTags.slice(1, 3);
    publishSessionSummary(
      details.length
        ? `You are exploring a ${projectType.toLowerCase()} with ${details.join(" and ")}.`
        : `You are exploring a ${projectType.toLowerCase()} with DEKODE.`,
    );
  }, [projectType, gatheredTags]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const voiceTypingActive = ['requesting', 'listening', 'processing'].includes(voiceTypingState);
    if (
      step !== "centered" ||
      isInputFocused ||
      inputValue ||
      voiceTypingActive ||
      reduceMotion.matches
    )
      return undefined;

    const intervalId = window.setInterval(() => {
      setPlaceholderIndex(
        (current) => (current + 1) % placeholderMessages.length,
      );
    }, placeholderInterval);

    return () => window.clearInterval(intervalId);
  }, [isInputFocused, inputValue, step, voiceTypingState]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, step, isListening]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1180px)");
    const updateLayoutMode = (event) => setIsCompactLayout(event.matches);
    media.addEventListener("change", updateLayoutMode);
    return () => media.removeEventListener("change", updateLayoutMode);
  }, []);

  useEffect(() => {
    const constrainedHeight = window.matchMedia("(max-height: 640px)");
    const collapseForKeyboardOrLandscape = (event) => {
      if (event.matches) setIsVisualPanelExpanded(false);
    };
    collapseForKeyboardOrLandscape(constrainedHeight);
    constrainedHeight.addEventListener(
      "change",
      collapseForKeyboardOrLandscape,
    );
    return () =>
      constrainedHeight.removeEventListener(
        "change",
        collapseForKeyboardOrLandscape,
      );
  }, []);

  const respondWithoutProject = (userMessage, responseText) => {
    const intent = classifyCompanyIntent(userMessage, companyContextRef.current);
    const turn = beginConversationTurn(conversationMemory, userMessage, intent.kind);
    const directive = buildConversationDirective(turn);
    setConversationMemory(completeConversationTurn(turn, responseText, directive));
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: userMessage },
      { id: Date.now() + 1, sender: "ai", text: responseText },
    ]);
    setStep("triage");
    setProjectType(null);
    setCompanyPanel(null);
  };

  const startConversation = (initialMessage) => {
    handleModelPrompt(initialMessage);
  };

  const handleOptionSelect = (option) => {
    startConversation(option);
  };

  const activateMeetingScheduler = () => {
    setCompanyPanel(null);
    setProjectType('Discovery Call');
    setGatheredTags(['Meeting']);
    setMeetingSlots([]);
    setSelectedMeetingDateKey("");
    setSelectedMeetingSlotId(null);
    setConversationMemory((current) => {
      const next = markBookingInitiated(current);
      console.info('[DEKODE Chat] booking initiated', next.sessionId.slice(0, 12));
      return next;
    });
    setStep('scheduling');
  };

  const handleOpenMeetingScheduler = (requestedByUser = '') => {
    const userMessage = typeof requestedByUser === 'string' ? requestedByUser.trim() : '';
    activateMeetingScheduler();
    setMessages((current) => [
      ...current,
      ...(userMessage ? [{ id: Date.now(), sender: 'user', text: userMessage }] : []),
      {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'Here is our live calendar availability. Choose a date and time that works for you.',
      },
    ]);
  };

  const handleMeetingSlotsChange = useCallback((nextSlots) => {
    setMeetingSlots(nextSlots);
    setSelectedMeetingDateKey((currentKey) => (
      nextSlots.some((slot) => toLocalDateKey(slot.iso) === currentKey) ? currentKey : ""
    ));
    setSelectedMeetingSlotId((currentId) => (
      nextSlots.some((slot) => slot.id === currentId) ? currentId : null
    ));
  }, []);

  const handleMeetingSlotSelect = useCallback((slot) => {
    setSelectedMeetingSlotId(slot?.id || null);
  }, []);

  const handleMeetingDateSelect = useCallback((dateKey) => {
    setSelectedMeetingDateKey(dateKey || "");
  }, []);

  const handleCompanyPrompt = async (userMessage) => {
    if (!userMessage.trim() || isTyping) return;

    const intent = classifyCompanyIntent(
      userMessage,
      companyContextRef.current,
    );
    const fallbackResponse = generateCompanyResponse(userMessage, {
      ...intent,
      isCompanyRelated: true,
      topic: intent.topic || companyContextRef.current.lastTopic || "company",
    });
    const fallbackTurn = beginConversationTurn(conversationMemory, userMessage, intent.kind);
    const fallbackDirective = buildConversationDirective(fallbackTurn);

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: userMessage },
    ]);
    if (step === "centered" || step === "done") setStep("company");
    companyContextRef.current = rememberCompanyTurn(
      companyContextRef.current,
      fallbackResponse.topic,
    );
    setCompanyPanel(fallbackResponse);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          conversation: conversationMemory,
          usedSuggestions: messages
            .flatMap((message) => message.suggestions || [])
            .map((suggestion) => suggestion.label)
            .slice(-8),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.answer) throw new Error(result.error);
      if (result.conversation) setConversationMemory(result.conversation);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "ai",
          text: cleanAssistantText(result.answer),
          companyTopic: fallbackResponse.topic,
          suggestions: result.suggestions || [],
          actions: result.actions || [],
          artifacts: result.artifacts || [],
        },
      ]);
    } catch {
      setConversationMemory(completeConversationTurn(
        fallbackTurn,
        fallbackResponse.text,
        fallbackDirective,
      ));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "ai",
          text: cleanAssistantText(fallbackResponse.text),
          companyTopic: fallbackResponse.topic,
          suggestions: [],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleModelPrompt = async (userMessage, interaction = null) => {
    if (!userMessage.trim() || isTyping) return;
    const requestConversation = conversationMemory;
    setMessages((current) => [
      ...current,
      { id: Date.now(), sender: "user", text: userMessage },
    ]);
    if (step === "centered") setStep("triage");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          conversation: requestConversation,
          usedSuggestions: messages
            .flatMap((message) => message.suggestions || [])
            .map((suggestion) => suggestion.label)
            .slice(-8),
          interaction,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.answer) throw new Error(result.error);
      if (result.conversation) setConversationMemory(result.conversation);

      const visualIntent = classifyCompanyIntent(userMessage, companyContextRef.current);
      const verifiedCompanyTopic = visualIntent.kind === "company" && visualIntent.topic;
      if (result.action === "open_calendar") {
        activateMeetingScheduler();
      } else if (verifiedCompanyTopic || result.action === "show_company_panel" || [
        "company_info", "pricing", "case_study", "methodology",
      ].includes(result.intent)) {
        const verifiedTopicFallback = verifiedCompanyTopic || result.topic;
        const resolvedCompanyTopic = result.intent === "case_study"
          ? "caseStudies"
          : result.topic || verifiedTopicFallback || "company";
        const company = generateCompanyResponse(userMessage, {
          ...visualIntent,
          isCompanyRelated: true,
          topic: resolvedCompanyTopic,
        });
        companyContextRef.current = rememberCompanyTurn(companyContextRef.current, company.topic);
        setProjectType(null);
        setCompanyPanel(company);
        setStep("company");
      } else if (result.action === "show_project_panel" || result.intent === "project_build") {
        const project = generateProjectResponse(buildProjectConversationQuery(
          userMessage,
          requestConversation.recentMessages,
        ));
        setCompanyPanel(null);
        setProjectType(project.projectType);
        setGatheredTags([project.projectType]);
        setStep("project");
      } else if (!["scheduling", "done"].includes(step)) {
        setCompanyPanel(null);
        setProjectType(null);
        setStep("triage");
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: cleanAssistantText(result.answer),
          companyTopic: result.topic,
          suggestions: result.suggestions || [],
          actions: result.actions || [],
          artifacts: result.artifacts || [],
        },
      ]);
    } catch {
      const intent = classifyCompanyIntent(userMessage, companyContextRef.current);
      const fallback = intent.kind === "project"
        ? generateProjectResponse(buildProjectConversationQuery(userMessage, requestConversation.recentMessages))
        : generateCompanyResponse(userMessage, intent);
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, sender: "ai", text: cleanAssistantText(fallback.text) },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleProposalPrompt = async (userMessage) => {
    if (!userMessage.trim() || isTyping || !proposalChatEnabled) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: userMessage },
    ]);
    setIsTyping(true);
    try {
      const response = await fetch("/api/proposals/query", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: userMessage }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "ai",
          text: cleanAssistantText(result.answer),
          proposalSource: result.source,
          clarificationQuestion: result.canRequestClarification
            ? userMessage
            : null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "ai",
          text: "I could not access the approved proposal content. Please sign in again or contact the DEKODE team.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (isTyping) return;
    if (isListening) {
      speechProviderRef.current?.stop();
      setIsListening(false);
      setVoiceTypingState("idle");
      setVoiceStatus("");
    }

    // Trigger send pulse animation
    setIsSending(true);
    setTimeout(() => setIsSending(false), 300);

    const userMessage = inputValue;
    setInputValue("");

    if (proposalContext) {
      handleProposalPrompt(userMessage);
      return;
    }

    const safetyAnswer = getSensitiveRequestRefusal(userMessage);
    if (safetyAnswer) {
      respondWithoutProject(userMessage, safetyAnswer);
      return;
    }

    handleModelPrompt(userMessage);
  };

  const handleMeetingBooked = (_result, slot) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: `Discovery call booked for ${slot.label}` },
      {
        id: Date.now() + 1,
        sender: "ai",
        text: "Your discovery call is confirmed. We have sent the invitation and meeting details to your email.",
      },
    ]);
    setStep("done");
  };

  const showVoiceStatus = (message, persist = false) => {
    if (voiceStatusTimerRef.current) clearTimeout(voiceStatusTimerRef.current);
    setVoiceStatus(message);
    if (!persist) {
      voiceStatusTimerRef.current = window.setTimeout(
        () => setVoiceStatus(""),
        5000,
      );
    }
  };

  const formatRecognitionError = (error) => {
    const code = String(error?.message || error || "").toLowerCase();
    if (
      code.includes("not-allowed") ||
      code.includes("permission") ||
      code.includes("denied")
    ) {
      return "Microphone permission was denied. You can keep typing instead.";
    }
    if (
      code.includes("audio-capture") ||
      code.includes("unavailable") ||
      code.includes("notfound")
    ) {
      return "No microphone is available. You can keep typing instead.";
    }
    if (code.includes("no-speech")) {
      return "No speech was detected. Try again or keep typing.";
    }
    if (code.includes("aborted")) {
      return "Voice typing was cancelled.";
    }
    if (code.includes("network")) {
      return "Voice recognition timed out. Try again or keep typing.";
    }
    return "Voice typing stopped unexpectedly. You can keep typing instead.";
  };

  const handleSpeech = async () => {
    const provider = speechProviderRef.current;
    if (!provider?.isSupported()) {
      setVoiceTypingState("unsupported");
      showVoiceStatus("Voice typing is not supported in this browser.");
      return;
    }

    if (isListening) {
      provider.stop();
      setIsListening(false);
      setVoiceTypingState("stopped");
      showVoiceStatus("Voice typing stopped.");
      return;
    }

    setVoiceTypingState("requesting");
    showVoiceStatus("Requesting microphone access…", true);
    try {
      await provider.requestPermission();
      committedTranscriptRef.current = inputValue.trim();
      provider.start({
        onInterim: (transcript) => {
          const prefix = committedTranscriptRef.current;
          setInputValue(prefix ? `${prefix} ${transcript}` : transcript);
        },
        onFinal: (transcript) => {
          setVoiceTypingState("processing");
          const prefix = committedTranscriptRef.current;
          const nextValue = prefix ? `${prefix} ${transcript}` : transcript;
          committedTranscriptRef.current = nextValue;
          setInputValue(nextValue);
        },
        onError: (error) => {
          setIsListening(false);
          setVoiceTypingState("error");
          showVoiceStatus(formatRecognitionError(error));
        },
        onEnd: () => {
          setIsListening(false);
          setVoiceTypingState("idle");
          setVoiceStatus((current) =>
            current === "Listening…" ? "" : current,
          );
        },
      });
      setIsListening(true);
      setVoiceTypingState("listening");
      showVoiceStatus("Listening…", true);
    } catch (error) {
      setIsListening(false);
      setVoiceTypingState("error");
      showVoiceStatus(formatRecognitionError(error));
    }
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    if (isListening) committedTranscriptRef.current = event.target.value.trim();
  };

  const renderComposerInput = ({
    readOnly = false,
    autoFocus = false,
  } = {}) => (
    <div className="chat-input-field">
      {step === "centered" && !inputValue && !readOnly && (
        <span
          key={placeholderMessages[placeholderIndex]}
          className="rotating-placeholder"
          aria-hidden="true"
        >
          {placeholderMessages[placeholderIndex]}
        </span>
      )}
      <textarea
        ref={composerRef}
        rows="1"
        className="chat-input"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleComposerKeyDown}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
        readOnly={readOnly}
        autoFocus={autoFocus}
        aria-label="Message"
      />
    </div>
  );

  const renderVoiceTypingButton = (disabled = false) => (
    <button
      type="button"
      onClick={handleSpeech}
      className={`chat-mic-btn ${isListening ? "is-listening" : ""}`}
      aria-label={isListening ? "Stop voice typing" : "Start voice typing"}
      aria-pressed={isListening}
      data-state={voiceTypingState}
      disabled={disabled}
      title={isListening ? "Stop voice typing" : "Start voice typing"}
    >
      <Mic size={19} />
    </button>
  );

  const handleOpenDekodeVoice = () => {
    setIsVoiceOpen(true);
  };

  const renderDekodeVoiceButton = () =>
    voiceConfig.enabled ? (
      <DekodeVoiceEntry compact onClick={handleOpenDekodeVoice} />
    ) : null;

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleVoiceTurn = ({ userText, assistantText, response }) => {
    const turnId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: turnId, sender: "user", text: userText, source: "voice" },
      { id: turnId + 1, sender: "ai", text: cleanAssistantText(assistantText), source: "voice" },
    ]);
    if (step === "centered") setStep("company");
    setCompanyPanel(response);
    companyContextRef.current = rememberCompanyTurn(
      companyContextRef.current,
      response.topic || "company",
    );
  };

  const handleVoiceSwitchToText = (draft = "") => {
    setIsVoiceOpen(false);
    setInputValue(draft);
  };

  const getAnimationLevel = () => {
    if (step === "centered") return 0;
    if (step === "scheduling" || step === "done") return 4;
    return 1;
  };

  const isBookingExperience = projectType === "Discovery Call" && ["scheduling", "done"].includes(step);
  const hasSupportingVisual = SUPPORTING_VISUAL_PANEL_ENABLED && Boolean(companyPanel || projectType);

  const renderAnimationCard = (classNameExt = "") => (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6, type: "spring", damping: 20 }}
      className={`floating-animation-panel ${classNameExt} ${isBookingExperience ? "booking-summary-panel" : ""} ${isVisualPanelExpanded ? "visual-panel-expanded" : "visual-panel-collapsed"}`}
    >
      <div className="anim-header">
        <span className="anim-title">
          <Bot
            size={16}
            style={{
              display: "inline",
              marginRight: "6px",
              verticalAlign: "text-bottom",
            }}
          />
          {companyPanel ? "Company Knowledge" : isBookingExperience ? "Booking Summary" : "Building Context"}
        </span>
        <div className="anim-header-actions">
          <div className="anim-window-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <button
            type="button"
            className="visual-panel-toggle"
            onClick={() => setIsVisualPanelExpanded((expanded) => !expanded)}
            aria-expanded={isVisualPanelExpanded}
            aria-controls="supporting-visual-content"
          aria-label={isVisualPanelExpanded
            ? "Collapse supporting visual"
            : "Expand supporting visual"}
          >
            <span>{isVisualPanelExpanded ? "Collapse" : "Expand"}</span>
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* Requirement Tags & Progress Bar */}
      {!isBookingExperience && <div
        className="anim-body-container"
        style={{
          padding: "1rem",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "0.8rem",
        }}
      >
        {companyPanel ? (
          <motion.div
            key={companyPanel.topic}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="knowledge-topic-label"
          >
            <span className="knowledge-live-dot" />
             {companyPanel.topic === "why" ? "Why DEKODE" : companyPanel.topic.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </motion.div>
        ) : (
          <>
            {/* Tag Chips */}
            <div
              className="tags-container"
              style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
            >
              <AnimatePresence>
                {gatheredTags.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{
                      background: "rgba(53, 118, 193, 0.3)",
                      border: "1px solid rgba(53, 118, 193, 0.5)",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      color: "#60a5fa",
                    }}
                  >
                    {tag}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>}

      <div
        className="anim-content"
        id="supporting-visual-content"
        aria-hidden={isCompactLayout && !isVisualPanelExpanded}
        inert={isCompactLayout && !isVisualPanelExpanded ? true : undefined}
      >
        <div className="anim-scale-wrapper">
          {companyPanel ? (
            <CompanyKnowledgePanel
              panel={companyPanel.panel}
              onSelect={handleCompanyPrompt}
            />
          ) : (
            <AnimationPanel
              projectType={projectType}
              level={getAnimationLevel()}
              messages={messages}
              meetingSlots={meetingSlots}
              selectedMeetingDateKey={selectedMeetingDateKey}
              selectedMeetingSlotId={selectedMeetingSlotId}
              bookingComplete={step === "done"}
              conversationSummary={conversationMemory.summary}
            />
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <div className={`vibrant-background vibrant-background-dawn ${timeOfDay === "dawn" ? "active" : ""}`} />
      <div className={`vibrant-background vibrant-background-morning ${timeOfDay === "morning" ? "active" : ""}`} />
      <div className={`vibrant-background vibrant-background-noon ${timeOfDay === "noon" ? "active" : ""}`} />
      <div className={`vibrant-background vibrant-background-golden ${timeOfDay === "golden" ? "active" : ""}`} />
      <div className={`vibrant-background vibrant-background-evening ${timeOfDay === "evening" ? "active" : ""}`} />
      <div className={`vibrant-background vibrant-background-night ${timeOfDay === "night" ? "active" : ""}`} />
      <div className={`vibrant-background vibrant-background-latenight ${timeOfDay === "latenight" ? "active" : ""}`} />
      
      <ParticleBackground timeOfDay={timeOfDay} />
      
      {step === "centered" && (
        <>
          <HeroScenery
            timeOfDay={timeOfDay}
            realTime={realTime}
          />
          {/* <PlaneBanner timeOfDay={timeOfDay} /> */}
        </>
      )}

      <header className="chat-header">
        <a className="brand-logo" href={import.meta.env.BASE_URL || "/"} aria-label="Go to DEKODE home">
          DEKODE
        </a>
        {!proposalContext && (
          <div className="top-right-actions">
            <button
              type="button"
              className="action-pill calendar-entry-button"
              onClick={handleOpenMeetingScheduler}
              aria-label="Book a meeting"
              title="Book a meeting"
            >
              <CalendarDays size={18} strokeWidth={2.5} />
            </button>
            {onOpenProposalAccess && (
              <button
                type="button"
                className="action-pill proposal-entry-button client-portal-top-right"
                onClick={onOpenProposalAccess}
              >
                <LockKeyhole size={15} /> Client Portal
              </button>
            )}
          </div>
        )}
      </header>
      {proposalContext && (
        <div className="proposal-context-bar">
          <span id="proposal-chat-title"><i /> Proposal chat</span>
          <span>
            <button type="button" onClick={onExitProposal}>Exit proposal</button>
            <button type="button" onClick={onCloseProposalChat} aria-label="Close proposal chat"><X size={16} /></button>
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "centered" ? (
          <motion.div
            key="centered"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="centered-layout"
          >
            <h1 className="hero-title">
              {proposalContext ? "Ask about your proposal" : heroGreeting}
            </h1>

            <div className="input-container">
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                {renderDekodeVoiceButton()}
                {renderComposerInput()}
                {renderVoiceTypingButton()}
                <button
                  type="submit"
                  className={`chat-submit-btn ${isSending ? "shake-anim" : ""}`}
                  disabled={!inputValue.trim()}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
              <div
                className={`composer-status ${voiceStatus ? "is-visible" : ""}`}
                role="status"
                aria-live="polite"
              >
                {voiceStatus}
              </div>
            </div>

            {!proposalContext && (
              <>
                <div className="options-container">
                  {PROJECT_OPTION_ROWS.map((options, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="option-row"
                      role="group"
                      aria-label={rowIndex === 0 ? "AI solutions" : "Digital solutions"}
                    >
                      {options.map((option) => (
                        <button
                          key={option.label}
                          className="action-pill"
                          onClick={() => handleOptionSelect(option.label)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`active-chat-layout ${isBookingExperience && hasSupportingVisual ? "is-booking-layout" : ""} ${hasSupportingVisual ? "" : "chat-panel-hidden"}`}
          >
            <div className="chat-section">
              <div className="chat-scroll-area" ref={scrollRef}>
                <AnimatePresence>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 20,
                      }}
                      className={`message-row ${msg.sender === "ai" ? "message-ai" : "message-user"}`}
                    >
                      <div className="message-bubble">
                        {msg.sender === "ai" ? (
                          idx === messages.length - 1 ? (
                            <TypewriterText text={msg.text} topic={msg.companyTopic} delay={30} />
                          ) : (
                            <FormattedText text={msg.text} topic={msg.companyTopic} />
                          )
                        ) : (
                          msg.text
                        )}
                        {msg.sender === "ai" && (msg.suggestions?.length > 0 || msg.artifacts?.length > 0) && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="company-suggestion-chips"
                            role="group"
                            aria-label="Suggested follow-up questions"
                          >
                            {msg.suggestions.some((suggestion) => suggestion.kind === "discovery") && (
                              <span className="suggestion-context-label">Related to this</span>
                            )}
                            {msg.suggestions.map((suggestion) => (
                              <button
                                key={suggestion.label}
                                type="button"
                                className={suggestion.kind === "discovery" ? "is-discovery" : undefined}
                                onClick={() =>
                                  handleModelPrompt(suggestion.prompt, {
                                    type: "suggestion",
                                    label: suggestion.label,
                                    intent: suggestion.intent,
                                    action: suggestion.action,
                                  })
                                }
                                disabled={isTyping}
                              >
                                {suggestion.kind === "discovery" && (
                                  <Sparkles size={13} aria-hidden="true" />
                                )}
                                {suggestion.label}
                              </button>
                            ))}
                            {msg.artifacts?.map((artifact) => {
                              const isExpanded = expandedArtifactMessages.has(msg.id);
                              return (
                                <button
                                  key={artifact.id}
                                  type="button"
                                  className="is-artifact"
                                  aria-expanded={isExpanded}
                                  aria-controls={`artifact-stack-${msg.id}`}
                                  onClick={() => setExpandedArtifactMessages((current) => {
                                    const next = new Set(current);
                                    if (next.has(msg.id)) next.delete(msg.id);
                                    else next.add(msg.id);
                                    return next;
                                  })}
                                >
                                  <Images size={14} aria-hidden="true" />
                                  {artifact.label}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                        {msg.sender === "ai" && expandedArtifactMessages.has(msg.id) && msg.artifacts?.map((artifact) => (
                          <motion.div
                            id={`artifact-stack-${msg.id}`}
                            key={artifact.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="inline-work-artifact"
                          >
                            <InlinePortfolioAccordion artifact={artifact} instanceId={msg.id} />
                          </motion.div>
                        ))}
                        {msg.sender === "ai" && msg.actions?.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="company-suggestion-chips"
                          >
                            {msg.actions.map((action) => (
                              <button
                                key={`${action.type}-${action.label}`}
                                type="button"
                                onClick={() => {
                                  if (action.type === "open_booking") handleOpenMeetingScheduler();
                                }}
                                disabled={isTyping}
                              >
                                <CalendarDays size={15} aria-hidden="true" />
                                {action.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                        {msg.sender === "ai" && msg.proposalSource && (
                          <button
                            type="button"
                            className="proposal-entry-button"
                            onClick={() => onProposalSection?.(msg.proposalSource.sectionId)}
                          >
                            View: {msg.proposalSource.label}
                          </button>
                        )}
                        {msg.sender === "ai" && msg.clarificationQuestion && (
                          <button
                            type="button"
                            className="proposal-entry-button"
                            onClick={() => onProposalClarification?.(msg.clarificationQuestion)}
                          >
                            Contact the team
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="message-row message-ai"
                  >
                    <div
                      className="message-bubble"
                      style={{
                        display: "flex",
                        gap: "6px",
                        padding: "1.25rem",
                      }}
                    >
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        className="browser-dot"
                        style={{ background: "rgba(255,255,255,0.5)" }}
                      ></motion.span>
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: 0.2,
                        }}
                        className="browser-dot"
                        style={{ background: "rgba(255,255,255,0.5)" }}
                      ></motion.span>
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: 0.4,
                        }}
                        className="browser-dot"
                        style={{ background: "rgba(255,255,255,0.5)" }}
                      ></motion.span>
                    </div>
                  </motion.div>
                )}

                {step === "scheduling" && !isTyping && (
                  <motion.div
                    className="schedule-card-wrapper"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <MeetingScheduler
                      projectSummary={buildCleanProjectSummary(messages)}
                      onBooked={handleMeetingBooked}
                      selectedDateKey={selectedMeetingDateKey}
                      onDateSelect={handleMeetingDateSelect}
                      selectedSlotId={selectedMeetingSlotId}
                      onSlotSelect={handleMeetingSlotSelect}
                      onSlotsChange={handleMeetingSlotsChange}
                    />
                  </motion.div>
                )}

                {step === "done" && !isTyping && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ marginTop: "2rem", textAlign: "center" }}
                  >
                    <CheckCircle2
                      size={48}
                      style={{ margin: "0 auto 1rem", color: "#22c55e" }}
                    />
                    <h3 style={{ color: "white" }}>Meeting confirmed</h3>
                    <p style={{ color: "rgba(255,255,255,0.7)" }}>
                      Your calendar invitation is on its way.
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="chat-input-wrapper">
                <div className="input-container active-mode">
                  <form
                    className="chat-input-form"
                    onSubmit={handleSendMessage}
                  >
                    {renderDekodeVoiceButton()}
                    {renderComposerInput()}
                    {renderVoiceTypingButton(isTyping)}
                    <button
                      type="submit"
                      className={`chat-submit-btn ${isSending ? "shake-anim" : ""}`}
                      disabled={
                        !inputValue.trim() ||
                        isTyping
                      }
                      aria-label="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                  <div
                    className={`composer-status ${voiceStatus ? "is-visible" : ""}`}
                    role="status"
                    aria-live="polite"
                  >
                    {voiceStatus}
                  </div>
                </div>
              </div>
            </div>

            {hasSupportingVisual && renderAnimationCard('responsive-visual-panel')}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {voiceConfig.enabled && isVoiceOpen && (
          <DekodeVoiceSession
            onClose={() => setIsVoiceOpen(false)}
            onSwitchToText={handleVoiceSwitchToText}
            onTurn={handleVoiceTurn}
            onPanelChange={setCompanyPanel}
          />
        )}
      </AnimatePresence>
    </>
  );
}

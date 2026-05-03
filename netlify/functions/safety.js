// CatchCare Safety Module
// Hardcoded crisis detection and escalation paths
// These NEVER go through Claude. They fire immediately.

const CRISIS_PATTERNS = [
  {
    category: "cardiac_emergency",
    patterns: [
      /chest\s*pain/i,
      /heart\s*attack/i,
      /can'?t\s*breathe/i,
      /cannot\s*breathe/i,
      /difficulty\s*breathing/i,
      /trouble\s*breathing/i,
      /shortness\s*of\s*breath/i,
      /crushing\s*(chest|pressure)/i,
      /arm\s*(is\s*)?(numb|tingling).*chest/i,
      /chest.*arm\s*(numb|tingling)/i,
      /heart\s*(is\s*)?(racing|pounding).*dizzy/i,
      /passing\s*out/i,
      /faint(ed|ing)/i,
      /lost\s*consciousness/i,
    ],
    response: "I need to pause our conversation. What you're describing could be a medical emergency.\n\n**Please call 911 immediately** or have someone drive you to the nearest emergency room.\n\nDo not wait to see if symptoms improve. If you're alone, call 911 now and unlock your door.\n\nI've flagged this for your doctor's immediate attention, but emergency services are equipped to help you right now. Your safety is the priority.",
    urgency: "escalate",
    summary_prefix: "SAFETY ALERT - Possible cardiac/respiratory emergency:",
  },
  {
    category: "suicidal_ideation",
    patterns: [
      /want\s*to\s*(die|kill\s*myself|end\s*(it|my\s*life))/i,
      /suicid/i,
      /kill\s*myself/i,
      /end\s*my\s*life/i,
      /don'?t\s*want\s*to\s*(be\s*here|live|be\s*alive)/i,
      /better\s*off\s*(dead|without\s*me)/i,
      /no\s*reason\s*to\s*(live|go\s*on)/i,
      /thinking\s*(about|of)\s*(hurting|harming)\s*myself/i,
      /self[- ]?harm/i,
      /cutting\s*myself/i,
    ],
    response: "I hear you, and I want you to know that what you're feeling matters. You deserve support right now.\n\n**Please reach out to the 988 Suicide & Crisis Lifeline:**\n- **Call or text 988** (available 24/7)\n- **Chat at 988lifeline.org**\n\nIf you're in immediate danger, **call 911**.\n\nI've flagged this for your doctor so they can follow up with you directly. You don't have to go through this alone.",
    urgency: "escalate",
    summary_prefix: "SAFETY ALERT - Patient expressed suicidal ideation or self-harm:",
  },
  {
    category: "allergic_emergency",
    patterns: [
      /anaphyla/i,
      /throat\s*(is\s*)?(closing|swelling|tight)/i,
      /can'?t\s*swallow/i,
      /tongue\s*(is\s*)?(swelling|swollen)/i,
      /lips?\s*(is|are)?\s*(swelling|swollen)/i,
      /face\s*(is\s*)?(swelling|swollen)/i,
      /hives\s*(all\s*over|everywhere|spreading)/i,
      /epipen/i,
      /allergic\s*reaction.*severe/i,
      /severe\s*allergic/i,
    ],
    response: "This sounds like it could be a severe allergic reaction, which can be life-threatening.\n\n**If you have an EpiPen, use it now.**\n**Call 911 immediately.**\n\nDo not wait to see if symptoms improve. Severe allergic reactions can escalate quickly.\n\nI've flagged this for your doctor's immediate attention, but emergency services need to evaluate you right now.",
    urgency: "escalate",
    summary_prefix: "SAFETY ALERT - Possible severe allergic reaction/anaphylaxis:",
  },
  {
    category: "stroke_symptoms",
    patterns: [
      /face\s*(is\s*)?(drooping|numb)/i,
      /slurring\s*(words|speech)/i,
      /can'?t\s*(move|feel)\s*(my\s*)?(arm|leg|side)/i,
      /sudden\s*(confusion|numbness|weakness)/i,
      /worst\s*headache\s*(of\s*my\s*life|ever)/i,
      /sudden\s*vision\s*(loss|change|problem)/i,
      /stroke/i,
    ],
    response: "What you're describing could be signs of a stroke. Time is critical.\n\n**Call 911 immediately.** Do not drive yourself.\n\nRemember **F.A.S.T.:**\n- **F**ace drooping\n- **A**rm weakness\n- **S**peech difficulty\n- **T**ime to call 911\n\nI've flagged this for your doctor, but emergency services need to evaluate you right now. Every minute matters.",
    urgency: "escalate",
    summary_prefix: "SAFETY ALERT - Possible stroke symptoms:",
  },
  {
    category: "overdose",
    patterns: [
      /overdos/i,
      /took\s*too\s*(many|much)/i,
      /swallowed\s*(all|the\s*whole\s*bottle|too\s*many)/i,
      /poison/i,
    ],
    response: "This is a medical emergency.\n\n**Call 911 immediately** or **Poison Control at 1-800-222-1222.**\n\nIf someone is unconscious or not breathing, call 911 first.\n\nTry to have the medication bottle or substance available to tell emergency responders what was taken.\n\nI've flagged this for your doctor's immediate attention.",
    urgency: "escalate",
    summary_prefix: "SAFETY ALERT - Possible overdose/poisoning:",
  },
];

/**
 * Check a patient message for crisis patterns.
 * Returns null if no crisis detected, or a crisis response object if detected.
 */
function checkForCrisis(message) {
  if (!message || typeof message !== "string") return null;

  for (const crisis of CRISIS_PATTERNS) {
    for (const pattern of crisis.patterns) {
      if (pattern.test(message)) {
        return {
          detected: true,
          category: crisis.category,
          response: crisis.response,
          urgency: crisis.urgency,
          summary_prefix: crisis.summary_prefix,
          matched_pattern: pattern.toString(),
        };
      }
    }
  }

  return null;
}

module.exports = { checkForCrisis, CRISIS_PATTERNS };

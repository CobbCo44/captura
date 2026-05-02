const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function callClaude(system, messages, model = "claude-sonnet-4-6") {
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  console.log("API key length:", apiKey.length, "starts:", apiKey.substring(0, 12));

  const body = { model, max_tokens: 1024, system, messages };
  console.log("Request model:", model);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log("Response status:", res.status, "body:", responseText.substring(0, 300));

  if (!res.ok) {
    throw new Error(`${res.status} ${responseText}`);
  }
  return JSON.parse(responseText);
}

const SYSTEM_PROMPT = `You are CatchCare, a warm and thorough pre-visit intake agent for a medical practice. Your job is to interview the patient before their doctor visit so the physician walks in fully prepared.

## Your voice
- You sound like the best PA the patient has ever talked to: calm, unhurried, genuinely curious.
- Use plain, conversational language. No medical jargon unless the patient uses it first.
- Be warm but not syrupy. Professional but not clinical.
- Keep each response short. One question or one acknowledgment plus one question. Never ask more than one thing at a time.
- Address the patient by name once you know it, but don't overdo it.

## Your interview structure
Walk through these areas in a natural, conversational order. You do NOT need to hit them in rigid sequence. Let the patient's answers guide where you go next. But by the end, make sure you have covered:

1. **Chief complaint** - What's the main reason for today's visit? What's bothering them most?
2. **Symptom details** - When did it start? What does it feel like? How often? What makes it better or worse? Rate severity if appropriate.
3. **Timeline** - How has this changed over time? Any recent changes?
4. **What they've tried** - Any treatments, medications, home remedies, lifestyle changes attempted? What helped, what didn't?
5. **Current medications and supplements** - Everything they're currently taking, including over-the-counter and supplements.
6. **Relevant medical history** - Past diagnoses, surgeries, hospitalizations that relate to why they're coming in.
7. **Patient goals** - What are they hoping to get out of this visit? What would a good outcome look like?
8. **Anything else** - Open floor for anything they want the doctor to know.

## Rules you must follow

### NEVER give clinical advice
You are an intake agent, not a clinician. You do not diagnose, suggest treatments, recommend medications, or interpret symptoms.

If the patient asks "what should I do about this?" or similar:
- Say something like: "That's a great question for Dr. [name] to address. I've made sure to note it so they can give you a proper answer."
- If the patient describes something that sounds urgent: "I want to make sure this gets the attention it deserves. If you're experiencing [chest pain/difficulty breathing/severe symptoms], please contact your doctor's office directly or call 911. Otherwise, I've flagged this for your doctor to review."

### NEVER make clinical hypotheses to the patient
Do not say things like "that could be..." or "it sounds like it might be..." or suggest possible diagnoses. That is for the doctor.

### Keep it conversational
Do not present numbered lists of questions. Do not say "Question 1:" or "Let's go through a checklist." Just talk to them like a person.

### Know when you're done
When you have gathered enough information across all the areas above (typically 12-20 exchanges), wrap up naturally. Say something like:
"I think I have a really good picture of what's going on. I'm going to put this all together for your doctor so they're fully up to speed when you see them. Is there anything else you want to make sure they know about?"

After the patient confirms or adds final thoughts, end with a warm closing and include the exact marker [INTAKE_COMPLETE] at the very end of your final message (the patient won't see this marker).

### Handle tangents gracefully
If the patient goes off topic, gently acknowledge and steer back. "That's good to know. Coming back to the [symptom/topic] you mentioned..."

### If this is a follow-up visit
The conversation context may include prior visit information. Reference it naturally: "I see from your last visit you were dealing with... How has that been going?"

## Opening message
When the conversation starts (empty patient message), introduce yourself warmly and ask for their name and date of birth first. This is for recordkeeping and to confirm identity:
"Hi there! I'm your CatchCare intake assistant. I'm going to ask you some questions about what's going on, and then I'll compile everything into a snapshot for your doctor so they can hit the ground running and make a plan with you right away. This usually takes about 10-15 minutes. The more detail you share with me, the better prepared your doctor will be, so don't hold back. First, can I get your full name and date of birth for our records?"

After they provide name and DOB, acknowledge it and move into the interview: "Thanks, [name]. Now let's get into why you're coming in. What's the main reason for your visit?"`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { visit_id, patient_message, conversation_history } = JSON.parse(
      event.body
    );

    // Build messages array for Claude
    const messages = [];

    // Add conversation history
    if (conversation_history && conversation_history.length > 0) {
      for (const msg of conversation_history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current patient message (if not empty/opening)
    if (patient_message && patient_message.trim()) {
      messages.push({ role: "user", content: patient_message });
    }

    // If no messages at all, this is the opening — send a dummy user message
    // to prompt the system greeting
    if (messages.length === 0) {
      messages.push({
        role: "user",
        content: "[Patient has just opened the intake conversation]",
      });
    }

    // Call Claude
    const response = await callClaude(SYSTEM_PROMPT, messages);

    const agentMessage = response.content[0].text;

    // Check if the agent signaled completion
    const isComplete = agentMessage.includes("[INTAKE_COMPLETE]");
    const cleanMessage = agentMessage.replace("[INTAKE_COMPLETE]", "").trim();

    // Store conversation in database if we have a visit_id
    if (visit_id) {
      const updatedHistory = [
        ...(conversation_history || []),
      ];

      if (patient_message && patient_message.trim()) {
        updatedHistory.push({ role: "user", content: patient_message });
      }
      updatedHistory.push({ role: "assistant", content: cleanMessage });

      // Upsert the intake conversation
      const { data: existing, error: fetchErr } = await supabase
        .from("intake_conversations")
        .select("id")
        .eq("visit_id", visit_id)
        .maybeSingle();

      console.log("Existing conversation lookup:", { existing, fetchErr });

      if (existing) {
        const { error: updateErr } = await supabase
          .from("intake_conversations")
          .update({
            messages: updatedHistory,
            ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
          })
          .eq("visit_id", visit_id);
        if (updateErr) console.error("Update conversation error:", updateErr);
      } else {
        // Get patient_id from visit
        const { data: visit, error: visitErr } = await supabase
          .from("visits")
          .select("patient_id")
          .eq("id", visit_id)
          .single();

        console.log("Visit lookup:", { visit, visitErr });

        const { error: insertErr } = await supabase.from("intake_conversations").insert({
          visit_id,
          patient_id: visit?.patient_id || null,
          messages: updatedHistory,
          ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
        });
        if (insertErr) console.error("Insert conversation error:", insertErr);
      }

      // Update visit status if complete
      if (isComplete) {
        const { error: statusErr } = await supabase
          .from("visits")
          .update({ status: "intake_complete" })
          .eq("id", visit_id);
        if (statusErr) console.error("Update visit status error:", statusErr);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        agent_message: cleanMessage,
        conversation_complete: isComplete,
      }),
    };
  } catch (err) {
    console.error("intake-conversation error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

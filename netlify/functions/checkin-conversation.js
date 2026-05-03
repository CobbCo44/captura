const { createClient } = require("@supabase/supabase-js");
const { checkForCrisis } = require("./safety");
const { logAudit } = require("./audit");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function callClaude(system, messages, model = "claude-sonnet-4-6") {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1024, system, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }
  return res.json();
}

function buildSystemPrompt(patientName, protocol, recentSnapshot) {
  let protocolContext = "";
  if (protocol) {
    protocolContext = `\n\n## Current active protocol for this patient:\n${JSON.stringify(protocol, null, 2)}`;
  }

  let snapshotContext = "";
  if (recentSnapshot) {
    snapshotContext = `\n\n## Most recent visit snapshot:\nChief complaint: ${recentSnapshot.chief_complaint || "N/A"}\nCurrent protocol: ${recentSnapshot.current_protocol || "N/A"}\nPatient goal: ${recentSnapshot.patient_goal || "N/A"}`;
  }

  return `You are CatchCare, a between-visit check-in agent. The patient is checking in between appointments to log how things are going.

## Your voice
- Warm, conversational, supportive. Like a care coordinator checking in.
- Keep responses short. One acknowledgment plus one follow-up question.
- Use the patient's name naturally if you know it.
${patientName ? `- Patient's name: ${patientName}` : ""}

## Your role
You're here to:
1. Ask how they're doing and what's on their mind
2. Ask about any symptoms, concerns, or changes they want to share
3. If they're on a protocol, ask how it's going (adherence, side effects, improvements)
4. Ask if there's anything they want their doctor to know
5. Wrap up when you have a clear picture (usually 5-8 exchanges)

## IMPORTANT: Adapt to the patient's history
- If there is NO recent snapshot and NO protocol below, this patient has not had a visit yet. Do NOT reference "your last visit" or "since we last spoke." Instead, just ask what's on their mind and what they'd like their doctor to know.
- Only reference prior visits, protocols, or history if that information actually exists below.

## What you know about this patient
${protocolContext || "No active protocol on file."}
${snapshotContext || "No recent visit snapshot available."}

## Rules
### NEVER give clinical advice
You do not diagnose, suggest treatments, or interpret symptoms. If asked:
"That's something your doctor should weigh in on. I'll make sure they see this."

If something sounds urgent: "If you're experiencing [severe symptoms], please contact your doctor's office directly or call 911. I'm flagging this for priority review."

### NEVER make clinical hypotheses
No "it sounds like" or "that could be." Just listen, acknowledge, and log.

### Know when you're done
When you have a good picture, wrap up: "Thanks for checking in. I've got all of this logged for your doctor. Remember, you can come back here anytime something changes."

Then include [CHECKIN_COMPLETE] at the very end of your final message.

## Opening message
"Hi${patientName ? " " + patientName : ""}! Thanks for checking in. ${recentSnapshot ? "How have things been going since your last visit?" : "What's on your mind today? I'll make sure your doctor sees everything you share."}"`;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { checkin_id, patient_message, conversation_history, patient_email } = JSON.parse(event.body);

    // SAFETY CHECK: Intercept crisis situations before Claude sees the message
    if (patient_message && patient_message.trim()) {
      const crisis = checkForCrisis(patient_message);
      if (crisis) {
        console.log(`SAFETY TRIGGERED: ${crisis.category} in checkin`);

        // Look up patient for escalation
        let crisisPatientId = null;
        if (patient_email) {
          const { data: pat } = await supabase
            .from("patients")
            .select("id")
            .eq("email", patient_email)
            .single();
          crisisPatientId = pat?.id;
        }

        const crisisHistory = [...(conversation_history || [])];
        crisisHistory.push({ role: "user", content: patient_message });
        crisisHistory.push({ role: "assistant", content: crisis.response });

        // Save or create the check-in with escalation
        if (checkin_id) {
          await supabase.from("checkins").update({
            messages: crisisHistory,
            summary: `${crisis.summary_prefix} ${patient_message.substring(0, 200)}`,
            urgency: "escalate",
            status: "new",
          }).eq("id", checkin_id);
        } else if (crisisPatientId) {
          await supabase.from("checkins").insert({
            patient_id: crisisPatientId,
            messages: crisisHistory,
            summary: `${crisis.summary_prefix} ${patient_message.substring(0, 200)}`,
            urgency: "escalate",
            status: "new",
          });
        }

        // Log to audit
        await logAudit("safety_trigger", {
          category: crisis.category,
          checkin_id,
          patient_email,
          matched_pattern: crisis.matched_pattern,
          message_excerpt: patient_message.substring(0, 100),
        });

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify({
            agent_message: crisis.response,
            conversation_complete: false,
            safety_triggered: true,
          }),
        };
      }
    }

    // Look up patient context
    let patientName = "";
    let patientId = null;
    let protocol = null;
    let recentSnapshot = null;

    if (patient_email) {
      const { data: patient } = await supabase
        .from("patients")
        .select("id, first_name")
        .eq("email", patient_email)
        .single();

      if (patient) {
        patientId = patient.id;
        patientName = patient.first_name || "";

        // Get active protocol
        const { data: proto } = await supabase
          .from("protocols")
          .select("protocol")
          .eq("patient_id", patient.id)
          .eq("active", true)
          .order("effective_from", { ascending: false })
          .limit(1)
          .single();
        if (proto) protocol = proto.protocol;

        // Get most recent snapshot
        const { data: snap } = await supabase
          .from("snapshots")
          .select("content")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (snap) recentSnapshot = snap.content;
      }
    }

    const systemPrompt = buildSystemPrompt(patientName, protocol, recentSnapshot);

    // Build messages
    const messages = [];
    if (conversation_history && conversation_history.length > 0) {
      for (const msg of conversation_history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    if (patient_message && patient_message.trim()) {
      messages.push({ role: "user", content: patient_message });
    }

    if (messages.length === 0) {
      messages.push({ role: "user", content: "[Patient has opened the check-in conversation]" });
    }

    const response = await callClaude(systemPrompt, messages);
    const agentMessage = response.content[0].text;
    const isComplete = agentMessage.includes("[CHECKIN_COMPLETE]");
    const cleanMessage = agentMessage.replace("[CHECKIN_COMPLETE]", "").trim();

    // Build updated history
    const updatedHistory = [...(conversation_history || [])];
    if (patient_message && patient_message.trim()) {
      updatedHistory.push({ role: "user", content: patient_message });
    }
    updatedHistory.push({ role: "assistant", content: cleanMessage });

    // Save/update check-in
    if (checkin_id) {
      const { error: updateErr } = await supabase
        .from("checkins")
        .update({
          messages: updatedHistory,
          ...(isComplete ? { status: "new" } : {}),
        })
        .eq("id", checkin_id);
      if (updateErr) console.error("Update checkin error:", updateErr);
    } else if (patientId) {
      const { data: newCheckin, error: insertErr } = await supabase
        .from("checkins")
        .insert({
          patient_id: patientId,
          messages: updatedHistory,
        })
        .select("id")
        .single();
      if (insertErr) console.error("Insert checkin error:", insertErr);

      // Return the new checkin_id so the client can use it for subsequent messages
      if (newCheckin) {
        // Trigger urgency classification if complete
        if (isComplete) {
          classifyAndUpdate(newCheckin.id, updatedHistory);
        }

        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify({
            agent_message: cleanMessage,
            conversation_complete: isComplete,
            checkin_id: newCheckin.id,
          }),
        };
      }
    }

    // Trigger urgency classification if complete
    if (isComplete && checkin_id) {
      classifyAndUpdate(checkin_id, updatedHistory);
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        agent_message: cleanMessage,
        conversation_complete: isComplete,
        checkin_id: checkin_id || null,
      }),
    };
  } catch (err) {
    console.error("checkin-conversation error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

async function classifyAndUpdate(checkinId, messages) {
  try {
    const res = await fetch(
      `${process.env.URL || "https://catchcare.netlify.app"}/.netlify/functions/classify-urgency`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkin_id: checkinId, messages }),
      }
    );
  } catch (err) {
    console.error("Classify trigger error:", err);
  }
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

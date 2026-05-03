const { createClient } = require("@supabase/supabase-js");
const { logAudit } = require("./audit");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Tool definitions for Claude ──

const TOOL_DEFINITIONS = [
  {
    name: "get_todays_appointments",
    description: "Get the doctor's appointments for today. Returns patient names, visit times, visit types, intake status, and snapshot availability.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_patient_snapshot",
    description: "Get the most recent clinical snapshot for a specific patient, including their active protocol and doctor notes. Use when the doctor asks about a specific patient before a visit.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "UUID of the patient" },
        patient_name: { type: "string", description: "Name of the patient (used to look up if ID not known)" },
      },
      required: [],
    },
  },
  {
    name: "get_recent_checkins",
    description: "Get between-visit check-ins for a specific patient within a time window. Returns check-in summaries, urgency levels, and doctor replies.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "UUID of the patient" },
        patient_name: { type: "string", description: "Name of the patient (used to look up if ID not known)" },
        days: { type: "number", description: "Number of days to look back. Default 30." },
      },
      required: [],
    },
  },
  {
    name: "get_doctor_digest",
    description: "Get the doctor's inbox of patient check-ins, filtered by urgency. Use when the doctor asks about urgent items, their inbox, or what needs attention.",
    input_schema: {
      type: "object",
      properties: {
        urgency_filter: {
          type: "string",
          enum: ["escalate", "digest", "all"],
          description: "Filter by urgency level. 'escalate' for urgent only, 'digest' for review items, 'all' for everything.",
        },
      },
      required: [],
    },
  },
  {
    name: "query_patient_panel",
    description: "Search across all the doctor's patients by symptoms, medications, protocols, or conditions. Use for questions like 'which patients are on TRT' or 'who reported headaches recently'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language search query about patients, symptoms, medications, or conditions." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_protocol_history",
    description: "Get the chronological history of protocols set for a specific patient, with effective dates.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "UUID of the patient" },
        patient_name: { type: "string", description: "Name of the patient" },
      },
      required: [],
    },
  },
  {
    name: "mark_checkin_reviewed",
    description: "Mark a patient check-in as reviewed. Use when the doctor says to clear or review a check-in item.",
    input_schema: {
      type: "object",
      properties: {
        checkin_id: { type: "string", description: "UUID of the check-in to mark as reviewed" },
      },
      required: ["checkin_id"],
    },
  },
  {
    name: "draft_patient_message",
    description: "Draft a message to a patient for the doctor to review before sending. Use when the doctor wants to reply to a patient.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "UUID of the patient" },
        patient_name: { type: "string", description: "Name of the patient" },
        content: { type: "string", description: "The message content to send to the patient" },
      },
      required: ["content"],
    },
  },
  {
    name: "get_patient_labs",
    description: "Get recent lab results for a specific patient. Returns parsed lab values with flags.",
    input_schema: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "UUID of the patient" },
        patient_name: { type: "string", description: "Name of the patient" },
        days: { type: "number", description: "Number of days to look back. Default 90." },
      },
      required: [],
    },
  },
];

// ── Tool execution ──

async function resolvePatientId(doctorId, input) {
  if (input.patient_id) {
    // Verify patient belongs to this doctor
    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq("id", input.patient_id)
      .eq("doctor_id", doctorId)
      .single();
    return data?.id || null;
  }
  if (input.patient_name) {
    const name = input.patient_name.toLowerCase();
    const { data: patients } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("doctor_id", doctorId);
    const match = (patients || []).find(p => {
      const full = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      return full.includes(name) || name.includes(p.first_name?.toLowerCase() || "") || name.includes(p.last_name?.toLowerCase() || "");
    });
    return match?.id || null;
  }
  return null;
}

async function executeTool(toolName, input, doctorId) {
  switch (toolName) {
    case "get_todays_appointments": {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data: visits } = await supabase
        .from("visits")
        .select("id, patient_id, scheduled_for, visit_type, status")
        .eq("doctor_id", doctorId)
        .gte("scheduled_for", startOfDay)
        .lt("scheduled_for", endOfDay)
        .order("scheduled_for", { ascending: true });

      if (!visits || visits.length === 0) return { appointments: [], count: 0 };

      const patientIds = visits.map(v => v.patient_id);
      const { data: patients } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .in("id", patientIds);
      const patMap = {};
      (patients || []).forEach(p => { patMap[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim(); });

      const visitIds = visits.map(v => v.id);
      const { data: snapshots } = await supabase
        .from("snapshots")
        .select("id, visit_id")
        .in("visit_id", visitIds);
      const snapMap = {};
      (snapshots || []).forEach(s => { snapMap[s.visit_id] = s.id; });

      return {
        count: visits.length,
        appointments: visits.map(v => ({
          patient_name: patMap[v.patient_id] || "Unknown",
          scheduled_for: v.scheduled_for,
          visit_type: v.visit_type,
          intake_status: v.status,
          snapshot_ready: !!snapMap[v.id],
          patient_id: v.patient_id,
        })),
      };
    }

    case "get_patient_snapshot": {
      const patientId = await resolvePatientId(doctorId, input);
      if (!patientId) return { error: "Patient not found or not in your panel." };

      const { data: snapshot } = await supabase
        .from("snapshots")
        .select("content, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: protocol } = await supabase
        .from("protocols")
        .select("protocol, effective_from")
        .eq("patient_id", patientId)
        .eq("active", true)
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();

      const { data: notes } = await supabase
        .from("doctor_notes")
        .select("note, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        snapshot: snapshot?.content || null,
        snapshot_date: snapshot?.created_at || null,
        active_protocol: protocol?.protocol || null,
        protocol_since: protocol?.effective_from || null,
        recent_notes: notes || [],
      };
    }

    case "get_recent_checkins": {
      const patientId = await resolvePatientId(doctorId, input);
      if (!patientId) return { error: "Patient not found or not in your panel." };

      const days = input.days || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const { data: checkins } = await supabase
        .from("checkins")
        .select("id, summary, urgency, status, doctor_reply, created_at")
        .eq("patient_id", patientId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      return { checkins: checkins || [], count: (checkins || []).length };
    }

    case "get_doctor_digest": {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .eq("doctor_id", doctorId);
      const patientIds = (patients || []).map(p => p.id);
      if (patientIds.length === 0) return { checkins: [], count: 0 };

      const patMap = {};
      (patients || []).forEach(p => { patMap[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim(); });

      let query = supabase
        .from("checkins")
        .select("id, patient_id, summary, urgency, status, created_at")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (input.urgency_filter && input.urgency_filter !== "all") {
        query = query.eq("urgency", input.urgency_filter);
      }

      const { data: checkins } = await query;

      return {
        count: (checkins || []).length,
        checkins: (checkins || []).map(c => ({
          ...c,
          patient_name: patMap[c.patient_id] || "Unknown",
        })),
      };
    }

    case "query_patient_panel": {
      const searchQuery = (input.query || "").toLowerCase();
      const { data: patients } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .eq("doctor_id", doctorId);

      if (!patients || patients.length === 0) return { results: [], count: 0 };
      const patientIds = patients.map(p => p.id);
      const patMap = {};
      patients.forEach(p => { patMap[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim(); });

      const results = [];

      // Search snapshots
      const { data: snapshots } = await supabase
        .from("snapshots")
        .select("patient_id, content")
        .in("patient_id", patientIds);

      (snapshots || []).forEach(s => {
        const text = JSON.stringify(s.content).toLowerCase();
        if (text.includes(searchQuery) || searchQuery.split(" ").every(w => text.includes(w))) {
          const excerpt = extractExcerpt(s.content, searchQuery);
          if (!results.find(r => r.patient_id === s.patient_id)) {
            results.push({ patient_id: s.patient_id, patient_name: patMap[s.patient_id], source: "snapshot", excerpt });
          }
        }
      });

      // Search checkins
      const { data: checkins } = await supabase
        .from("checkins")
        .select("patient_id, summary, messages")
        .in("patient_id", patientIds);

      (checkins || []).forEach(c => {
        const text = `${c.summary || ""} ${JSON.stringify(c.messages || [])}`.toLowerCase();
        if (text.includes(searchQuery) || searchQuery.split(" ").every(w => text.includes(w))) {
          if (!results.find(r => r.patient_id === c.patient_id)) {
            results.push({ patient_id: c.patient_id, patient_name: patMap[c.patient_id], source: "checkin", excerpt: c.summary || "Match in check-in conversation" });
          }
        }
      });

      // Search protocols
      const { data: protocols } = await supabase
        .from("protocols")
        .select("patient_id, protocol")
        .in("patient_id", patientIds)
        .eq("active", true);

      (protocols || []).forEach(p => {
        const text = JSON.stringify(p.protocol).toLowerCase();
        if (text.includes(searchQuery) || searchQuery.split(" ").every(w => text.includes(w))) {
          if (!results.find(r => r.patient_id === p.patient_id)) {
            results.push({ patient_id: p.patient_id, patient_name: patMap[p.patient_id], source: "protocol", excerpt: JSON.stringify(p.protocol).substring(0, 200) });
          }
        }
      });

      return { results, count: results.length };
    }

    case "get_protocol_history": {
      const patientId = await resolvePatientId(doctorId, input);
      if (!patientId) return { error: "Patient not found or not in your panel." };

      const { data: protocols } = await supabase
        .from("protocols")
        .select("protocol, active, effective_from, created_at")
        .eq("patient_id", patientId)
        .order("effective_from", { ascending: false });

      return { protocols: protocols || [] };
    }

    case "mark_checkin_reviewed": {
      if (!input.checkin_id) return { error: "checkin_id required" };

      // Verify checkin belongs to doctor's patient
      const { data: checkin } = await supabase
        .from("checkins")
        .select("patient_id")
        .eq("id", input.checkin_id)
        .single();

      if (!checkin) return { error: "Check-in not found." };

      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("id", checkin.patient_id)
        .eq("doctor_id", doctorId)
        .single();

      if (!patient) return { error: "This check-in does not belong to your patient." };

      await supabase
        .from("checkins")
        .update({ status: "reviewed" })
        .eq("id", input.checkin_id);

      return { success: true, message: "Check-in marked as reviewed." };
    }

    case "draft_patient_message": {
      const patientId = await resolvePatientId(doctorId, input);
      if (!patientId) return { error: "Patient not found or not in your panel." };

      const { data: msg, error } = await supabase
        .from("patient_messages")
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          message: input.content,
          status: "draft",
        })
        .select("id")
        .single();

      if (error) return { error: "Failed to save draft." };
      return { success: true, draft_id: msg.id, message: "Draft saved. Review and send from the patient's profile." };
    }

    case "get_patient_labs": {
      const patientId = await resolvePatientId(doctorId, input);
      if (!patientId) return { error: "Patient not found or not in your panel." };

      const days = input.days || 90;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      const { data: labs } = await supabase
        .from("labs")
        .select("parsed_values, drawn_at, uploaded_at")
        .eq("patient_id", patientId)
        .gte("uploaded_at", since)
        .order("uploaded_at", { ascending: false });

      return { labs: labs || [], count: (labs || []).length };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

function extractExcerpt(content, query) {
  const text = JSON.stringify(content);
  const idx = text.toLowerCase().indexOf(query.split(" ")[0]);
  if (idx === -1) return text.substring(0, 200);
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + 150);
  return text.substring(start, end).replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
}

// ── System prompt builder ──

function buildSystemPrompt(doctor) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return `You are Mira, the AI chief of staff for Dr. ${doctor.name || "Doctor"} at ${doctor.practice_name || "the practice"}. You help them prepare for their day, surface what matters across their patient panel, and triage their inbox.

Your voice: calm, precise, concise. You sound like a sharp PA who's been with the doctor for years. You lead with the answer, then add context only if useful. You don't pad. You don't apologize. You don't editorialize.

Your boundaries:
- You NEVER give clinical advice or diagnose. You surface patterns and route decisions to the doctor.
- You NEVER speculate about clinical data without checking. If you're not sure, call a tool.
- You NEVER discuss patients outside Dr. ${doctor.name || "Doctor"}'s panel. Your tools are scoped to their patients only.
- If the doctor asks something outside your scope (general medical questions, personal advice, anything non-clinical-workflow), gently redirect: "That's outside what I can help with. I'm here for your patient panel and your day."
- When a tool returns empty results, say so directly. Don't fabricate data or guess.

Your default response length: 2-4 sentences. Expand only when asked for detail or when summarizing multiple items.

When the doctor asks about their day, their inbox, or a specific patient, call the appropriate tool. Don't guess. Don't summarize from memory. Tools are cheap.

When summarizing across multiple patients, lead with the count and the most important one: "8 appointments today. Most important: James M. -- homocysteine came back elevated, want to start there?"

When delivering a briefing, structure it: appointments count, flagged items, routine items, suggested starting point.

Today is ${currentDate}.`;
}

// ── Main agent loop ──

async function agentLoop(doctor, messages) {
  const systemPrompt = buildSystemPrompt(doctor);
  const MAX_TOOL_ROUNDS = 5;
  let currentMessages = [...messages];
  const toolCallsMade = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        tools: TOOL_DEFINITIONS,
        messages: currentMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error: ${res.status} ${err}`);
    }

    const response = await res.json();

    // Check if response contains tool use
    const toolUseBlocks = response.content.filter(b => b.type === "tool_use");
    const textBlocks = response.content.filter(b => b.type === "text");

    if (toolUseBlocks.length === 0) {
      // No tool calls, we have the final text response
      const finalText = textBlocks.map(b => b.text).join("\n");
      return { text: finalText, toolCallsMade };
    }

    // Execute tool calls
    currentMessages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const toolBlock of toolUseBlocks) {
      console.log(`Tool call: ${toolBlock.name}`, JSON.stringify(toolBlock.input));
      toolCallsMade.push({ name: toolBlock.name, input: toolBlock.input });

      const result = await executeTool(toolBlock.name, toolBlock.input, doctor.id);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      });
    }

    currentMessages.push({ role: "user", content: toolResults });
  }

  return { text: "I hit my tool limit for this turn. Could you rephrase or narrow your question?", toolCallsMade };
}

// ── HTTP handler ──

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { doctor_email, user_message } = JSON.parse(event.body);

    if (!doctor_email || !user_message) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "doctor_email and user_message required" }),
      };
    }

    // Get doctor
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id, name, practice_name")
      .eq("email", doctor_email)
      .single();

    if (!doctor) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Doctor not found" }),
      };
    }

    // Rate limiting: max 30 requests per doctor per minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentRequests } = await supabase
      .from("doctor_conversations")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", doctor.id)
      .gte("updated_at", oneMinuteAgo);

    if (recentRequests > 30) {
      return {
        statusCode: 429,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      };
    }

    // Get or create today's conversation thread
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let { data: conversation } = await supabase
      .from("doctor_conversations")
      .select("id, messages")
      .eq("doctor_id", doctor.id)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConvo } = await supabase
        .from("doctor_conversations")
        .insert({ doctor_id: doctor.id, messages: [] })
        .select("id, messages")
        .single();
      conversation = newConvo;
    }

    // Build messages for Claude (keep last 50 turns)
    let history = conversation.messages || [];
    if (history.length > 100) {
      history = history.slice(-100);
    }

    // Add user message
    history.push({ role: "user", content: user_message });

    // Run agent loop
    const { text: agentResponse, toolCallsMade } = await agentLoop(doctor, history);

    // Save to history (only user messages and final agent text, not tool calls)
    history.push({ role: "assistant", content: agentResponse });

    // Update conversation
    await supabase
      .from("doctor_conversations")
      .update({
        messages: history,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    // Audit log
    await logAudit("doctor_agent_query", {
      doctor_id: doctor.id,
      tool_calls: toolCallsMade.map(t => t.name),
      message_length: user_message.length,
    }, doctor_email);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        agent_message: agentResponse,
        tool_calls_made: toolCallsMade,
      }),
    };
  } catch (err) {
    console.error("doctor-agent error:", err);
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

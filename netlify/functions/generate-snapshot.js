const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function callClaude(system, messages, model = "claude-opus-4-7") {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 8192, system, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }
  return res.json();
}

const SNAPSHOT_SYSTEM_PROMPT = `You are a clinical documentation specialist. Your job is to take a raw patient intake conversation and produce a structured PRE-VISIT CLINICAL SNAPSHOT for the physician.

## Output format
Return a valid JSON object with exactly these keys. Every value is a string (use plain text, not markdown). If information was not discussed, write "Not discussed during intake."

{
  "patient_name": "Full name",
  "dob": "Date of birth as provided",
  "visit_type": "Initial or Follow-up",
  "patient_goal": "What the patient hopes to get from this visit",
  "since_last_visit": "Bullet-style summary of what's new, started, stopped, pending. Use \\n for line breaks.",
  "chief_complaint": "Primary reason for visit with key details. Use \\n for separate complaints.",
  "symptom_timeline": "Chronological progression of symptoms. Use \\n for time periods.",
  "current_protocol": "Current medications, supplements, treatments, lifestyle. Use \\n for categories.",
  "whats_been_tried": "What helped, what didn't, mixed signals. Use \\n for categories.",
  "relevant_history": "Past diagnoses, surgeries, conditions relevant to chief complaint. Use \\n for items.",
  "lab_summary": "Any labs mentioned. Use \\n for rows. Write 'No labs discussed' if none.",
  "considerations": "3-5 pattern-based clinical hypotheses for physician review. Number them. These are doctor-facing ONLY and must never be shown to the patient. Frame as 'considerations for physician review' not diagnoses.",
  "between_visits_log": "Any symptoms or events the patient reported between visits. Write 'No prior check-ins' if this is an initial visit."
}

## Clinical voice guidelines
- Write in concise clinical prose, not conversational language
- Use medical terminology where appropriate, but keep it readable
- Be specific with timelines, dosages, and frequencies when the patient provided them
- Distinguish between patient-reported information and observed patterns
- In the considerations section, frame hypotheses as "consider evaluating..." or "pattern suggests..." never as diagnoses
- The considerations section should connect dots across complaints, history, and reported responses

## Important rules
- Extract ONLY what the patient actually said. Do not fabricate or assume information.
- The "considerations" field is for the physician only. It should contain clinical pattern recognition and suggested evaluation paths.
- If the patient mentioned something but was vague, note that it was vague rather than filling in details.
- Return ONLY the JSON object, no other text.`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { intake_conversation_id, visit_id } = JSON.parse(event.body);

    const lookupId = visit_id || intake_conversation_id;
    const lookupField = visit_id ? "visit_id" : "id";

    // Get the intake conversation
    const { data: conversation, error: convErr } = await supabase
      .from("intake_conversations")
      .select("*")
      .eq(lookupField, lookupId)
      .single();

    if (convErr || !conversation) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Intake conversation not found" }),
      };
    }

    // Get prior snapshots for this patient (for follow-up context)
    let priorContext = "";
    if (conversation.patient_id) {
      const { data: priorSnapshots } = await supabase
        .from("snapshots")
        .select("content, created_at")
        .eq("patient_id", conversation.patient_id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (priorSnapshots && priorSnapshots.length > 0) {
        priorContext = "\n\n## Prior visit snapshots (for longitudinal context):\n" +
          priorSnapshots.map((s, i) =>
            `### Visit ${i + 1} (${new Date(s.created_at).toLocaleDateString()}):\n${JSON.stringify(s.content)}`
          ).join("\n\n");
      }

      // Get recent check-ins
      const { data: recentCheckins } = await supabase
        .from("checkins")
        .select("messages, summary, created_at")
        .eq("patient_id", conversation.patient_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentCheckins && recentCheckins.length > 0) {
        priorContext += "\n\n## Recent between-visit check-ins:\n" +
          recentCheckins.map(c =>
            `${new Date(c.created_at).toLocaleDateString()}: ${c.summary || JSON.stringify(c.messages)}`
          ).join("\n");
      }

      // Get current protocol
      const { data: protocol } = await supabase
        .from("protocols")
        .select("protocol")
        .eq("patient_id", conversation.patient_id)
        .eq("active", true)
        .single();

      if (protocol) {
        priorContext += "\n\n## Current active protocol:\n" + JSON.stringify(protocol.protocol);
      }

      // Get recent labs
      const { data: labs } = await supabase
        .from("labs")
        .select("parsed_values, drawn_at")
        .eq("patient_id", conversation.patient_id)
        .gte("drawn_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order("drawn_at", { ascending: false });

      if (labs && labs.length > 0) {
        priorContext += "\n\n## Labs from last 90 days:\n" +
          labs.map(l =>
            `Drawn ${l.drawn_at}: ${JSON.stringify(l.parsed_values)}`
          ).join("\n");
      }
    }

    // Format the conversation for Claude
    const conversationText = conversation.messages
      .map(m => `${m.role === "user" ? "PATIENT" : "INTAKE AGENT"}: ${m.content}`)
      .join("\n\n");

    // Generate the snapshot
    const response = await callClaude(
      SNAPSHOT_SYSTEM_PROMPT,
      [
        {
          role: "user",
          content: `Generate a clinical snapshot from this intake conversation.\n\n## Intake Conversation:\n${conversationText}${priorContext}`,
        },
      ]
    );

    const snapshotText = response.content[0].text;
    let snapshotContent;
    try {
      // Clean any markdown code fences if present
      const cleaned = snapshotText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      snapshotContent = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse snapshot JSON:", parseErr, snapshotText);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Failed to parse snapshot" }),
      };
    }

    // Separate patient-safe content (no considerations)
    const patientContent = { ...snapshotContent };
    delete patientContent.considerations;

    // Render HTML for fast doctor view
    const renderedHtml = renderSnapshotHtml(snapshotContent);

    // Store the snapshot
    const { data: snapshot, error: insertErr } = await supabase
      .from("snapshots")
      .insert({
        visit_id: conversation.visit_id,
        patient_id: conversation.patient_id,
        content: snapshotContent,
        patient_content: patientContent,
        rendered_html: renderedHtml,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert snapshot error:", insertErr);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Failed to save snapshot" }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        snapshot_id: snapshot.id,
        content: snapshotContent,
      }),
    };
  } catch (err) {
    console.error("generate-snapshot error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

function renderSnapshotHtml(s) {
  const section = (title, content) => {
    if (!content || content === "Not discussed during intake.") return "";
    const lines = content.split("\\n").join("\n").split("\n").filter(l => l.trim());
    const body = lines.length > 1
      ? "<ul>" + lines.map(l => `<li>${escHtml(l.replace(/^[-•]\s*/, ""))}</li>`).join("") + "</ul>"
      : `<p>${escHtml(content)}</p>`;
    return `<div class="snap-section"><h3>${escHtml(title)}</h3>${body}</div>`;
  };

  const escHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
<div class="snapshot">
  <div class="snap-header">
    <h2>PRE-VISIT CLINICAL SNAPSHOT</h2>
    <p class="snap-meta">AI-assisted intake — Decision support, not a diagnostic instrument</p>
  </div>
  <div class="snap-patient-info">
    <div><strong>Patient:</strong> ${escHtml(s.patient_name || "")}</div>
    <div><strong>DOB:</strong> ${escHtml(s.dob || "")}</div>
    <div><strong>Visit type:</strong> ${escHtml(s.visit_type || "")}</div>
    <div><strong>Patient goal:</strong> ${escHtml(s.patient_goal || "")}</div>
  </div>
  ${section("Since Last Visit", s.since_last_visit)}
  ${section("Chief Complaint", s.chief_complaint)}
  ${section("Symptom Timeline", s.symptom_timeline)}
  ${section("Current Protocol", s.current_protocol)}
  ${section("What's Been Tried", s.whats_been_tried)}
  ${section("Relevant History", s.relevant_history)}
  ${section("Lab Summary", s.lab_summary)}
  <div class="snap-section snap-considerations">
    <h3>Considerations for Physician Review</h3>
    <p class="snap-warning">Pattern-based hypotheses for clinical evaluation — not diagnoses. Provided to support, not replace, physician judgment.</p>
    ${s.considerations ? "<ul>" + s.considerations.split("\\n").join("\n").split("\n").filter(l => l.trim()).map(l => `<li>${escHtml(l.replace(/^\d+\.\s*/, ""))}</li>`).join("") + "</ul>" : ""}
  </div>
  ${section("Between-Visits Patient Log", s.between_visits_log)}
</div>`;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const { createClient } = require("@supabase/supabase-js");

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
    body: JSON.stringify({ model, max_tokens: 256, system, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }
  return res.json();
}

const CLASSIFY_PROMPT = `You are a clinical triage classifier for a between-visit patient check-in. Based on the conversation, classify the urgency and write a one-line summary.

Return a JSON object with exactly two keys:
{
  "urgency": "log" | "digest" | "escalate",
  "summary": "One sentence summary of the check-in"
}

Classification rules:
- "log": Routine update. Patient is doing fine, no concerning changes. Doctor sees it when convenient.
- "digest": Notable update. New symptoms, side effects, adherence issues, or changes worth reviewing before next visit. Doctor should see before next appointment.
- "escalate": Urgent. Symptoms that could indicate a serious issue, safety concern, or something requiring prompt physician attention.

Examples:
- Patient reports feeling good, sleeping better, following protocol → "log"
- Patient reports new headaches since starting medication → "digest"
- Patient reports chest pain, difficulty breathing, or suicidal ideation → "escalate"

Return ONLY the JSON object.`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { checkin_id, messages } = JSON.parse(event.body);

    if (!checkin_id || !messages) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "checkin_id and messages required" }),
      };
    }

    const conversationText = messages
      .map(m => `${m.role === "user" ? "PATIENT" : "AGENT"}: ${m.content}`)
      .join("\n");

    const response = await callClaude(CLASSIFY_PROMPT, [
      { role: "user", content: `Classify this check-in:\n\n${conversationText}` },
    ]);

    const resultText = response.content[0].text;
    let result;
    try {
      const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse classification:", parseErr);
      result = { urgency: "digest", summary: "Check-in completed, classification pending review." };
    }

    // Update the check-in record
    const { error: updateErr } = await supabase
      .from("checkins")
      .update({
        urgency: result.urgency,
        summary: result.summary,
      })
      .eq("id", checkin_id);

    if (updateErr) console.error("Update checkin urgency error:", updateErr);

    // Send escalation email if urgent
    if (result.urgency === "escalate") {
      try {
        // Get patient and doctor info
        const { data: checkin } = await supabase
          .from("checkins")
          .select("patient_id")
          .eq("id", checkin_id)
          .single();

        if (checkin) {
          const { data: patient } = await supabase
            .from("patients")
            .select("first_name, last_name, doctor_id")
            .eq("id", checkin.patient_id)
            .single();

          if (patient) {
            const { data: doctor } = await supabase
              .from("doctors")
              .select("email, name")
              .eq("id", patient.doctor_id)
              .single();

            if (doctor) {
              // Send email notification via fetch to a simple email function
              await fetch(
                `${process.env.URL || "https://catchcare.netlify.app"}/.netlify/functions/send-alert`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: doctor.email,
                    subject: `CatchCare URGENT: ${patient.first_name} ${patient.last_name} check-in flagged`,
                    body: `Dr. ${doctor.name},\n\nA patient check-in has been flagged as urgent.\n\nPatient: ${patient.first_name} ${patient.last_name}\nSummary: ${result.summary}\n\nPlease review in your CatchCare dashboard:\nhttps://catchcare.netlify.app/doctor/digest.html\n\n- CatchCare`,
                  }),
                }
              );
            }
          }
        }
      } catch (emailErr) {
        console.error("Escalation email error:", emailErr);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("classify-urgency error:", err);
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

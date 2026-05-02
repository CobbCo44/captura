const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { patient_email } = JSON.parse(event.body);

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("email", patient_email)
      .single();

    if (!patient) {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ items: [] }),
      };
    }

    const items = [];

    // Get intake conversations
    const { data: intakes } = await supabase
      .from("intake_conversations")
      .select("id, messages, completed_at, created_at")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false });

    (intakes || []).forEach(i => {
      items.push({
        id: i.id,
        type: "intake",
        date: i.completed_at || i.created_at,
        summary: "Pre-visit intake conversation",
        messages: i.messages || [],
      });
    });

    // Get check-ins
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, messages, summary, doctor_reply, created_at")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false });

    (checkins || []).forEach(c => {
      items.push({
        id: c.id,
        type: "checkin",
        date: c.created_at,
        summary: c.summary || "Between-visit check-in",
        messages: c.messages || [],
        doctor_reply: c.doctor_reply || null,
      });
    });

    // Get labs
    const { data: labs } = await supabase
      .from("labs")
      .select("id, drawn_at, parsed_values, uploaded_at")
      .eq("patient_id", patient.id)
      .order("uploaded_at", { ascending: false });

    (labs || []).forEach(l => {
      const count = l.parsed_values ? Object.keys(l.parsed_values).length : 0;
      items.push({
        id: l.id,
        type: "lab",
        date: l.uploaded_at,
        summary: `Lab results uploaded (${count} values parsed)${l.drawn_at ? ", drawn " + l.drawn_at : ""}`,
      });
    });

    // Sort all items by date descending
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    console.error("patient-history error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
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

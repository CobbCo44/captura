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
    const { patient_id } = JSON.parse(event.body);

    if (!patient_id) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "patient_id required" }),
      };
    }

    // Get patient
    const { data: patient } = await supabase
      .from("patients")
      .select("id, email, first_name, last_name, dob")
      .eq("id", patient_id)
      .single();

    if (!patient) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Patient not found" }),
      };
    }

    const name = `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || patient.email;

    // Get visits with snapshot IDs
    const { data: visits } = await supabase
      .from("visits")
      .select("id, scheduled_for, visit_type, status")
      .eq("patient_id", patient_id)
      .order("scheduled_for", { ascending: false });

    const visitIds = (visits || []).map(v => v.id);
    const { data: snapshots } = await supabase
      .from("snapshots")
      .select("id, visit_id")
      .in("visit_id", visitIds.length > 0 ? visitIds : ["none"]);

    const snapMap = {};
    (snapshots || []).forEach(s => { snapMap[s.visit_id] = s.id; });

    const enrichedVisits = (visits || []).map(v => ({
      ...v,
      snapshot_id: snapMap[v.id] || null,
    }));

    // Get check-ins
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, summary, urgency, status, doctor_reply, created_at")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    // Get labs
    const { data: labs } = await supabase
      .from("labs")
      .select("id, drawn_at, parsed_values, uploaded_at")
      .eq("patient_id", patient_id)
      .order("uploaded_at", { ascending: false });

    // Get messages
    const { data: messages } = await supabase
      .from("patient_messages")
      .select("id, message, doctor_reply, replied_at, created_at")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    // Get active protocol
    const { data: protocol } = await supabase
      .from("protocols")
      .select("protocol")
      .eq("patient_id", patient_id)
      .eq("active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .single();

    // Get doctor notes
    const { data: notes } = await supabase
      .from("doctor_notes")
      .select("id, note, created_at")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        patient: { ...patient, name },
        visits: enrichedVisits || [],
        checkins: checkins || [],
        labs: labs || [],
        messages: messages || [],
        protocol: protocol?.protocol || null,
        notes: notes || [],
      }),
    };
  } catch (err) {
    console.error("patient-profile error:", err);
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

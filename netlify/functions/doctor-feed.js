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
    const { doctor_email } = JSON.parse(event.body);

    if (!doctor_email) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "doctor_email required" }),
      };
    }

    // Get doctor record
    const { data: doctor, error: docErr } = await supabase
      .from("doctors")
      .select("id, name, practice_name")
      .eq("email", doctor_email)
      .single();

    if (docErr || !doctor) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Doctor not found" }),
      };
    }

    // Get all patients for this doctor
    const { data: patients } = await supabase
      .from("patients")
      .select("id, first_name, last_name, email")
      .eq("doctor_id", doctor.id);

    const patientIds = (patients || []).map(p => p.id);

    // Get visits with snapshot status
    const { data: visits } = await supabase
      .from("visits")
      .select("id, patient_id, scheduled_for, visit_type, status")
      .eq("doctor_id", doctor.id)
      .order("scheduled_for", { ascending: true });

    // Get snapshots for these visits
    const visitIds = (visits || []).map(v => v.id);
    const { data: snapshots } = await supabase
      .from("snapshots")
      .select("id, visit_id")
      .in("visit_id", visitIds.length > 0 ? visitIds : ["none"]);

    const snapshotMap = {};
    (snapshots || []).forEach(s => { snapshotMap[s.visit_id] = s.id; });

    // Get recent check-ins
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, patient_id, summary, urgency, status, messages, created_at")
      .in("patient_id", patientIds.length > 0 ? patientIds : ["none"])
      .order("created_at", { ascending: false })
      .limit(20);

    // Build patient lookup
    const patientMap = {};
    (patients || []).forEach(p => {
      patientMap[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email;
    });

    // Enrich visits with patient names and snapshot status
    const enrichedVisits = (visits || []).map(v => ({
      ...v,
      patient_name: patientMap[v.patient_id] || "Unknown",
      snapshot_id: snapshotMap[v.id] || null,
      snapshot_ready: !!snapshotMap[v.id],
    }));

    // Enrich check-ins with patient names
    const enrichedCheckins = (checkins || []).map(c => ({
      ...c,
      patient_name: patientMap[c.patient_id] || "Unknown",
    }));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        doctor,
        visits: enrichedVisits,
        checkins: enrichedCheckins,
      }),
    };
  } catch (err) {
    console.error("doctor-feed error:", err);
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

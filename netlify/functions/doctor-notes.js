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
    const { visit_id, action, note } = JSON.parse(event.body);

    if (!visit_id) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "visit_id required" }),
      };
    }

    // Get patient_id from visit
    const { data: visit } = await supabase
      .from("visits")
      .select("patient_id")
      .eq("id", visit_id)
      .single();

    const patientId = visit?.patient_id;

    if (action === "add" && note) {
      const { error } = await supabase.from("doctor_notes").insert({
        patient_id: patientId,
        visit_id,
        note,
      });
      if (error) {
        console.error("Insert note error:", error);
        return {
          statusCode: 500,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "Failed to save note" }),
        };
      }
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true }),
      };
    }

    if (action === "list") {
      // Get all notes for this patient (across all visits)
      const { data: notes, error } = await supabase
        .from("doctor_notes")
        .select("id, note, visit_id, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("List notes error:", error);
      }

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ notes: notes || [] }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (err) {
    console.error("doctor-notes error:", err);
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

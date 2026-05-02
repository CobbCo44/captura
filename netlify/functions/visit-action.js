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
    const { visit_id, action, scheduled_for, doctor_email } = JSON.parse(event.body);

    if (!visit_id || !action) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "visit_id and action required" }),
      };
    }

    if (action === "complete") {
      const { error } = await supabase
        .from("visits")
        .update({ status: "completed" })
        .eq("id", visit_id);

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: !error }),
      };
    }

    if (action === "schedule-followup" && scheduled_for) {
      // Get patient and doctor from original visit
      const { data: visit } = await supabase
        .from("visits")
        .select("patient_id, doctor_id")
        .eq("id", visit_id)
        .single();

      if (!visit) {
        return {
          statusCode: 404,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "Visit not found" }),
        };
      }

      const { error } = await supabase.from("visits").insert({
        patient_id: visit.patient_id,
        doctor_id: visit.doctor_id,
        scheduled_for,
        visit_type: "follow-up",
        status: "scheduled",
      });

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: !error }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (err) {
    console.error("visit-action error:", err);
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

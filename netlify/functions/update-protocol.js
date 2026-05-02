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
    const { patient_id, visit_id, doctor_email, protocol } = JSON.parse(event.body);

    let patientId = patient_id;
    if (!patientId && visit_id) {
      const { data: visit } = await supabase
        .from("visits")
        .select("patient_id")
        .eq("id", visit_id)
        .single();
      patientId = visit?.patient_id;
    }

    if (!patientId || !protocol) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "patient_id or visit_id and protocol required" }),
      };
    }

    // Get doctor ID
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("email", doctor_email)
      .single();

    if (!doctor) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Doctor not found" }),
      };
    }

    // Deactivate any existing active protocols for this patient
    await supabase
      .from("protocols")
      .update({ active: false })
      .eq("patient_id", patientId)
      .eq("active", true);

    // Insert new protocol
    const { data: newProtocol, error: insertErr } = await supabase
      .from("protocols")
      .insert({
        patient_id,
        set_by_doctor_id: doctor.id,
        protocol,
        active: true,
        effective_from: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert protocol error:", insertErr);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Failed to save protocol" }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        protocol_id: newProtocol.id,
        message: "Protocol updated successfully",
      }),
    };
  } catch (err) {
    console.error("update-protocol error:", err);
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

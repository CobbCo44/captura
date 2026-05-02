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
    const { doctor_email, patient_email, first_name, last_name, visit_date, visit_type } = JSON.parse(event.body);

    if (!doctor_email || !patient_email) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "doctor_email and patient_email required" }),
      };
    }

    // Get doctor
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

    // Check if patient already exists
    let { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("email", patient_email)
      .single();

    if (!patient) {
      // Create patient record
      const { data: newPatient, error: patErr } = await supabase
        .from("patients")
        .insert({
          email: patient_email,
          first_name: first_name || null,
          last_name: last_name || null,
          doctor_id: doctor.id,
        })
        .select("id")
        .single();

      if (patErr) {
        console.error("Create patient error:", patErr);
        return {
          statusCode: 500,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "Failed to create patient" }),
        };
      }
      patient = newPatient;
    }

    // Create visit if date provided
    if (visit_date) {
      const { error: visitErr } = await supabase.from("visits").insert({
        patient_id: patient.id,
        doctor_id: doctor.id,
        scheduled_for: visit_date,
        visit_type: visit_type || "initial",
        status: "scheduled",
      });
      if (visitErr) console.error("Create visit error:", visitErr);
    }

    // Send magic link invite to patient
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(patient_email, {
      redirectTo: "https://catchcare.netlify.app/patient/",
    });

    if (inviteErr) {
      console.error("Invite error:", inviteErr);
      // Patient may already have an account, that's fine
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        patient_id: patient.id,
        message: `Invitation sent to ${patient_email}`,
      }),
    };
  } catch (err) {
    console.error("invite-patient error:", err);
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

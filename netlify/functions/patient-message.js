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
    const { patient_email, message, action, message_id, doctor_reply } = JSON.parse(event.body);

    const { data: patient } = await supabase
      .from("patients")
      .select("id, doctor_id")
      .eq("email", patient_email)
      .single();

    if (!patient) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Patient not found" }),
      };
    }

    // List messages
    if (action === "list") {
      const { data: messages } = await supabase
        .from("patient_messages")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(20);

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ messages: messages || [] }),
      };
    }

    // Doctor reply
    if (action === "reply" && message_id && doctor_reply) {
      const { error } = await supabase
        .from("patient_messages")
        .update({
          doctor_reply,
          replied_at: new Date().toISOString(),
          status: "replied",
        })
        .eq("id", message_id);

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: !error }),
      };
    }

    // Send new message
    if (message) {
      const { error } = await supabase.from("patient_messages").insert({
        patient_id: patient.id,
        doctor_id: patient.doctor_id,
        message,
        status: "new",
      });

      if (error) {
        console.error("Insert message error:", error);
        return {
          statusCode: 500,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "Failed to send message" }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid request" }),
    };
  } catch (err) {
    console.error("patient-message error:", err);
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

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
    const { visit_id, patient_id } = JSON.parse(event.body);

    let patId = patient_id;
    if (!patId && visit_id) {
      const { data: visit } = await supabase
        .from("visits")
        .select("patient_id")
        .eq("id", visit_id)
        .single();
      patId = visit?.patient_id;
    }

    if (!patId) {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ protocol: null }),
      };
    }

    const { data: protocol } = await supabase
      .from("protocols")
      .select("protocol, effective_from")
      .eq("patient_id", patId)
      .eq("active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .single();

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ protocol: protocol?.protocol || null }),
    };
  } catch (err) {
    console.error("get-protocol error:", err);
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

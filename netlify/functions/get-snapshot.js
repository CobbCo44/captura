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
    const { visit_id, snapshot_id } = JSON.parse(event.body);

    let query = supabase.from("snapshots").select("*");

    if (snapshot_id) {
      query = query.eq("id", snapshot_id);
    } else if (visit_id) {
      query = query.eq("visit_id", visit_id);
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "visit_id or snapshot_id required" }),
      };
    }

    const { data: snapshot, error } = await query.single();

    if (error || !snapshot) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Snapshot not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        id: snapshot.id,
        content: snapshot.content,
        patient_content: snapshot.patient_content,
        rendered_html: snapshot.rendered_html,
        created_at: snapshot.created_at,
      }),
    };
  } catch (err) {
    console.error("get-snapshot error:", err);
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

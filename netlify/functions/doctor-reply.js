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
    const { checkin_id, reply, action } = JSON.parse(event.body);

    if (!checkin_id) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "checkin_id required" }),
      };
    }

    if (action === "reviewed") {
      const { error } = await supabase
        .from("checkins")
        .update({ status: "reviewed" })
        .eq("id", checkin_id);

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: !error }),
      };
    }

    if (reply) {
      const { error } = await supabase
        .from("checkins")
        .update({
          doctor_reply: reply,
          status: "actioned",
        })
        .eq("id", checkin_id);

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: !error }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "reply or action required" }),
    };
  } catch (err) {
    console.error("doctor-reply error:", err);
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

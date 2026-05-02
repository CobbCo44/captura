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
    const { email, password, name, practice_name, specialty } = JSON.parse(event.body);

    if (!email || !password || !name) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Email, password, and name are required" }),
      };
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authErr) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: authErr.message }),
      };
    }

    // Create doctor record
    const { error: docErr } = await supabase.from("doctors").insert({
      email,
      name,
      practice_name: practice_name || null,
      specialty: specialty || null,
    });

    if (docErr) {
      console.error("Insert doctor error:", docErr);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Account created but profile setup failed. Please contact support." }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("doctor-onboard error:", err);
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

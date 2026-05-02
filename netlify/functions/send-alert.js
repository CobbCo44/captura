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
    const { to, subject, body } = JSON.parse(event.body);

    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "to, subject, and body required" }),
      };
    }

    // Use Supabase edge function or direct SMTP
    // For now, use Supabase Auth admin to send a custom email
    // via the auth.admin.sendRawEmail or a simple fetch to an email API

    // Since we don't have Resend wired yet, log the alert and store it
    console.log(`ESCALATION ALERT to ${to}: ${subject}`);
    console.log(body);

    // Store alert in a simple table so it's not lost
    await supabase.from("alerts").insert({
      recipient: to,
      subject,
      body,
      sent: false,
    }).catch(() => {
      // alerts table may not exist yet, that's ok
      console.log("Alert stored in logs only (alerts table not yet created)");
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, note: "Alert logged. Email delivery requires Resend integration." }),
    };
  } catch (err) {
    console.error("send-alert error:", err);
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

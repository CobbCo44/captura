const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function callClaude(system, messages, model = "claude-sonnet-4-6") {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }
  return res.json();
}

const LAB_PARSE_PROMPT = `You are a lab results parser. Extract all lab values from the provided document into a structured JSON object.

Return a JSON object where each key is the lab marker name, and each value is an object with:
- "value": the numeric or text value
- "unit": the unit of measurement
- "reference": the reference range if provided
- "flag": "high", "low", or "normal" based on the reference range. If no reference range, omit this field.

Example:
{
  "Hemoglobin": {"value": "14.2", "unit": "g/dL", "reference": "13.5-17.5", "flag": "normal"},
  "TSH": {"value": "6.8", "unit": "mIU/L", "reference": "0.4-4.0", "flag": "high"}
}

Rules:
- Extract ALL values you can find, not just common ones
- Use standard marker names
- If a value has no unit listed, use the most common unit for that marker
- Return ONLY the JSON object, no other text`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const { file_name, file_base64, drawn_at } = JSON.parse(event.body);

    if (!file_base64) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "file_base64 required" }),
      };
    }

    // Get patient from auth token
    const authHeader = event.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    let patientId = null;

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: patient } = await supabase
          .from("patients")
          .select("id")
          .eq("email", user.email)
          .single();
        if (patient) patientId = patient.id;
      }
    }

    // Store PDF in Supabase Storage
    const fileName = `${patientId || "unknown"}/${Date.now()}_${file_name}`;
    const fileBuffer = Buffer.from(file_base64, "base64");

    const { error: uploadErr } = await supabase.storage
      .from("labs")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      // Continue even if storage fails — still parse the labs
    }

    // Send PDF to Claude for parsing
    const response = await callClaude(LAB_PARSE_PROMPT, [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: file_base64,
            },
          },
          {
            type: "text",
            text: "Parse all lab values from this document.",
          },
        ],
      },
    ]);

    const resultText = response.content[0].text;
    let parsedValues;
    try {
      const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedValues = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse lab JSON:", parseErr);
      parsedValues = {};
    }

    // Store in labs table
    const { data: labRecord, error: insertErr } = await supabase
      .from("labs")
      .insert({
        patient_id: patientId,
        storage_path: uploadErr ? null : fileName,
        parsed_values: parsedValues,
        drawn_at: drawn_at || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert lab error:", insertErr);
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        lab_id: labRecord?.id || null,
        parsed_values: parsedValues,
      }),
    };
  } catch (err) {
    console.error("parse-labs error:", err);
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

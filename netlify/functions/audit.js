// CatchCare Audit Logger
// Logs every significant system action with timestamps and context
// Used for HIPAA compliance, debugging, and safety review

const { createClient } = require("@supabase/supabase-js");

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return _supabase;
}

/**
 * Log an audit event.
 * @param {string} action - What happened (e.g., "intake_message", "snapshot_generated", "safety_trigger")
 * @param {object} context - Relevant details (patient_id, doctor_id, visit_id, etc.)
 * @param {string} [actor] - Who triggered the action (email or system)
 */
async function logAudit(action, context = {}, actor = "system") {
  try {
    const supabase = getSupabase();
    await supabase.from("audit_log").insert({
      action,
      actor,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("Audit log error (non-fatal):", err.message);
  }
}

module.exports = { logAudit };

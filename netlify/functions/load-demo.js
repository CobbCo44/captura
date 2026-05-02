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
    const { doctor_id } = JSON.parse(event.body);

    if (!doctor_id) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "doctor_id required" }),
      };
    }

    // Create 3 synthetic patients
    const patients = [
      { first_name: "Maria", last_name: "Santos", email: "demo-maria@catchcare.test" },
      { first_name: "Robert", last_name: "Chen", email: "demo-robert@catchcare.test" },
      { first_name: "Angela", last_name: "Wright", email: "demo-angela@catchcare.test" },
    ];

    const patientIds = [];
    for (const p of patients) {
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("email", p.email)
        .single();

      if (existing) {
        patientIds.push(existing.id);
        continue;
      }

      const { data: newPat } = await supabase
        .from("patients")
        .insert({ ...p, doctor_id })
        .select("id")
        .single();
      if (newPat) patientIds.push(newPat.id);
    }

    // Create visits
    const visits = [
      { patient_idx: 0, days: 2, type: "initial", status: "intake_complete" },
      { patient_idx: 1, days: 5, type: "follow-up", status: "scheduled" },
      { patient_idx: 2, days: 1, type: "initial", status: "intake_complete" },
    ];

    const visitIds = [];
    for (const v of visits) {
      const { data: visit } = await supabase
        .from("visits")
        .insert({
          patient_id: patientIds[v.patient_idx],
          doctor_id,
          scheduled_for: new Date(Date.now() + v.days * 86400000).toISOString(),
          visit_type: v.type,
          status: v.status,
        })
        .select("id")
        .single();
      if (visit) visitIds.push(visit.id);
    }

    // Create demo snapshots for completed intakes
    const demoSnapshots = [
      {
        patient_name: "Maria Santos",
        dob: "03/15/1978",
        visit_type: "Initial",
        patient_goal: "Evaluate persistent fatigue and weight gain despite dietary changes",
        since_last_visit: "No prior visits on record.",
        chief_complaint: "Fatigue worsening over past 3 months.\nUnexplained 15lb weight gain despite caloric reduction.\nBrain fog affecting work performance.",
        symptom_timeline: "6 months ago: mild fatigue, attributed to stress.\n3 months ago: fatigue worsening, weight gain began.\n1 month ago: brain fog, difficulty concentrating, cold intolerance.",
        current_protocol: "No medications.\nMultivitamin daily.\nReduced carbohydrate diet for 2 months with no improvement.",
        whats_been_tried: "Helped: extra sleep on weekends provides temporary relief.\nDid not help: low-carb diet, increased caffeine.\nMixed: exercise helps mood but exhaustion limits consistency.",
        relevant_history: "Gestational diabetes with second pregnancy (2019).\nFamily history: mother with Hashimoto's thyroiditis.",
        lab_summary: "No recent labs. Last bloodwork was 2 years ago, reported as normal by PCP.",
        considerations: "1. Symptom constellation of fatigue, weight gain, cold intolerance, and brain fog with family history of Hashimoto's warrants thyroid panel: TSH, free T4, free T3, TPO and thyroglobulin antibodies.\n2. Prior gestational diabetes and unexplained weight gain raise consideration for metabolic panel, fasting insulin, and HbA1c.\n3. Consider cortisol evaluation given chronic fatigue pattern.\n4. Vitamin D, iron panel, and B12 worth checking given fatigue and brain fog presentation.",
        between_visits_log: "No prior check-ins.",
      },
      {
        patient_name: "Angela Wright",
        dob: "11/22/1985",
        visit_type: "Initial",
        patient_goal: "Address chronic insomnia and explore non-pharmaceutical options",
        since_last_visit: "No prior visits on record.",
        chief_complaint: "Chronic insomnia for 18 months.\nTakes 1-2 hours to fall asleep.\nWakes 2-3 times per night.\nAveraging 4-5 hours total sleep.",
        symptom_timeline: "18 months ago: sleep disruption started after job change.\n12 months ago: pattern solidified, compensating with caffeine.\n6 months ago: daytime anxiety increased, tried melatonin without improvement.",
        current_protocol: "Melatonin 5mg nightly (no benefit).\nCaffeine: 3-4 cups coffee daily, last cup around 2pm.\nNo prescription sleep medications.",
        whats_been_tried: "Helped: hot bath before bed (modest), no screens after 9pm (mild).\nDid not help: melatonin at various doses, chamomile tea, white noise.\nNot tried: CBT-I, prescription medication, magnesium.",
        relevant_history: "Generalized anxiety diagnosed 2020, managed without medication.\nNo prior sleep studies.\nNo history of sleep apnea symptoms per patient.",
        lab_summary: "No labs discussed.",
        considerations: "1. 18-month chronic insomnia with anxiety comorbidity may benefit from CBT-I referral as first-line intervention.\n2. Caffeine intake of 3-4 cups daily with last cup at 2pm may still be contributing given slow metabolizer possibility. Consider trial of caffeine cutoff at noon or elimination.\n3. Melatonin at 5mg may be supraphysiologic. If continuing, consider reducing to 0.3-0.5mg taken 2 hours before target sleep time.\n4. Consider magnesium glycinate or threonate for sleep support. Rule out magnesium and iron deficiency which can contribute to restlessness.\n5. If symptoms persist, consider sleep study to rule out occult sleep apnea or periodic limb movement disorder.",
        between_visits_log: "No prior check-ins.",
      },
    ];

    // Insert snapshots
    for (let i = 0; i < demoSnapshots.length; i++) {
      const vidx = i === 0 ? 0 : 2; // Map to first and third visits
      if (visitIds[vidx]) {
        const snap = demoSnapshots[i];
        const patientSnap = { ...snap };
        delete patientSnap.considerations;

        await supabase.from("snapshots").insert({
          visit_id: visitIds[vidx],
          patient_id: patientIds[i === 0 ? 0 : 2],
          content: snap,
          patient_content: patientSnap,
          rendered_html: renderSnapshotHtml(snap),
        });
      }
    }

    // Create a demo check-in
    await supabase.from("checkins").insert({
      patient_id: patientIds[0],
      messages: [
        { role: "assistant", content: "Hi Maria! Thanks for checking in. How have things been going since your last visit?" },
        { role: "user", content: "The fatigue is still there but I noticed my hands are really dry and cracking, which is new. Also getting headaches in the afternoon almost every day now." },
        { role: "assistant", content: "I'm sorry to hear the fatigue is persisting. The dry, cracking skin and new afternoon headaches are definitely worth noting. How long have the headaches been going on, and would you say they're mild, moderate, or more intense?" },
        { role: "user", content: "About 2 weeks for the headaches. Moderate, like a dull pressure behind my eyes. Tylenol helps a little but they come back." },
        { role: "assistant", content: "Got it. Dull pressure behind the eyes, recurring daily for about 2 weeks, partially responsive to Tylenol. That's all really useful information. Has anything else changed recently, like your diet, sleep, or stress levels?" },
        { role: "user", content: "Sleep is about the same, maybe slightly worse. Stress is normal. I've been drinking more water because of the dry skin but it doesn't seem to help." },
        { role: "assistant", content: "Thanks for all of that, Maria. I've logged everything for your doctor. The combination of persistent fatigue, new skin changes, and recurring headaches is the kind of pattern they'll want to look at together. You can come back here anytime if anything else changes." },
      ],
      summary: "Persistent fatigue, new dry/cracking skin, daily afternoon headaches for 2 weeks. Possible thyroid-related symptom progression.",
      urgency: "digest",
      status: "new",
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        message: "Demo data loaded: 3 patients, 3 visits, 2 snapshots, 1 check-in",
      }),
    };
  } catch (err) {
    console.error("load-demo error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function renderSnapshotHtml(s) {
  const section = (title, content) => {
    if (!content || content === "Not discussed during intake.") return "";
    const lines = content.split("\\n").join("\n").split("\n").filter(l => l.trim());
    const body = lines.length > 1
      ? "<ul>" + lines.map(l => `<li>${esc(l.replace(/^[-•]\s*/, ""))}</li>`).join("") + "</ul>"
      : `<p>${esc(content)}</p>`;
    return `<div class="snap-section"><h3>${esc(title)}</h3>${body}</div>`;
  };
  const esc = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<div class="snapshot">
  <div class="snap-header"><h2>PRE-VISIT CLINICAL SNAPSHOT</h2><p class="snap-meta">AI-assisted intake — Decision support, not a diagnostic instrument</p></div>
  <div class="snap-patient-info">
    <div><strong>Patient:</strong> ${esc(s.patient_name)}</div><div><strong>DOB:</strong> ${esc(s.dob)}</div>
    <div><strong>Visit type:</strong> ${esc(s.visit_type)}</div><div><strong>Patient goal:</strong> ${esc(s.patient_goal)}</div>
  </div>
  ${section("Since Last Visit", s.since_last_visit)}${section("Chief Complaint", s.chief_complaint)}
  ${section("Symptom Timeline", s.symptom_timeline)}${section("Current Protocol", s.current_protocol)}
  ${section("What's Been Tried", s.whats_been_tried)}${section("Relevant History", s.relevant_history)}
  ${section("Lab Summary", s.lab_summary)}
  <div class="snap-section snap-considerations"><h3>Considerations for Physician Review</h3>
    <p class="snap-warning">Pattern-based hypotheses for clinical evaluation — not diagnoses.</p>
    ${s.considerations ? "<ul>" + s.considerations.split("\\n").join("\n").split("\n").filter(l => l.trim()).map(l => `<li>${esc(l.replace(/^\d+\.\s*/, ""))}</li>`).join("") + "</ul>" : ""}
  </div>
  ${section("Between-Visits Patient Log", s.between_visits_log)}
</div>`;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Realistic demo snapshots keyed by patient name (fallback to generic if no match)
const DEMO_PROFILES = {
  "Sarah Miller": {
    dob: "07/12/1990",
    visit_type: "Initial",
    patient_goal: "Investigate recurring digestive issues and fatigue after meals",
    since_last_visit: "No prior visits on record.",
    chief_complaint:
      "Bloating and abdominal discomfort after most meals for past 4 months.\nFatigue that worsens after eating, especially carb-heavy meals.\nIntermittent brain fog in the afternoons.",
    symptom_timeline:
      "6 months ago: occasional bloating, assumed stress-related.\n4 months ago: bloating became daily, started tracking food.\n2 months ago: added fatigue and brain fog, noticed wheat and dairy seem worse.\n2 weeks ago: tried removing gluten on her own, modest improvement in bloating.",
    current_protocol:
      "No prescription medications.\nDaily probiotic (generic brand, 10B CFU).\nSelf-directed gluten-free trial for 2 weeks.",
    whats_been_tried:
      "Helped: removing gluten reduced bloating by ~50%.\nDid not help: peppermint tea, OTC antacids.\nNot tried: comprehensive elimination diet, digestive enzymes, stool testing.",
    relevant_history:
      "Iron deficiency noted 2 years ago, resolved with supplementation.\nNo prior GI workup.\nFamily history: mother with celiac disease diagnosed at age 45.",
    lab_summary:
      "No recent labs. Iron was low-normal 2 years ago per PCP.",
    considerations:
      "1. Family history of celiac disease combined with symptom improvement on gluten-free diet warrants celiac panel (tTG-IgA, total IgA) while patient is still consuming some gluten, or has recently reintroduced.\n2. Post-meal fatigue and brain fog with carbohydrate sensitivity raises consideration for fasting insulin, HbA1c, and glucose tolerance assessment.\n3. Prior iron deficiency plus GI symptoms may indicate malabsorption. Recheck ferritin, iron panel, B12, folate, and vitamin D.\n4. Consider comprehensive stool analysis to evaluate microbiome, digestive enzyme output, and inflammatory markers.\n5. If celiac panel is negative, consider broader food sensitivity evaluation or supervised elimination protocol.",
    between_visits_log: "No prior check-ins.",
  },
  "Robert Chen": {
    dob: "03/28/1982",
    visit_type: "Follow-up",
    patient_goal: "Review progress on sleep optimization protocol and reassess energy levels",
    since_last_visit:
      "Last visit 8 weeks ago. Started magnesium glycinate 400mg nightly, reduced caffeine to 1 cup before 10am, began wind-down routine at 9pm.",
    chief_complaint:
      "Sleep onset improved from 45 minutes to ~20 minutes.\nStill waking at 3-4am most nights, unable to return to sleep.\nMorning energy improved slightly but afternoon crashes persist.",
    symptom_timeline:
      "Initial visit: 45-min sleep onset, frequent waking, severe daytime fatigue.\n6 weeks ago: sleep onset improved after magnesium and caffeine changes.\n4 weeks ago: 3am waking pattern became consistent.\n2 weeks ago: noticed correlation between evening stress and worse nights.",
    current_protocol:
      "Magnesium glycinate 400mg at bedtime.\nCaffeine limited to 1 cup before 10am.\n9pm wind-down routine (no screens, dim lights).\nMelatonin 0.5mg added 3 weeks ago per previous recommendation.",
    whats_been_tried:
      "Helped: magnesium improved sleep onset significantly, caffeine reduction reduced jitteriness.\nPartially helped: melatonin 0.5mg may be helping onset but not maintenance.\nDid not help: valerian root (caused vivid dreams), sleep app guided meditations.\nNot tried: cortisol mapping, CBT-I, prescription options.",
    relevant_history:
      "High-stress tech role, averaging 50+ hour weeks.\nNo history of sleep apnea. BMI 24.\nAnxiety managed with exercise, no medications.\nPrior labs showed vitamin D at 22 ng/mL (supplementing 5000 IU daily since).",
    lab_summary:
      "Vitamin D was 22 ng/mL at initial visit, now supplementing. No repeat level yet.\nAll other initial labs within range. TSH 2.1, CBC normal.",
    considerations:
      "1. Consistent 3-4am waking pattern with inability to return to sleep is a classic cortisol dysregulation pattern. Four-point salivary cortisol (or DUTCH) would clarify HPA axis status.\n2. Consider adding phosphatidylserine 100-200mg at bedtime if cortisol is elevated in early morning hours.\n3. Recheck vitamin D level to confirm supplementation has reached 50+ ng/mL target.\n4. Afternoon energy crashes despite improved sleep suggest possible blood sugar dysregulation. Consider CGM trial or post-meal glucose monitoring.\n5. If cortisol mapping confirms dysregulation, adaptogenic support (ashwagandha KSM-66) may be appropriate alongside stress management strategies.",
    between_visits_log:
      "Patient checked in 3 weeks ago reporting the 3am waking pattern. Was advised to try melatonin 0.5mg and track sleep/wake times in a journal.",
  },
  "Ryan Cobb": {
    dob: "09/05/1995",
    visit_type: "Initial",
    patient_goal: "Evaluate joint pain and low energy that started after a viral illness",
    since_last_visit: "No prior visits on record.",
    chief_complaint:
      "Persistent joint stiffness in hands and knees, worse in the morning.\nFatigue that does not improve with rest.\nBrain fog and difficulty concentrating at work.",
    symptom_timeline:
      "3 months ago: had a flu-like illness lasting 10 days.\n2.5 months ago: expected recovery but fatigue persisted.\n2 months ago: joint stiffness appeared, initially in hands.\n1 month ago: knees added, morning stiffness lasting 30-60 minutes. Brain fog became noticeable.",
    current_protocol:
      "Ibuprofen 400mg as needed (2-3x per week).\nFish oil 2g daily.\nNo other supplements or medications.",
    whats_been_tried:
      "Helped: ibuprofen provides temporary relief for 4-6 hours.\nDid not help: extra sleep, reduced exercise (made stiffness worse).\nNot tried: anti-inflammatory diet, autoimmune workup, post-viral evaluation.",
    relevant_history:
      "No prior joint issues or autoimmune conditions.\nActive lifestyle, recreational basketball 2x/week (currently reduced due to symptoms).\nNo family history of rheumatoid arthritis. Mother has Hashimoto's.",
    lab_summary: "No recent labs since the viral illness.",
    considerations:
      "1. Post-viral onset of joint stiffness, fatigue, and cognitive symptoms raises concern for post-viral inflammatory syndrome. Consider CRP, ESR, and ferritin to assess systemic inflammation.\n2. Morning stiffness lasting 30-60 minutes with bilateral hand and knee involvement warrants rheumatologic screening: RF, anti-CCP, ANA.\n3. Family history of Hashimoto's plus post-viral presentation increases autoimmune risk. Add thyroid panel (TSH, free T4, free T3, TPO antibodies).\n4. Post-viral fatigue with brain fog may benefit from evaluation of iron panel, B12, vitamin D, and metabolic panel.\n5. Consider EBV and CMV titers if initial viral illness was not definitively identified, as reactivation can drive prolonged symptoms.",
    between_visits_log: "No prior check-ins.",
  },
};

// Generic fallback for any patient not in the profiles above
function genericSnapshot(patientName, visitType) {
  return {
    patient_name: patientName,
    dob: "01/01/1985",
    visit_type: visitType === "follow-up" ? "Follow-up" : "Initial",
    patient_goal: "General health evaluation and wellness optimization",
    since_last_visit: visitType === "follow-up" ? "Last visit was several weeks ago." : "No prior visits on record.",
    chief_complaint: "Low energy and general fatigue for the past several weeks.\nDifficulty maintaining focus during the workday.\nOccasional headaches in the late afternoon.",
    symptom_timeline: "8 weeks ago: noticed gradual decline in energy.\n4 weeks ago: focus issues became more apparent.\n2 weeks ago: afternoon headaches started, 2-3x per week.",
    current_protocol: "Multivitamin daily.\nNo prescription medications.",
    whats_been_tried: "Helped: improving sleep schedule slightly improved morning energy.\nDid not help: increasing caffeine intake.\nNot tried: comprehensive lab work, dietary changes.",
    relevant_history: "No significant medical history.\nNo known allergies.\nNo prior lab work in the past 2 years.",
    lab_summary: "No recent labs available.",
    considerations: "1. Persistent fatigue and cognitive symptoms warrant comprehensive metabolic panel, CBC, thyroid panel (TSH, free T4), iron/ferritin, B12, and vitamin D.\n2. Afternoon headaches may correlate with dehydration, blood sugar fluctuations, or eye strain. Consider tracking hydration and meal timing.\n3. Baseline hormonal panel may be appropriate depending on age and symptom duration.",
    between_visits_log: "No prior check-ins.",
  };
}

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

    // Get all visits for this doctor
    const { data: visits } = await supabase
      .from("visits")
      .select("id, patient_id, visit_type, status")
      .eq("doctor_id", doctor_id);

    if (!visits || visits.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true, message: "No visits found.", seeded: 0 }),
      };
    }

    // Get existing snapshots to skip
    const visitIds = visits.map((v) => v.id);
    const { data: existingSnapshots } = await supabase
      .from("snapshots")
      .select("visit_id")
      .in("visit_id", visitIds);

    const hasSnapshot = new Set((existingSnapshots || []).map((s) => s.visit_id));

    // Filter to visits without snapshots
    const needsSnapshot = visits.filter((v) => !hasSnapshot.has(v.id));

    if (needsSnapshot.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true, message: "All visits already have snapshots.", seeded: 0 }),
      };
    }

    // Get patient names
    const patientIds = [...new Set(needsSnapshot.map((v) => v.patient_id))];
    const { data: patients } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .in("id", patientIds);

    const patientMap = {};
    (patients || []).forEach((p) => {
      patientMap[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim();
    });

    // Track which profiles we've used per patient to avoid exact duplicates
    const usedForPatient = new Set();
    let seeded = 0;

    for (const visit of needsSnapshot) {
      const patientName = patientMap[visit.patient_id] || "Unknown Patient";
      const profileKey = patientName;
      const visitType = visit.visit_type || "initial";

      // Build snapshot content
      let snapContent;
      if (DEMO_PROFILES[profileKey] && !usedForPatient.has(visit.patient_id)) {
        snapContent = { patient_name: patientName, ...DEMO_PROFILES[profileKey] };
        usedForPatient.add(visit.patient_id);
      } else {
        snapContent = genericSnapshot(patientName, visitType);
      }

      const patientContent = { ...snapContent };
      delete patientContent.considerations;

      await supabase.from("snapshots").insert({
        visit_id: visit.id,
        patient_id: visit.patient_id,
        content: snapContent,
        patient_content: patientContent,
        rendered_html: renderSnapshotHtml(snapContent),
      });

      // Update visit status to intake_complete
      await supabase
        .from("visits")
        .update({ status: "intake_complete" })
        .eq("id", visit.id);

      seeded++;
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        message: `Demo snapshots created for ${seeded} visit${seeded === 1 ? "" : "s"}.`,
        seeded,
      }),
    };
  } catch (err) {
    console.error("seed-snapshots error:", err);
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
    const lines = content.split("\\n").join("\n").split("\n").filter((l) => l.trim());
    const body =
      lines.length > 1
        ? "<ul>" + lines.map((l) => `<li>${esc(l.replace(/^[-•]\s*/, ""))}</li>`).join("") + "</ul>"
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
    ${s.considerations ? "<ul>" + s.considerations.split("\\n").join("\n").split("\n").filter((l) => l.trim()).map((l) => `<li>${esc(l.replace(/^\d+\.\s*/, ""))}</li>`).join("") + "</ul>" : ""}
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

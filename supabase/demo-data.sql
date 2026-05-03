DO $$
DECLARE
  doc_id uuid := '1800fe98-6a36-4011-bbfb-cb6660c06c44';
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  p3 uuid := gen_random_uuid();
  p4 uuid := gen_random_uuid();
  p5 uuid := gen_random_uuid();
  v1 uuid := gen_random_uuid();
  v2 uuid := gen_random_uuid();
  v3 uuid := gen_random_uuid();
  v4 uuid := gen_random_uuid();
  v5 uuid := gen_random_uuid();
  v6 uuid := gen_random_uuid();
BEGIN

INSERT INTO patients (id, email, first_name, last_name, dob, doctor_id) VALUES
  (p1, 'demo-eric@catchcare.test', 'Eric', 'Thompson', '1979-04-12', doc_id),
  (p2, 'demo-lisa@catchcare.test', 'Lisa', 'Nakamura', '1988-11-03', doc_id),
  (p3, 'demo-david@catchcare.test', 'David', 'Reeves', '1972-07-22', doc_id),
  (p4, 'demo-rachel@catchcare.test', 'Rachel', 'Kim', '1995-02-14', doc_id),
  (p5, 'demo-marcus@catchcare.test', 'Marcus', 'Johnson', '1983-09-30', doc_id);

INSERT INTO visits (id, patient_id, doctor_id, scheduled_for, visit_type, status) VALUES
  (v1, p1, doc_id, (current_date + interval '9 hours'), 'follow-up', 'intake_complete'),
  (v2, p2, doc_id, (current_date + interval '10 hours'), 'initial', 'intake_complete'),
  (v3, p3, doc_id, (current_date + interval '14 hours'), 'follow-up', 'intake_complete'),
  (v4, p4, doc_id, (current_date + interval '2 days 9 hours'), 'initial', 'scheduled'),
  (v5, p5, doc_id, (current_date + interval '3 days 11 hours'), 'follow-up', 'intake_complete'),
  (v6, p1, doc_id, (current_date - interval '30 days'), 'initial', 'completed');

INSERT INTO snapshots (visit_id, patient_id, content, patient_content, rendered_html) VALUES
(v1, p1,
'{"patient_name":"Eric Thompson","dob":"04/12/1979","visit_type":"Follow-up","patient_goal":"Re-evaluate TRT protocol and address persistent fatigue despite dose increase","since_last_visit":"Increased testosterone cypionate from 100mg to 140mg/week 6 weeks ago. Fatigue improved for 2 weeks then plateaued. New symptom: night sweats started 3 weeks ago. Sleep quality declined.","chief_complaint":"Persistent fatigue despite TRT dose increase. New onset night sweats 3 weeks ago, occurring 3-4 nights per week. Brain fog returned after initial improvement.","symptom_timeline":"6 weeks ago: dose increase to 140mg/week, initial improvement. 4 weeks ago: energy gains plateaued. 3 weeks ago: night sweats began. 2 weeks ago: brain fog returned.","current_protocol":"TRT: Testosterone cypionate 140mg/week, split 2x weekly IM. Anastrozole 0.25mg 2x/week. DHEA 25mg daily. Vitamin D3 5000IU daily. Magnesium glycinate 400mg nightly.","whats_been_tried":"Helped: splitting dose to 2x weekly. Did not help: increasing dose. Not tried: HCG, alternative delivery.","relevant_history":"On TRT 18 months. Initial total T 285. Family history: father type 2 diabetes. No cardiovascular history.","lab_summary":"Total testosterone: 1180 ng/dL (high). Free testosterone: 28 pg/mL. Estradiol (sensitive): 58 pg/mL (elevated). Hematocrit: 52.1% (borderline high). PSA: 0.8.","considerations":"1. Estradiol at 58 driving night sweats. Consider increasing anastrozole. 2. Hematocrit 52.1% approaching phlebotomy threshold. 3. Total T at 1180 is supraphysiologic. Consider dose reduction to 120mg/week. 4. Night sweats + elevated E2 + high hematocrit suggest over-replacement. 5. Consider HCG if testicular atrophy or fertility is concern.","between_visits_log":"Day 10: Night sweats 4 nights in a row. Day 18: Afternoon energy crash daily. Day 25: Asked about switching to pellets."}'::jsonb,
'{}'::jsonb, ''),

(v2, p2,
'{"patient_name":"Lisa Nakamura","dob":"11/03/1988","visit_type":"Initial","patient_goal":"Evaluate chronic migraine pattern and explore hormonal connection","since_last_visit":"No prior visits.","chief_complaint":"Chronic migraines 12-15 days/month for 2 years. Cluster around menstrual cycle days 1-3 and 14-16. Sumatriptan losing effectiveness. Missed 8 work days last quarter.","symptom_timeline":"2 years ago: migraines increased after stopping OCP. 18 months ago: started sumatriptan. 6 months ago: rebound headaches emerging. 3 months ago: added mag and B2, minimal help.","current_protocol":"Sumatriptan 100mg PRN (10-12/month). Magnesium oxide 400mg daily. Riboflavin 400mg daily.","whats_been_tried":"Helped: dark room + ice. Did not help: NSAIDs, caffeine restriction. Mixed: sumatriptan works but causing rebound.","relevant_history":"Migraines since 16, controlled on OCP. Discontinued OCP 2 years ago (BP concerns). BP 128/82. No aura. Grandmother had migraines.","lab_summary":"No recent labs. Requests hormone panel.","considerations":"1. Menstrual migraine pattern suggests hormonal trigger. Check estradiol/progesterone/SHBG day 3 and 21. 2. Sumatriptan 10-12/month is medication overuse territory. Taper needed. 3. Preventive options: CGRP inhibitors, topiramate, propranolol. 4. Consider estradiol patch during perimenstrual window. 5. Switch magnesium oxide to glycinate.","between_visits_log":"No prior check-ins."}'::jsonb,
'{}'::jsonb, ''),

(v3, p3,
'{"patient_name":"David Reeves","dob":"07/22/1972","visit_type":"Follow-up","patient_goal":"Review gut protocol results and address new joint pain","since_last_visit":"Started 4R gut protocol 8 weeks ago. GI improved 60%. New: bilateral joint stiffness in knees and hands.","chief_complaint":"New bilateral joint stiffness, onset 3 weeks ago. Morning stiffness 30-45 minutes daily. GI improved but persistent evening bloating.","symptom_timeline":"8 weeks ago: started gut protocol. 5 weeks ago: bloating reduced by half. 3 weeks ago: joint stiffness appeared. 1 week ago: affecting grip strength.","current_protocol":"L-glutamine 5g 2x daily. Zinc carnosine 75mg 2x daily. Berberine 500mg 3x daily. S. boulardii probiotic. AIP elimination diet.","whats_been_tried":"Helped: elimination diet, L-glutamine. Did not help: probiotics alone. Not tried: anything for joints yet.","relevant_history":"Chronic GI 5 years. Colonoscopy 2 years ago: mild inflammation. Father: RA diagnosed at 55. No prior joint complaints.","lab_summary":"CRP: 4.2 (was 2.1). ESR: 18. Calprotectin: 95 (was 210). B12: 380. Vitamin D: 42.","considerations":"1. Bilateral symmetric stiffness + family RA history warrants autoimmune workup: RF, anti-CCP, ANA. 2. CRP rising despite gut improvement suggests systemic inflammation. 3. Consider cycling off berberine after 8 weeks. 4. Gut protocol working. Continue. 5. If autoimmune markers positive, rheumatology referral.","between_visits_log":"Day 14: GI much better. Day 28: Knee stiffness. Day 35: Hands stiff too. Worried about RA like father."}'::jsonb,
'{}'::jsonb, ''),

(v5, p5,
'{"patient_name":"Marcus Johnson","dob":"09/30/1983","visit_type":"Follow-up","patient_goal":"Optimize sleep and assess adrenal recovery","since_last_visit":"Started ashwagandha and phosphatidylserine 8 weeks ago. Sleep improved from 4-5 to 6-6.5 hours. Cortisol recheck pending. Afternoon crash persists.","chief_complaint":"Persistent 3pm energy crash. Waking at 3-4am most nights. Anxiety reduced but not resolved.","symptom_timeline":"6 months ago: HPA axis dysfunction diagnosed. 8 weeks ago: started adaptogens. 6 weeks ago: sleep improved. 4 weeks ago: 3am waking emerged.","current_protocol":"Ashwagandha KSM-66 600mg bedtime. Phosphatidylserine 200mg bedtime. Vitamin C 1000mg 2x daily. Methylated B-complex AM. Magnesium threonate 400mg bedtime. No caffeine after 11am.","whats_been_tried":"Helped: ashwagandha reduced anxiety, mag threonate helps fall asleep. Did not help: melatonin, valerian. Mixed: caffeine cutoff helps but crash worse without PM coffee.","relevant_history":"HPA dysfunction: flat cortisol curve (AM 4.2, ref 10-20). Startup founder, 80hr weeks x 3 years. TSH 2.1.","lab_summary":"Pending: repeat cortisol saliva test. DHEA-S: 180 (low-normal). Glucose: 92. HbA1c: 5.3%.","considerations":"1. 3am waking is classic cortisol dysregulation. Pending saliva test will clarify. 2. 3pm crash may reflect cortisol nadir. Consider licorice root 200mg with lunch. 3. DHEA-S low-normal. Consider DHEA 10-25mg AM. 4. Sleep progress is meaningful. 5. If cortisol improving, introduce morning exercise.","between_visits_log":"Day 20: Sleep averaging 6.2hrs. Day 35: 3am wake-ups consistent, 45-60min awake."}'::jsonb,
'{}'::jsonb, '');

INSERT INTO protocols (patient_id, set_by_doctor_id, protocol, active, effective_from) VALUES
(p1, doc_id, '{"medications":"Testosterone cypionate 140mg/week split 2x IM. Anastrozole 0.25mg 2x weekly.","supplements":"DHEA 25mg daily. Vitamin D3 5000IU daily. Magnesium glycinate 400mg nightly.","instructions":"Recheck labs 6 weeks post-adjustment. Monitor hematocrit. Report chest pain or severe headaches."}'::jsonb, true, now() - interval '6 weeks'),
(p3, doc_id, '{"medications":"None","supplements":"L-glutamine 5g 2x daily. Zinc carnosine 75mg 2x daily. Berberine 500mg 3x daily. S. boulardii probiotic.","instructions":"AIP elimination diet. Food journal daily. Reintroduce foods every 2 weeks starting week 10."}'::jsonb, true, now() - interval '8 weeks'),
(p5, doc_id, '{"medications":"None","supplements":"Ashwagandha KSM-66 600mg bedtime. Phosphatidylserine 200mg bedtime. Vitamin C 1000mg 2x daily. Methylated B-complex AM. Magnesium threonate 400mg bedtime.","instructions":"No caffeine after 11am. Lights out 10:30pm. No screens 1hr before bed. Repeat cortisol saliva at 8 weeks."}'::jsonb, true, now() - interval '8 weeks');

INSERT INTO checkins (patient_id, messages, summary, urgency, status, created_at) VALUES
(p1, '[{"role":"assistant","content":"Hi Eric! How have things been?"},{"role":"user","content":"Night sweats are getting worse. Soaked through my shirt last night. Resting heart rate running 85-90, used to be 65-70."},{"role":"user","content":"Maybe 2 weeks for the heart rate. Also getting back acne which I never get."}]'::jsonb,
'Worsening night sweats, elevated resting HR (85-90 from 65-70), new back acne. Possible estrogen/hematocrit symptoms requiring urgent protocol review.',
'escalate', 'new', now() - interval '2 hours'),

(p3, '[{"role":"assistant","content":"Hi David! How is the gut protocol going?"},{"role":"user","content":"Gut is great. But joints are worse. Hands so stiff I cant make a fist for the first hour. Both hands, both knees."},{"role":"user","content":"Right hand knuckles look puffy compared to left. No redness."}]'::jsonb,
'Joint stiffness worsening. Morning duration now 1 hour. Right hand knuckles swelling. Warrants autoimmune workup.',
'escalate', 'new', now() - interval '5 hours'),

(p2, '[{"role":"assistant","content":"Hi Lisa! What is on your mind?"},{"role":"user","content":"4 migraines this week. Sumatriptan for 3. The 4th lasted 14 hours. Worried about rebound."},{"role":"user","content":"Day 12 of cycle, right before ovulation."}]'::jsonb,
'4 migraines this week (pre-ovulatory). Sumatriptan 3x. One 14-hour untreated. Rebound concern.',
'digest', 'new', now() - interval '1 day'),

(p5, '[{"role":"assistant","content":"Hi Marcus! How have things been?"},{"role":"user","content":"Sleep better this week, 7 hours two nights. But yesterday my heart raced and I got dizzy for 10 minutes after standing up."},{"role":"user","content":"First time. Scared me. Went away after sitting and water."}]'::jsonb,
'Sleep improving (7hrs x2). New orthostatic episode: tachycardia and dizziness on standing. First occurrence.',
'digest', 'new', now() - interval '8 hours'),

(p4, '[{"role":"assistant","content":"Hi Rachel! What is going on?"},{"role":"user","content":"Really bad anxiety this past week. Cant sit still, chest tightness. New job, think its stress but feels physical."},{"role":"user","content":"Sleep maybe 4 hours. Racing thoughts."}]'::jsonb,
'New severe anxiety with chest tightness (new job). Sleep 4 hours, racing thoughts. No prior anxiety history.',
'digest', 'new', now() - interval '3 days');

INSERT INTO labs (patient_id, parsed_values, drawn_at) VALUES
(p1, '{"Total Testosterone":{"value":"1180","unit":"ng/dL","reference":"300-1000","flag":"high"},"Free Testosterone":{"value":"28","unit":"pg/mL","reference":"9-30","flag":"normal"},"Estradiol (sensitive)":{"value":"58","unit":"pg/mL","reference":"10-40","flag":"high"},"Hematocrit":{"value":"52.1","unit":"%","reference":"38-50","flag":"high"},"PSA":{"value":"0.8","unit":"ng/mL","reference":"0-4","flag":"normal"},"Hemoglobin":{"value":"17.4","unit":"g/dL","reference":"13.5-17.5","flag":"normal"}}'::jsonb, current_date - interval '7 days'),
(p3, '{"CRP":{"value":"4.2","unit":"mg/L","reference":"0-3","flag":"high"},"ESR":{"value":"18","unit":"mm/hr","reference":"0-20","flag":"normal"},"Calprotectin":{"value":"95","unit":"mcg/g","reference":"0-50","flag":"high"},"B12":{"value":"380","unit":"pg/mL","reference":"200-900","flag":"normal"},"Vitamin D":{"value":"42","unit":"ng/mL","reference":"30-100","flag":"normal"}}'::jsonb, current_date - interval '5 days');

INSERT INTO doctor_notes (patient_id, note, created_at) VALUES
(p1, 'Dose increase not producing expected results. Suspect aromatization is the issue. Plan to adjust AI dosing before changing T dose.', now() - interval '6 weeks'),
(p1, 'Night sweats started. Correlates with elevated E2. Need to act on this at next visit.', now() - interval '2 weeks'),
(p3, 'GI response to protocol is encouraging. Keep on current stack. The joint symptoms are concerning given family hx.', now() - interval '1 week');

END $$;

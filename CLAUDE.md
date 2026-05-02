# CatchCare — Mission Control

## What is this
AI-powered pre-visit intake agent for medical practices. Replaces the PA, generates a clinical snapshot for the doctor, stays available between visits for patient check-ins.

## Stack
- Frontend: Vanilla HTML/CSS/JS, mobile-first
- Hosting: Netlify (auto-deploy from GitHub)
- Backend: Netlify serverless functions
- Database: Supabase PostgreSQL + pgvector
- AI: Anthropic API (Sonnet 4.6 for conversation, Opus 4.6 for snapshots)
- Auth: Supabase magic link (no passwords)
- No real PHI in v1 — synthetic data only until BAAs signed

## Repo
- GitHub: https://github.com/CobbCo44/catchcare
- Local: ~/Desktop/CatchCare

## Snapshot format reference
~/Desktop/clinical_snapshot.docx — this is the gold standard for what the snapshot generation prompt must produce. Every section, every clinical voice choice. Match it exactly.

## Critical rules
- System prompts are the product. Intake agent + snapshot generation prompts get heavy iteration.
- Patient-facing agent NEVER gives clinical advice. Acknowledges, asks follow-ups, logs. Defers to physician.
- "Considerations for physician review" is doctor-facing ONLY — structurally separated in the data model (snapshots.content vs snapshots.patient_content).
- Mobile-first everything. If it doesn't work on a phone, it doesn't work.
- Use Claude models only, never GPT/OpenAI.
- Build UI fully before wiring paid APIs. Degrade gracefully without keys.
- No em dashes in any user-facing copy.
- Sequential phases — each phase must work before starting the next.

## Build phases and status

### Phase 1 — Foundation ✅ DONE
- [x] GitHub repo created and pushed
- [x] Repo structure matches spec (public/, netlify/functions/, supabase/)
- [x] Landing page at / with Patient and Doctor CTAs
- [x] Patient portal (/patient/) with magic link auth gate
- [x] Doctor portal (/doctor/) with magic link auth gate
- [x] Shared CSS design system + app.js auth helpers
- [x] Supabase schema.sql written (1024-dim vectors for Voyage)
- [x] All 7 serverless function placeholders
- [x] netlify.toml configured

### Phase 1 — Still needs human action before it's truly done:
- [ ] Connect Netlify to GitHub repo (Netlify account pending — paid, waiting up to 24hrs)
  - app.netlify.com → Add new site → Import from Git → CobbCo44/catchcare
  - Publish directory: public
- [ ] Add env vars in Netlify: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
- [ ] Run supabase/schema.sql in Supabase SQL Editor
- [ ] Give Claude the SUPABASE_URL and SUPABASE_ANON_KEY so they can be wired into public/shared/app.js
- [ ] Test: hit live site → click "I'm a Patient" → login via magic link → see placeholder dashboard

### Phase 2 — Patient Intake Conversation (next up)
- Build chat UI at /patient/intake.html (mobile-first, warm, clean)
- Build intake-conversation.js serverless function
- Write the intake agent system prompt (structured PA-style interview)
- Conversation state stored in intake_conversations table
- Auto-trigger snapshot generation when agent wraps up
- Done when: login as patient, have a 15-min conversation, conversation stored properly

### Phase 3 — Snapshot Generation + Doctor Dashboard
- Build generate-snapshot.js (Claude Opus, full conversation + history + labs as context)
- Match snapshot format to ~/Desktop/clinical_snapshot.docx exactly
- Build doctor dashboard with visit list + snapshot-ready indicators
- Build single-patient snapshot view with print-to-PDF and copy buttons
- Done when: patient finishes intake → doctor sees snapshot matching the sample doc

### Phase 4 — Lab Upload + Parsing
- Drag-and-drop PDF upload to Supabase Storage
- Claude parses PDFs natively (no separate OCR)
- Labs from last 90 days included in snapshot context
- Done when: upload labs PDF → snapshot includes parsed lab values

### Phase 5 — Between-Visit Check-ins + Protocol Tracking
- Check-in chat with protocol-aware system prompt
- Urgency classification (log/digest/escalate)
- Doctor digest view with one-click actions
- Protocol management (doctor sets, agent references)
- Proactive check-in prompts (7-day nudge)
- Done when: doctor sets protocol → patient checks in → doctor sees it in digest → can respond

## File map
```
public/
  index.html              — Landing page (done)
  patient/
    index.html            — Patient login + dashboard (done, needs Supabase keys)
    intake.html           — Intake conversation UI (Phase 2 shell)
    checkin.html          — Between-visit check-in (Phase 5 shell)
    labs.html             — Lab upload (Phase 4 shell)
  doctor/
    index.html            — Doctor dashboard (done, needs Supabase keys)
    patient.html          — Single patient snapshot view (Phase 3 shell)
    digest.html           — Check-in digest (Phase 5 shell)
  shared/
    styles.css            — Full design system (done)
    app.js                — Auth + API helpers (done, needs Supabase keys)
netlify/functions/
  intake-conversation.js  — Phase 2
  generate-snapshot.js    — Phase 3
  checkin-conversation.js — Phase 5
  classify-urgency.js     — Phase 5
  parse-labs.js           — Phase 4
  doctor-feed.js          — Phase 3
  update-protocol.js      — Phase 5
supabase/
  schema.sql              — Full schema (done, needs to be run in Supabase)
```

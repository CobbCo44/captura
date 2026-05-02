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

### Phase 2 — Patient Intake Conversation ✅ DONE
- [x] Mobile-first chat UI at /patient/intake.html with typing indicators
- [x] intake-conversation.js using direct Anthropic API (claude-sonnet-4-6)
- [x] System prompt: structured PA-style interview, never gives clinical advice
- [x] Conversation stored in intake_conversations table
- [x] Visit status updates to intake_complete on wrap-up
- [x] Patient dashboard shows visits with intake status badges

### Phase 3 — Snapshot Generation + Doctor Dashboard ✅ DONE
- [x] generate-snapshot.js using Claude Opus 4.7
- [x] Pulls intake conversation + prior snapshots + check-ins + labs + protocol
- [x] Doctor dashboard with visit list + snapshot-ready badges
- [x] Patient snapshot view with print-to-PDF and copy-to-clipboard
- [x] get-snapshot.js serves snapshot data to doctor view
- [x] Auto-triggers after intake completion

### Phase 4 — Lab Upload + Parsing ✅ DONE
- [x] Drag-and-drop PDF upload UI at /patient/labs.html
- [x] parse-labs.js sends PDF to Claude for structured extraction
- [x] Stores PDF in Supabase Storage, parsed values in labs table
- [x] Labs from last 90 days auto-included in snapshot generation

### Phase 5 — Between-Visit Check-ins + Protocol Tracking ✅ DONE
- [x] Check-in chat UI at /patient/checkin.html
- [x] checkin-conversation.js with protocol-aware system prompt
- [x] classify-urgency.js triages as log/digest/escalate
- [x] Doctor digest view at /doctor/digest.html with urgency grouping
- [x] update-protocol.js for doctor to set patient protocols
- [x] Check-in agent references active protocol and recent snapshot

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

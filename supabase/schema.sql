-- CatchCare Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector for snapshot similarity search
create extension if not exists vector;

-- Doctors (create first, referenced by patients)
create table doctors (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  practice_name text,
  specialty text,
  created_at timestamptz default now()
);

-- Patients
create table patients (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text,
  last_name text,
  dob date,
  doctor_id uuid references doctors(id),
  created_at timestamptz default now()
);

-- Visits (every appointment, past and future)
create table visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  doctor_id uuid references doctors(id),
  scheduled_for timestamptz,
  visit_type text,                 -- 'initial' | 'follow-up'
  status text default 'scheduled', -- 'scheduled' | 'intake_complete' | 'completed'
  created_at timestamptz default now()
);

-- Intake conversations (one per visit, pre-visit)
create table intake_conversations (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id),
  patient_id uuid references patients(id),
  messages jsonb default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Clinical snapshots (one per visit)
create table snapshots (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id),
  patient_id uuid references patients(id),
  content jsonb,                   -- structured snapshot data (doctor-facing, includes considerations)
  patient_content jsonb,           -- patient-safe subset (no clinical hypotheses)
  rendered_html text,              -- pre-rendered for fast doctor view
  embedding vector(1024),          -- Voyage embeddings for similarity search
  created_at timestamptz default now()
);

-- Between-visit check-ins
create table checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  messages jsonb default '[]'::jsonb,
  summary text,                    -- one-line summary for digest
  urgency text,                    -- 'log' | 'digest' | 'escalate'
  status text default 'new',       -- 'new' | 'reviewed' | 'actioned'
  created_at timestamptz default now()
);

-- Active protocols (set by doctor, referenced by agent)
create table protocols (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  set_by_doctor_id uuid references doctors(id),
  protocol jsonb,                  -- meds, supplements, instructions
  active boolean default true,
  effective_from timestamptz default now(),
  created_at timestamptz default now()
);

-- Labs
create table labs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  storage_path text,               -- supabase storage path to PDF
  parsed_values jsonb,             -- structured lab values
  drawn_at date,
  uploaded_at timestamptz default now()
);

-- Indexes
create index idx_patients_doctor on patients(doctor_id);
create index idx_visits_patient on visits(patient_id);
create index idx_visits_doctor on visits(doctor_id);
create index idx_visits_status on visits(status);
create index idx_intake_visit on intake_conversations(visit_id);
create index idx_snapshots_patient on snapshots(patient_id);
create index idx_checkins_patient on checkins(patient_id);
create index idx_checkins_urgency on checkins(urgency);
create index idx_protocols_patient on protocols(patient_id);
create index idx_labs_patient on labs(patient_id);

-- Row Level Security (HIPAA-ready structure)
alter table patients enable row level security;
alter table doctors enable row level security;
alter table visits enable row level security;
alter table intake_conversations enable row level security;
alter table snapshots enable row level security;
alter table checkins enable row level security;
alter table protocols enable row level security;
alter table labs enable row level security;

-- RLS policies: patients can only see their own data
create policy "Patients see own record" on patients
  for select using (auth.uid()::text = id::text);

create policy "Patients see own visits" on visits
  for select using (patient_id::text = auth.uid()::text);

create policy "Patients see own intake" on intake_conversations
  for select using (patient_id::text = auth.uid()::text);

create policy "Patients see own checkins" on checkins
  for select using (patient_id::text = auth.uid()::text);

create policy "Patients see own labs" on labs
  for select using (patient_id::text = auth.uid()::text);

-- Note: Doctor policies and service-role bypass will be configured
-- when we wire up the serverless functions. Functions use the
-- service role key which bypasses RLS.

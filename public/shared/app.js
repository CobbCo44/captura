/* CatchCare — Shared App Logic
   Supabase auth, routing helpers, utilities */

// Supabase client
const SUPABASE_URL = 'https://zadevqqyeaeotwbpgaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZGV2cXF5ZWFlZW90d2JwZ2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzgwNDAsImV4cCI6MjA5MzI1NDA0MH0.3mx7vccDkBOdlL1aOKv-s2Z2nuCxQuQ_CGlsmg7q26Y';

let sbClient = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('CatchCare: Supabase keys not configured.');
    return null;
  }
  if (!sbClient) {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sbClient;
}

// ── Auth helpers ──

async function sendMagicLink(email) {
  try {
    const sb = initSupabase();
    if (!sb) return { error: { message: 'Supabase not configured.' } };

    const { data, error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    console.log('signInWithOtp response:', { data, error });

    if (error) return { error };
    return { error: null };
  } catch (err) {
    console.error('sendMagicLink caught:', err);
    return { error: { message: err.message || 'Something went wrong.' } };
  }
}

async function getSession() {
  try {
    const sb = initSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session;
  } catch (err) {
    console.error('getSession error:', err);
    return null;
  }
}

async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

async function signOut() {
  const sb = initSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  window.location.href = '/';
}

// ── Auth gate ──

async function requireAuth(role) {
  const user = await getUser();

  const loginSection = document.getElementById('login-section');
  const dashSection = document.getElementById('dashboard-section');

  if (user) {
    if (loginSection) loginSection.classList.add('hidden');
    if (dashSection) dashSection.classList.remove('hidden');
    const userEmail = document.getElementById('user-email');
    if (userEmail) userEmail.textContent = user.email;
    return user;
  } else {
    if (loginSection) loginSection.classList.remove('hidden');
    if (dashSection) dashSection.classList.add('hidden');
    return null;
  }
}

// ── Magic link form handler ──

function setupLoginForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const feedback = form.querySelector('.auth-feedback');

    const email = emailInput.value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    if (feedback) { feedback.textContent = ''; }

    const { error } = await sendMagicLink(email);

    if (error) {
      if (feedback) {
        feedback.textContent = error.message;
        feedback.style.color = 'var(--danger)';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Login Link';
    } else {
      if (feedback) {
        feedback.textContent = 'Check your email for a login link.';
        feedback.style.color = 'var(--success)';
      }
      submitBtn.textContent = 'Link Sent';
      submitBtn.disabled = false;
    }
  });
}

// ── Toast notification ──

function showToast(message, duration = 3000) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── API helper ──

async function callFunction(name, body) {
  const session = await getSession();
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Date formatting ──

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((d - now) / 1000);
  const absDiff = Math.abs(diff);
  if (absDiff < 60) return 'just now';
  if (absDiff < 3600) return `${Math.floor(absDiff / 60)}m ${diff > 0 ? 'from now' : 'ago'}`;
  if (absDiff < 86400) return `${Math.floor(absDiff / 3600)}h ${diff > 0 ? 'from now' : 'ago'}`;
  return `${Math.floor(absDiff / 86400)}d ${diff > 0 ? 'from now' : 'ago'}`;
}

// Guest session management using localStorage

const GUEST_KEY = 'stoat_guest_session';

export function getGuestSession() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function createGuestSession() {
  const num = Math.floor(1000 + Math.random() * 9000);
  const session = {
    guest_id: `guest_${Date.now()}`,
    display_name: `Guest#${num}`,
    is_guest: true,
    created_at: Date.now(),
  };
  localStorage.setItem(GUEST_KEY, JSON.stringify(session));
  return session;
}

export function clearGuestSession() {
  localStorage.removeItem(GUEST_KEY);
}

export function isGuestSession() {
  const s = getGuestSession();
  return s && s.is_guest === true;
}
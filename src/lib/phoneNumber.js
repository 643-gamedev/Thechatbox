

// Generate a fake number with unused area codes (000, 010, 011, 099, etc.)
const FAKE_AREA_CODES = ['000', '010', '011', '012', '099', '001', '002', '003'];

function randomFakeNumber() {
  const area = FAKE_AREA_CODES[Math.floor(Math.random() * FAKE_AREA_CODES.length)];
  const mid = String(Math.floor(Math.random() * 900) + 100);
  const end = String(Math.floor(Math.random() * 9000) + 1000);
  return `${area}-${mid}-${end}`;
}

export async function getOrCreatePhoneNumber(user) {
  const existing = await db.entities.PhoneNumber.filter({ user_email: user.email });
  if (existing && existing.length > 0) return existing[0];

  // Create a new fake number
  const number = randomFakeNumber();
  const record = await db.entities.PhoneNumber.create({
    user_email: user.email,
    user_name: user.full_name,
    number,
  });
  return record;
}

export async function findPhoneRecord(numberOrEmail) {
  // Try by number
  const byNumber = await db.entities.PhoneNumber.filter({ number: numberOrEmail });
  if (byNumber && byNumber.length > 0) return byNumber[0];

  // Try by email
  const byEmail = await db.entities.PhoneNumber.filter({ user_email: numberOrEmail });
  if (byEmail && byEmail.length > 0) return byEmail[0];

  // Try real_number
  const byReal = await db.entities.PhoneNumber.filter({ real_number: numberOrEmail });
  if (byReal && byReal.length > 0) return byReal[0];

  return null;
}

export function formatNumber(n) {
  if (!n) return '';
  // Already formatted
  if (n.includes('-')) return n;
  return n;
}
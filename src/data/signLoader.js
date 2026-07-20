// Loads all sign JSON files at build time via Vite glob import.
// Returns sign data by id string; missing ids return null (filtered by getSigns).
const rawSigns = import.meta.glob('./signs/*.json', { eager: true });

const SIGN_MAP = {};
for (const module of Object.values(rawSigns)) {
  const sign = module.default ?? module;
  if (sign?.id) SIGN_MAP[sign.id] = sign;
}

export function getSign(id) {
  return SIGN_MAP[id] ?? null;
}

export function getSigns(ids) {
  return ids.map(getSign).filter(Boolean);
}

// Every known sign, sorted alphabetically by name — used by the dictionary.
export function getAllSigns() {
  return Object.values(SIGN_MAP).sort((a, b) => a.name.localeCompare(b.name));
}

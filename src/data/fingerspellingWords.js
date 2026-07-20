// Word bank for the Fingerspelling Trainer. Every word uses only letters
// covered by src/data/signs/a.json .. z.json (the full alphabet).
export const FINGERSPELLING_WORDS = [
  'cat', 'dog', 'sun', 'run', 'big', 'red', 'cup', 'fun', 'hat', 'bed',
  'pen', 'box', 'jar', 'key', 'map', 'net', 'owl', 'pig', 'rug', 'van',
  'web', 'zoo', 'ice', 'fox', 'ant', 'bee', 'sit', 'sky', 'ear', 'arm', 'leg',
];

export function pickRandomWord(exclude) {
  const pool = exclude
    ? FINGERSPELLING_WORDS.filter((w) => w !== exclude)
    : FINGERSPELLING_WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

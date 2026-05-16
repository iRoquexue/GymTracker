const phrases = [
  "Cada repetição te aproxima do objetivo.",
  "Disciplina supera motivação.",
  "Hoje é dia de superar o ontem.",
  "O corpo alcança o que a mente acredita.",
  "Constância vence intensidade.",
  "Suor hoje, orgulho amanhã.",
  "Pequenos passos, grandes conquistas.",
];

export function getGreeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function getDailyPhrase(date = new Date()) {
  const day = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return phrases[day % phrases.length];
}

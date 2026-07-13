import { getStrings } from '@/i18n';

/**
 * Formata a idade a partir de uma data de nascimento (ISO YYYY-MM-DD).
 * Para bebés (< 1 ano) mostra meses; caso contrário, anos. Sensível ao idioma.
 * Devolve null se não houver data.
 */
export function formatAge(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const a = getStrings().age;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;

  if (years >= 1) return `${years} ${years === 1 ? a.year : a.years}`;

  // Menos de 1 ano: calcular meses.
  let months = now.getMonth() - birth.getMonth() + 12 * (now.getFullYear() - birth.getFullYear());
  if (now.getDate() < birth.getDate()) months--;
  months = Math.max(0, months);
  if (months >= 1) return `${months} ${months === 1 ? a.month : a.months}`;

  return a.newborn;
}

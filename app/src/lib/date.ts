/**
 * Utilitários de data para o chat — separadores por dia (estilo WhatsApp).
 * As etiquetas são sensíveis ao idioma (getStrings().dates).
 */
import { getStrings } from '@/i18n';

/** True se as duas datas ISO caem no mesmo dia civil (local). */
export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Etiqueta do separador de dia: "Hoje"/"Today", "Ontem"/"Yesterday" ou a data
 * por extenso ("12 de junho de 2026" / "June 12, 2026").
 */
export function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dates = getStrings().dates;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (x: Date, y: Date) =>
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate();

  if (sameDay(d, today)) return dates.today;
  if (sameDay(d, yesterday)) return dates.yesterday;
  return dates.longDate(d.getDate(), dates.months[d.getMonth()], d.getFullYear());
}

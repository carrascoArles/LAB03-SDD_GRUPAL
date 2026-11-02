import { err, ok, type Result } from "../shared/result";
import { bookingError } from "./model";
import type { BookingError, Clock, LocalDate, LocalDateTime } from "./model";

const fechaPattern = /^(\d{4})-(\d{2})-(\d{2})$/u;
const fechaHoraPattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/u;
const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Requisito: RF-002; calcular los días de un mes sin depender de la zona horaria.
function diasDelMes(anio: number, mes: number): number {
  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  if (mes === 2 && bisiesto) return 29;
  return diasPorMes[mes - 1] ?? 0;
}

// Requisito: RF-002; aceptar solo fechas AAAA-MM-DD que existen en el calendario.
export function esFechaValida(value: unknown): value is LocalDate {
  if (typeof value !== "string") return false;
  const match = fechaPattern.exec(value);
  if (!match) return false;
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDelMes(anio, mes);
}

// Requisitos: RF-006 y RF-009; aceptar solo fechas y horas locales AAAA-MM-DDTHH:mm.
export function esFechaHoraValida(value: unknown): value is LocalDateTime {
  if (typeof value !== "string") return false;
  const match = fechaHoraPattern.exec(value);
  if (!match || !esFechaValida(match[1])) return false;
  const hora = Number(match[2]);
  const minuto = Number(match[3]);
  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
}

// Requisitos: RF-006 y RF-009; convertir una hora local a minutos sin zona horaria.
export function aMinutos(fechaHora: LocalDateTime): number {
  const instante = new Date(0);
  instante.setUTCFullYear(
    Number(fechaHora.slice(0, 4)),
    Number(fechaHora.slice(5, 7)) - 1,
    Number(fechaHora.slice(8, 10)),
  );
  instante.setUTCHours(
    Number(fechaHora.slice(11, 13)),
    Number(fechaHora.slice(14, 16)),
    0,
    0,
  );
  return instante.getTime() / 60_000;
}

// Requisito: RF-012; obtener la fecha de una fecha y hora local.
export function fechaDe(fechaHora: LocalDateTime): LocalDate {
  return fechaHora.slice(0, 10);
}

// Requisitos: RF-004 y RF-012; obtener la hora entera de una fecha y hora local.
export function horaDe(fechaHora: LocalDateTime): number {
  return Number(fechaHora.slice(11, 13));
}

// Requisito: RF-005; dar formato HH:00 a una hora entera.
export function formatearHora(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00`;
}

// Requisito: RF-005; construir el inicio o fin de un bloque de una hora.
export function componerFechaHora(fecha: LocalDate, hora: number): LocalDateTime {
  return `${fecha}T${formatearHora(hora)}`;
}

// Requisito: RF-006; dar formato local a un Date usando los getters locales.
export function formatearFechaHoraLocal(fecha: Date): LocalDateTime {
  const dos = (valor: number): string => String(valor).padStart(2, "0");
  return (
    `${String(fecha.getFullYear()).padStart(4, "0")}-${dos(fecha.getMonth() + 1)}-` +
    `${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
  );
}

// Requisito: RF-006; reloj del sistema en hora local del navegador.
export const systemClock: Clock = () => formatearFechaHoraLocal(new Date());

// Requisitos: RF-006 y RF-009; leer y validar el reloj inyectado sin lanzar.
export function leerReloj(clock: Clock): Result<LocalDateTime, BookingError> {
  let ahora: unknown;
  try {
    ahora = clock();
  } catch {
    return err(bookingError("CLOCK_UNAVAILABLE"));
  }
  return esFechaHoraValida(ahora)
    ? ok(ahora)
    : err(bookingError("CLOCK_UNAVAILABLE"));
}

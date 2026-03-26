const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

/** e.g. "16 Jan 2026, 09:30 AM IST" — aligned with mobile formatISTDateTime intent */
export function formatISTDateTimeAttendance(utcISO: string | Date | null | undefined): string {
  if (!utcISO) return "";
  const d = new Date(utcISO);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("en-IN", {
    ...IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-IN", {
    ...IST,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}, ${timePart} IST`;
}

export function formatAttendanceTimeOnly(utcISO: string | Date | null | undefined): string {
  if (!utcISO) return "";
  const d = new Date(utcISO);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { ...IST, hour: "2-digit", minute: "2-digit" }) + " IST";
}

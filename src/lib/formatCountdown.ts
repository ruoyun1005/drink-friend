export function formatCountdown(deadlineIso: string, nowMs: number): string {
  const diffMs = new Date(deadlineIso).getTime() - nowMs;
  if (diffMs <= 0) return "已結單";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((diffMs % 60000) / 1000);

  if (hours >= 1) {
    return `${hours} 時 ${minutes} 分`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

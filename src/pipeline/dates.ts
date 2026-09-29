/** 简报日期统一用新加坡日历日，避免 UTC 23:00 触发时把日期算成前一天 */
export const REPORT_TZ = 'Asia/Singapore';

export function todayInReportTZ(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

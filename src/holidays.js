export const fixedHolidays = {
  "01-01":"元旦", "05-01":"勞動節", "07-01":"香港特區成立紀念日", "10-01":"國慶日", "12-25":"聖誕節", "12-26":"聖誕節翌日"
};

export const dynamicHolidaysByYear = {
  "2024": { "02-10":"農曆年初一", "02-12":"農曆年初三", "03-29":"耶穌受難節", "04-01":"復活節", "04-04":"清明節", "05-15":"佛誕", "06-10":"端午節", "09-18":"中秋節翌日", "10-11":"重陽節" },
  "2025": { "01-29":"農曆年初一", "01-30":"農曆年初二", "04-04":"清明節", "04-18":"耶穌受難節", "05-05":"佛誕", "05-31":"端午節", "10-07":"中秋節翌日", "10-29":"重陽節" },
  "2026": { "02-17":"農曆年初一", "02-18":"農曆年初二", "04-03":"耶穌受難節", "04-06":"復活節", "05-25":"佛誕翌日", "06-19":"端午節", "09-26":"中秋節翌日", "10-19":"重陽節翌日" }
};

export function getHolidayName(year, monthDayStr) {
  if (dynamicHolidaysByYear[year]?.[monthDayStr]) return dynamicHolidaysByYear[year][monthDayStr];
  return fixedHolidays[monthDayStr] || null;
}

export function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getDaysBetween(sStr, eStr) {
  return Math.round((new Date(eStr) - new Date(sStr)) / (1000 * 60 * 60 * 24));
}

export function addDaysStr(dateStr, days) {
  let d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

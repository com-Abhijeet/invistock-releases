/**
 * @description Calculates the start and end dates for a given GST filing period.
 * @param {object} options - The period options.
 * @param {'month' | 'quarter' | 'year'} options.periodType - The type of period.
 * @param {number} options.year - The year (e.g., 2025 for FY 2025-26).
 * @param {number} [options.month] - The month (1-12).
 * @param {number} [options.quarter] - The quarter (1-4).
 * @returns {{startDate: string, endDate: string}} The start and end dates in YYYY-MM-DD format.
 */
export function calculateGstPeriodDates({ periodType, year, month, quarter }) {
  let startDate, endDate;

  // ✅ Timezone-safe date formatter
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  if (periodType === "year") {
    startDate = `${year}-04-01`;
    endDate = `${year + 1}-03-31`;
  } else if (periodType === "quarter" && quarter) {
    const quarterStartMonth = [4, 7, 10, 1][quarter - 1]; // Apr, Jul, Oct, Jan
    const startYear = quarter < 4 ? year : year + 1;

    const startDateObj = new Date(startYear, quarterStartMonth - 1, 1);
    const endDateObj = new Date(startYear, quarterStartMonth + 2, 0); // Day 0 gives last day of previous month

    startDate = formatDate(startDateObj);
    endDate = formatDate(endDateObj);
  } else if (periodType === "month" && month) {
    startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  } else {
    throw new Error("Invalid period specified for GSTR-1 report.");
  }

  return { startDate, endDate };
}

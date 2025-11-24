/**
 * Generates SQL date filter clauses and parameters from frontend filters.
 * @param {object} options - The filter options from the frontend.
 * @param {string} options.filter - The filter type ('today', 'month', 'year', 'custom').
 * @param {string} [options.from] - The start date for a range.
 * @param {string} [options.to] - The end date for a range.
 * @param {string} [options.alias=""] - An optional table alias.
 * @returns {{where: string, params: Array<any>}} The WHERE clause and its parameters.
 */
export function getDateFilter({ filter, from, to, alias = "" }) {
  const prefix = alias ? `${alias}.` : "";
  let where = "1=1";
  const params = [];

  if (filter === "today") {
    where = `date(${prefix}created_at) = date('now', 'localtime')`;
  } else if (filter === "month") {
    where = `strftime('%Y-%m', ${prefix}created_at) = strftime('%Y-%m', 'now', 'localtime')`;
  } else if (from && to) {
    where = `date(${prefix}created_at) BETWEEN date(?) AND date(?)`;
    params.push(from, to);
  }

  return { where, params };
}

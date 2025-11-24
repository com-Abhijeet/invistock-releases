/**
 * @description Formats an amount into the Indian currency format (e.g., ₹1,23,456.00).
 * @param {number} amount The number to format.
 * @returns {string} The formatted currency string.
 */
function formatAmount(amount) {
  if (typeof amount !== "number") return "₹0.00";
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
}

/**
 * @description Formats a date string (like an ISO string) into DD/MM/YYYY format.
 * @param {string} dateString The date string to format.
 * @returns {string} The formatted date string.
 */
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * @description Joins address parts into a clean, comma-separated string, ignoring empty parts.
 * @param {...string} parts The address components (e.g., line1, city, state, pincode).
 * @returns {string} The formatted address string.
 */
function formatAddress(...parts) {
  return parts.filter(Boolean).join(", "); // Filters out null/undefined/empty strings and joins the rest
}

/**
 * @description Converts a number into its Indian numbering system word representation.
 * @param {number} num The number to convert.
 * @returns {string} The number in words (e.g., "One Lakh Twenty-Three Thousand...").
 */
function numberToWords(num) {
  if (num === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n) => {
    let str = "";
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  };

  let numStr = num.toString();
  let [integerPart, decimalPart] = numStr.split(".");

  let words = "";

  if (integerPart.length > 9) return "Number too large";
  let crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  let lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  let thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  let hundred = Math.floor(integerPart / 100);
  integerPart %= 100;

  if (crore > 0) words += inWords(crore) + " Crore ";
  if (lakh > 0) words += inWords(lakh) + " Lakh ";
  if (thousand > 0) words += inWords(thousand) + " Thousand ";
  if (hundred > 0) words += inWords(hundred) + " Hundred ";
  if (integerPart > 0) words += inWords(integerPart);

  words += " Rupees";

  if (decimalPart) {
    let paisa = parseInt(decimalPart.slice(0, 2).padEnd(2, "0"));
    if (paisa > 0) {
      words += " and " + inWords(paisa) + " Paisa";
    }
  }

  return words.trim().replace(/\s+/g, " ") + " Only";
}

// Export all functions to be used in other files
module.exports = {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
};

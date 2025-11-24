export const numberToWords = (num: number): string => {
  const s = num.toFixed(2).split('.');
  const whole = s[0];
  const decimal = s[1] || '00';

  if (Number(whole) === 0 && Number(decimal) === 0) {
    return 'Rupees Zero only';
  }

  const inWords = (n: number) => {
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    let words = '';
    if (n < 20) {
      words = a[n];
    } else {
      words = b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    }
    return words;
  };

  const toIndianWords = (n: number) => {
    let words = '';
    const numStr = String(n);
    const len = numStr.length;

    if (len > 7) {
      words += inWords(Number(numStr.slice(0, len - 7))) + ' crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      words += inWords(Math.floor(n / 100000)) + ' lakh ';
      n %= 100000;
    }
    if (n > 999) {
      words += inWords(Math.floor(n / 1000)) + ' thousand ';
      n %= 1000;
    }
    if (n > 99) {
      words += inWords(Math.floor(n / 100)) + ' hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (len > 2) {
        words += 'and ';
      }
      words += inWords(n);
    }
    return words.trim();
  };

  let finalWords = 'Rupees ' + toIndianWords(Number(whole)) + ' only';

  if (Number(decimal) > 0) {
    finalWords += ' and ' + toIndianWords(Number(decimal)) + ' paisa';
  }

  return finalWords.trim();
};
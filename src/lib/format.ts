const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Whole rupees print without decimals; anything with paise prints both digits, so a bill never looks rounded. */
export const formatPrice = (n: number) => (Number.isInteger(n) ? inr : inrPaise).format(n);

/** For lists of bills: always rupees and paise, so a column of totals lines up and never mixes "₹861" with "₹26.25". */
export const formatMoney = (n: number) => inrPaise.format(n);

export const telHref = (phone: string) => `tel:${phone}`;
export const waHref = (number: string, text = "Hi Platter, ") => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

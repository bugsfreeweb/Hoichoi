const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toBn(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function bnNum(n: number, decimals = 0): string {
  return toBn(
    n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function bnPct(n: number, decimals = 1): string {
  return `${toBn(n.toFixed(decimals))}%`;
}

export function bnCompact(n: number): string {
  if (n >= 100000) return `${toBn((n / 100000).toFixed(1))} লাখ`;
  if (n >= 1000) return `${toBn((n / 1000).toFixed(1))} হা.`;
  return toBn(Math.round(n));
}

export function bnTime(ts: number): string {
  const d = new Date(ts);
  const p = (x: number) => String(x).padStart(2, '0');
  return toBn(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
}

export function bnAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return 'এইমাত্র';
  if (s < 60) return `${toBn(s)} সেকেন্ড আগে`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${toBn(m)} মিনিট আগে`;
  return `${toBn(Math.floor(m / 60))} ঘণ্টা আগে`;
}

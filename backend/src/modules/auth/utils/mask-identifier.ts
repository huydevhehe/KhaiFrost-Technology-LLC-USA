// Enough to recognise the account in the audit trail without storing the full personal value
export function maskIdentifier(raw: string): string {
  const value = raw.trim();
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  return digits.length > 3 ? `***${digits.slice(-3)}` : '***';
}

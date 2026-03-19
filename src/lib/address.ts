/**
 * Builds a full, comma-separated address string from structured fields.
 * Skips any null / undefined / empty parts.
 * Useful for merge-tag substitution and table display.
 */
export function getFullAddress(company: {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
}): string {
  return [
    company.address_line_1,
    company.address_line_2,
    company.city,
    company.county,
    company.postcode,
    company.country,
  ]
    .filter((v) => typeof v === 'string' && v.trim() !== '')
    .join(', ');
}

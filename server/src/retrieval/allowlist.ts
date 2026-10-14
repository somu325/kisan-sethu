/**
 * TRUSTED DOMAIN ALLOWLIST
 * Ensures agricultural advice is sourced strictly from official, peer-reviewed,
 * or statutory agricultural authorities in India.
 */
export const TRUSTED_AGRICULTURAL_DOMAINS = [
  'gov.in',
  'nic.in',
  'cibrc.nic.in',
  'agmarknet.gov.in',
  'dppqs.gov.in',
  'icar.org.in',
  'angrau.ac.in',
  'pjtsau.edu.in',
  'uasbangalore.edu.in',
  'tnauextms.tn.au.in',
  'agricoop.nic.in',
  'rkvy.nic.in',
  'pmkisan.gov.in',
];

export function isDomainAllowed(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    return TRUSTED_AGRICULTURAL_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Signup consent line. Empty when either legal URL is unset, so no link ever points at a missing page.
export const buildTermsHtml = (template, termsURL, privacyURL) => {
  if (!termsURL || !privacyURL) return '';
  return template
    .replace('https://www.chatwoot.com/terms', termsURL)
    .replace('https://www.chatwoot.com/privacy-policy', privacyURL);
};

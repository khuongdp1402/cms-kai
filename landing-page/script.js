export function appUrl(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:3005`;
  }
  return `https://app.${hostname.replace(/^www\./, '')}`;
}

if (typeof document !== 'undefined') {
  const base = appUrl(location.hostname);
  document.querySelectorAll('[data-app]').forEach(el => {
    el.href = base + el.dataset.app;
  });
  document.querySelectorAll('.faq button').forEach(btn => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      btn.nextElementSibling.hidden = open;
    });
  });
}

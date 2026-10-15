// Protege o site inteiro com senha (HTTP Basic Auth) via Vercel Routing Middleware.
// Defina SITE_PASSWORD no Vercel (Settings → Environment Variables). SITE_USER é opcional.
// Sem SITE_PASSWORD o site fica fechado, para nunca ir ao ar desprotegido.

export const config = {
  matcher: '/((?!favicon.ico).*)',
};

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return new Response('Site fechado: configure SITE_PASSWORD no Vercel.', { status: 503 });
  }

  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = atob(encoded);
    const sep = decoded.indexOf(':');
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    const expectedUser = process.env.SITE_USER;
    if (pass === password && (!expectedUser || user === expectedUser)) {
      return; // senha certa: segue para o site
    }
  }

  return new Response('Acesso restrito.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="RAQUEST Training", charset="UTF-8"' },
  });
}

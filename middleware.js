// Protege o site inteiro com uma senha (só o campo de senha, sem usuário), via Vercel Routing Middleware.
// Defina SITE_PASSWORD no Vercel (Settings → Environment Variables).
// Sem SITE_PASSWORD o site fica fechado, para nunca ir ao ar desprotegido.
// Depois de entrar, um cookie guarda o acesso por 30 dias.

export const config = {
  matcher: '/((?!favicon.ico).*)',
};

const COOKIE = 'rq_access';
const LOGIN_PATH = '/__login';

async function token(password) {
  const data = new TextEncoder().encode('raquest-training:' + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}

function loginPage(error) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>RAQUEST Training</title>
<style>
:root{color-scheme:light dark}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#f4f5f7;color:#16181d;padding:16px}
@media (prefers-color-scheme:dark){body{background:#111317;color:#eef0f3}form{background:#1b1e24!important;border-color:#2c3038!important}input{background:#111317!important;color:#eef0f3!important;border-color:#3a3f48!important}}
form{background:#fff;border:1px solid #e1e4e8;border-radius:12px;padding:28px;width:100%;max-width:340px}
h1{font-size:20px;margin:0 0 4px}p{margin:0 0 18px;color:#6b7280;font-size:14px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;border:1px solid #cfd4da;border-radius:8px}
button{margin-top:14px;width:100%;font:inherit;font-weight:600;padding:11px;border:0;border-radius:8px;background:#16181d;color:#fff;cursor:pointer}
.err{color:#c0392b;font-size:13px;margin-top:10px}
</style></head><body>
<form method="POST" action="${LOGIN_PATH}">
<h1>RAQUEST Training</h1><p>Bitte Passwort eingeben.</p>
<label for="pw">Passwort</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">Weiter</button>
${error ? '<div class="err" role="alert">Falsches Passwort.</div>' : ''}
</form></body></html>`;
  return new Response(html, {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default async function middleware(request) {
  const password = (process.env.SITE_PASSWORD || '').trim();
  if (!password) {
    return new Response('Site fechado: configure SITE_PASSWORD no Vercel.', { status: 503 });
  }

  const expected = await token(password);
  const url = new URL(request.url);

  if (url.pathname === LOGIN_PATH && request.method === 'POST') {
    let typed = '';
    try {
      const body = await request.text();
      typed = (new URLSearchParams(body).get('password') || '').trim();
    } catch (e) {
      typed = '';
    }
    if (typed === password) {
      // 200 com o cookie + redirecionamento no navegador (mais confiável que 303 com Set-Cookie)
      return new Response(
        '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/"><title>OK</title><p>Weiter…</p><script>location.replace("/")</script>',
        {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'set-cookie': `${COOKIE}=${expected}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
          },
        }
      );
    }
    return loginPage(true);
  }

  if (readCookie(request, COOKIE) === expected) {
    return; // acesso liberado: segue para o site
  }

  return loginPage(false);
}

/**
 * AUTOPOD API PROXY - Cloudflare Worker
 *
 * Proxy d'authentification server-side pour Autopod Studio : garde les clés
 * Gemini / ElevenLabs / Tavily en secrets Cloudflare (jamais exposées au
 * navigateur ni committées dans le dépôt public) et relaie les requêtes du
 * front-end vers les vraies API en y injectant la clé.
 *
 * Routes (POST uniquement) :
 *   /proxy/gemini/:model        -> generativelanguage.googleapis.com/v1beta/models/:model:generateContent
 *   /proxy/elevenlabs/:voiceId  -> api.elevenlabs.io/v1/text-to-speech/:voiceId
 *   /proxy/tavily/search        -> api.tavily.com/search
 *
 * Le corps de requête envoyé par le front-end est transmis tel quel (proxy
 * transparent) ; seule la clé secrète est ajoutée côté serveur.
 */

// Origines autorisées à appeler ce Worker (CORS). Ajoute ici l'URL Cloudflare
// Pages une fois déployée.
const ALLOWED_ORIGINS = [
  'https://abilanbalakumaran.github.io',
  'https://autopod-studio.pages.dev',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080'
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Autorise tout port localhost/127.0.0.1 en développement local
  if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  // Autorise les URLs de preview Cloudflare Pages (*.autopod-studio.pages.dev)
  return /^https:\/\/[a-z0-9-]+\.autopod-studio\.pages\.dev$/.test(origin);
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!isAllowedOrigin(origin)) {
      return jsonError('Origine non autorisée.', 403, origin);
    }

    if (request.method !== 'POST') {
      return jsonError('Méthode non supportée.', 405, origin);
    }

    try {
      // ==================== GEMINI (texte / image / TTS) ====================
      const geminiMatch = path.match(/^\/proxy\/gemini\/([a-zA-Z0-9._-]+)$/);
      if (geminiMatch) {
        if (!env.GEMINI_API_KEY) return jsonError('GEMINI_API_KEY non configurée sur le Worker.', 500, origin);
        const model = geminiMatch[1];
        const body = await request.text();
        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
          }
        );
        const responseBody = await upstream.text();
        return new Response(responseBody, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
      }

      // ==================== ELEVENLABS (TTS) ====================
      const elevenMatch = path.match(/^\/proxy\/elevenlabs\/([a-zA-Z0-9]+)$/);
      if (elevenMatch) {
        if (!env.ELEVENLABS_API_KEY) return jsonError('ELEVENLABS_API_KEY non configurée sur le Worker.', 500, origin);
        const voiceId = elevenMatch[1];
        const body = await request.text();
        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': env.ELEVENLABS_API_KEY,
              'Content-Type': 'application/json'
            },
            body
          }
        );
        const responseBody = await upstream.arrayBuffer();
        return new Response(responseBody, {
          status: upstream.status,
          headers: {
            'Content-Type': upstream.headers.get('Content-Type') || 'audio/mpeg',
            ...corsHeaders(origin)
          }
        });
      }

      // ==================== TAVILY (recherche de contexte) ====================
      if (path === '/proxy/tavily/search') {
        if (!env.TAVILY_API_KEY) return jsonError('TAVILY_API_KEY non configurée sur le Worker.', 500, origin);
        const payload = await request.json().catch(() => ({}));
        const upstream = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: env.TAVILY_API_KEY,
            query: payload.query,
            search_depth: 'basic',
            max_results: payload.max_results || 5,
            include_answer: false
          })
        });
        const responseBody = await upstream.text();
        return new Response(responseBody, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
        });
      }

      return jsonError('Route inconnue.', 404, origin);
    } catch (err) {
      return jsonError(err.message || 'Erreur interne du proxy.', 500, origin);
    }
  }
};

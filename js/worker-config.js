/**
 * Configuration du proxy Cloudflare Worker (voir /worker).
 * Quand une clé API est saisie dans Paramètres, elle est utilisée en priorité
 * et les appels partent directement du navigateur vers Gemini/ElevenLabs.
 * Sinon, si WORKER_BASE_URL est renseignée, les appels passent par le Worker
 * qui détient les clés côté serveur (Gemini, ElevenLabs, Tavily).
 * Laisser vide désactive simplement ce mécanisme de secours.
 */
export const WORKER_BASE_URL = 'https://autopod-api-proxy.mangateamz2.workers.dev';

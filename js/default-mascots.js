/**
 * DEFAULT MASCOTS - ANIME PODCAST STUDIO
 * Catalogue étendu de 14 émotions de base (incluant Bonjour/Salutation et Au revoir/Outro)
 * avec multiples variantes de poses par émotion.
 * Mascottes : Aiko (Podcasteuse Anime) & Ren (Chroniqueur Pop-Culture)
 * Charte : Bleu sombre profond (#070b14, #0b1329), accents or (#f59e0b, #fbbf24). ZÉRO ROSE.
 */

export const BASE_EMOTIONS = [
  { id: 'bonjour', label: 'Bonjour / Salutation', icon: '👋', hint: 'Coucou de la main, accueil chaleureux et intro' },
  { id: 'au_revoir', label: 'Au revoir / Outro', icon: '✌️', hint: 'Geste d\'adieu, signe de la main ou V en conclusion' },
  { id: 'neutre', label: 'Neutre', icon: '🙂', hint: 'Calme, écoute attentive, posture de repos' },
  { id: 'enthousiaste', label: 'Enthousiaste', icon: '✨', hint: 'Dynamique, grands gestes, énergie communicative' },
  { id: 'explicative', label: 'Explicative', icon: '💡', hint: 'Pédagogique, index pointé, paumes ouvertes' },
  { id: 'pensive', label: 'Pensive', icon: '🤔', hint: 'Main au menton, regard vers le haut, questionnement' },
  { id: 'surprise', label: 'Surprise', icon: '⚡', hint: 'Yeux écarquillés, sursaut, étonnement' },
  { id: 'confiante', label: 'Confiante', icon: '😎', hint: 'Sourire assuré, bras croisés ou pouce levé' },
  { id: 'joyeuse', label: 'Joyeuse', icon: '😄', hint: 'Rire franc, yeux pétillants, satisfaction' },
  { id: 'serieuse', label: 'Sérieuse', icon: '🧐', hint: 'Regard concentré, pose posée et mesurée' },
  { id: 'ironique', label: 'Ironique', icon: '😏', hint: 'Demi-sourire malicieux, regard en coin' },
  { id: 'enervee', label: 'Passionnée', icon: '💢', hint: 'Sourcils froncés, poing levé, ferveur' },
  { id: 'determinee', label: 'Déterminée', icon: '🔥', hint: 'Posture d\'action, regard droit, engagement' },
  { id: 'embarrassee', label: 'Timide', icon: '😳', hint: 'Regard fuyant, main derrière la tête, modestie' }
];

// Générateur SVG d'Aiko avec variantes de poses par émotion
function createAikoSVG(emotion = 'neutre', variant = 0, mouthOpen = 0) {
  let eyeLeft = `<ellipse cx="165" cy="225" rx="14" ry="18" fill="#1e293b" /><ellipse cx="163" cy="220" rx="5" ry="7" fill="#ffffff" /><ellipse cx="168" cy="228" rx="2" ry="3" fill="#ffffff" />`;
  let eyeRight = `<ellipse cx="235" cy="225" rx="14" ry="18" fill="#1e293b" /><ellipse cx="233" cy="220" rx="5" ry="7" fill="#ffffff" /><ellipse cx="238" cy="228" rx="2" ry="3" fill="#ffffff" />`;
  let eyebrowLeft = `<path d="M 150 200 Q 165 194 180 198" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
  let eyebrowRight = `<path d="M 220 198 Q 235 194 250 200" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
  let armLeft = `<path d="M 125 350 Q 110 410 135 460" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
  let armRight = `<path d="M 275 350 Q 290 410 265 460" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
  let mouthPath = '';
  let sparkles = '';

  switch (emotion) {
    case 'bonjour':
      // Geste de coucou de la main levée avec sourire chaleureux
      armRight = `<path d="M 275 350 Q 315 280 295 195" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
                  <circle cx="295" cy="190" r="16" fill="#fde8d7" />
                  <!-- Doigts qui saluent -->
                  <path d="M 290 190 Q 305 165 315 175" stroke="#fde8d7" stroke-width="8" stroke-linecap="round" />
                  <path d="M 298 185 Q 315 168 322 182" stroke="#fde8d7" stroke-width="7" stroke-linecap="round" />`;
      mouthPath = `<path d="M 188 268 Q 200 ${286 + mouthOpen * 8} 212 268 Z" fill="#78350f" /><ellipse cx="200" cy="272" rx="9" ry="4" fill="#ffffff" />`;
      sparkles = `<text x="310" y="155" font-family="sans-serif" font-weight="900" font-size="28" fill="#fbbf24">👋</text>`;
      break;

    case 'au_revoir':
      // Geste d'au revoir / V de la main
      armRight = `<path d="M 275 350 Q 320 280 300 200" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
                  <circle cx="300" cy="195" r="16" fill="#fde8d7" />
                  <line x1="295" y1="195" x2="285" y2="165" stroke="#fde8d7" stroke-width="8" stroke-linecap="round" />
                  <line x1="305" y1="195" x2="315" y2="165" stroke="#fde8d7" stroke-width="8" stroke-linecap="round" />`;
      mouthPath = `<path d="M 190 270 Q 200 ${284 + mouthOpen * 8} 212 270 Z" fill="#78350f" /><path d="M 192 271 Q 200 276 210 271" fill="#ffffff" />`;
      sparkles = `<text x="310" y="155" font-family="sans-serif" font-weight="900" font-size="28" fill="#fbbf24">✨</text>`;
      break;

    case 'neutre':
      if (variant === 0) {
        mouthPath = mouthOpen > 0.3
          ? `<ellipse cx="200" cy="${276 + mouthOpen * 4}" rx="${8 + mouthOpen * 4}" ry="${6 + mouthOpen * 8}" fill="#78350f" /><path d="M 194 ${273 + mouthOpen * 3} Q 200 ${276 + mouthOpen * 3} 206 ${273 + mouthOpen * 3}" fill="#ffffff" />`
          : `<path d="M 190 274 Q 200 282 210 274" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
      } else {
        mouthPath = mouthOpen > 0.3
          ? `<ellipse cx="201" cy="${275 + mouthOpen * 4}" rx="${9 + mouthOpen * 3}" ry="${7 + mouthOpen * 7}" fill="#78350f" />`
          : `<path d="M 192 273 Q 201 283 212 275" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
        armRight = `<path d="M 275 350 Q 285 390 260 440" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
      }
      break;

    case 'enthousiaste':
      eyebrowLeft = `<path d="M 150 192 Q 165 186 182 194" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
      eyebrowRight = `<path d="M 218 194 Q 235 186 250 192" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
      if (variant === 0) {
        armLeft = `<path d="M 125 350 Q 80 340 75 290" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" /><circle cx="75" cy="285" r="15" fill="#fde8d7" />`;
        armRight = `<path d="M 275 350 Q 320 340 325 290" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" /><circle cx="325" cy="285" r="15" fill="#fde8d7" />`;
      } else {
        armLeft = `<path d="M 125 350 Q 75 310 90 260" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" /><circle cx="90" cy="255" r="16" fill="#fde8d7" />`;
        armRight = `<path d="M 275 350 Q 315 390 295 430" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" /><circle cx="295" cy="430" r="15" fill="#fde8d7" />`;
      }
      mouthPath = `<path d="M 188 268 Q 200 ${288 + mouthOpen * 8} 212 268 Z" fill="#78350f" /><path d="M 190 269 Q 200 274 210 269" fill="#ffffff" />`;
      sparkles = `<path d="M 85 150 L 89 162 L 101 166 L 89 170 L 85 182 L 81 170 L 69 166 L 81 162 Z" fill="#fbbf24" />
                  <path d="M 315 160 L 319 172 L 331 176 L 319 180 L 315 192 L 311 180 L 299 176 L 311 172 Z" fill="#fbbf24" />`;
      break;

    case 'explicative':
      if (variant === 0) {
        armRight = `<path d="M 275 350 Q 310 330 310 270" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
                    <circle cx="310" cy="265" r="14" fill="#fde8d7" /><path d="M 310 265 L 315 235" stroke="#fde8d7" stroke-width="9" stroke-linecap="round" />`;
      } else {
        armLeft = `<path d="M 125 350 Q 95 330 115 285" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" /><circle cx="115" cy="280" r="15" fill="#fde8d7" />`;
        armRight = `<path d="M 275 350 Q 305 330 285 285" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" /><circle cx="285" cy="280" r="15" fill="#fde8d7" />`;
      }
      mouthPath = mouthOpen > 0.3
        ? `<ellipse cx="200" cy="${276 + mouthOpen * 4}" rx="${9 + mouthOpen * 3}" ry="${7 + mouthOpen * 6}" fill="#78350f" />`
        : `<path d="M 192 272 Q 200 278 208 274" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
      break;

    case 'pensive':
      armRight = variant === 0
        ? `<path d="M 275 350 Q 280 400 240 370 Q 215 340 215 300" fill="none" stroke="#111d38" stroke-width="24" stroke-linecap="round" /><circle cx="215" cy="295" r="14" fill="#fde8d7" />`
        : `<path d="M 275 350 Q 250 370 230 330 Q 220 310 220 295" fill="none" stroke="#111d38" stroke-width="24" stroke-linecap="round" /><circle cx="220" cy="295" r="14" fill="#fde8d7" />`;
      mouthPath = `<ellipse cx="202" cy="275" rx="${6 + mouthOpen * 4}" ry="${5 + mouthOpen * 6}" fill="#78350f" />`;
      sparkles = `<text x="280" y="160" font-family="sans-serif" font-weight="900" font-size="34" fill="#fbbf24">?</text>`;
      break;

    case 'surprise':
      eyeLeft = `<ellipse cx="165" cy="223" rx="17" ry="21" fill="#1e293b" /><circle cx="163" cy="218" r="7" fill="#ffffff" />`;
      eyeRight = `<ellipse cx="235" cy="223" rx="17" ry="21" fill="#1e293b" /><circle cx="233" cy="218" r="7" fill="#ffffff" />`;
      mouthPath = `<ellipse cx="200" cy="${278 + mouthOpen * 4}" rx="${12 + mouthOpen * 4}" ry="${16 + mouthOpen * 10}" fill="#78350f" />`;
      sparkles = `<text x="285" y="150" font-family="sans-serif" font-weight="900" font-size="36" fill="#fbbf24">!</text>`;
      break;

    case 'confiante':
      armLeft = `<path d="M 125 350 Q 150 400 210 390" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
      armRight = `<path d="M 275 350 Q 250 400 190 390" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
      mouthPath = `<path d="M 190 272 Q 200 282 214 270" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      sparkles = `<path d="M 300 170 L 304 180 L 314 184 L 304 188 L 300 198 L 296 188 L 286 184 L 296 180 Z" fill="#fbbf24" />`;
      break;

    case 'joyeuse':
      eyeLeft = `<path d="M 152 225 Q 165 210 178 225" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round" />`;
      eyeRight = `<path d="M 222 225 Q 235 210 248 225" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round" />`;
      mouthPath = `<path d="M 188 266 Q 200 ${288 + mouthOpen * 8} 212 266 Z" fill="#78350f" /><ellipse cx="200" cy="272" rx="9" ry="4" fill="#ffffff" />`;
      break;

    case 'serieuse':
      eyebrowLeft = `<path d="M 150 204 L 180 200" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
      eyebrowRight = `<path d="M 220 200 L 250 204" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
      mouthPath = `<line x1="192" y1="275" x2="208" y2="275" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
      break;

    case 'ironique':
      mouthPath = `<path d="M 192 276 Q 202 278 212 268" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      break;

    case 'enervee':
      eyebrowLeft = `<path d="M 150 196 L 180 206" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      eyebrowRight = `<path d="M 220 206 L 250 196" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      mouthPath = `<path d="M 190 278 Q 200 270 210 278" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      sparkles = `<text x="270" y="180" font-family="sans-serif" font-weight="900" font-size="28" fill="#d97706">💢</text>`;
      break;

    case 'determinee':
      eyebrowLeft = `<path d="M 148 198 L 182 205" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      eyebrowRight = `<path d="M 218 205 L 252 198" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      armLeft = `<path d="M 125 350 Q 90 320 100 270" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" /><circle cx="100" cy="265" r="16" fill="#fde8d7" />`;
      mouthPath = `<path d="M 192 274 L 208 274" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      break;

    case 'embarrassee':
      armRight = `<path d="M 275 350 Q 300 290 260 210" fill="none" stroke="#111d38" stroke-width="24" stroke-linecap="round" /><circle cx="260" cy="205" r="15" fill="#fde8d7" />`;
      mouthPath = `<ellipse cx="200" cy="275" rx="6" ry="5" fill="#78350f" />`;
      sparkles = `<text x="270" y="170" font-family="sans-serif" font-weight="900" font-size="28" fill="#fbbf24">💧</text>`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
    <defs>
      <linearGradient id="aikoHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b" /><stop offset="50%" stop-color="#0f172a" /><stop offset="100%" stop-color="#070b14" />
      </linearGradient>
      <linearGradient id="aikoJacket" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a" /><stop offset="50%" stop-color="#172554" /><stop offset="100%" stop-color="#0b1329" />
      </linearGradient>
      <linearGradient id="aikoGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fde68a" /><stop offset="60%" stop-color="#fbbf24" /><stop offset="100%" stop-color="#d97706" />
      </linearGradient>
    </defs>
    ${sparkles}
    ${armLeft}
    ${armRight}
    <path d="M 120 340 C 130 330 160 320 200 320 C 240 320 270 330 280 340 L 305 500 L 95 500 Z" fill="url(#aikoJacket)" />
    <path d="M 170 320 L 200 365 L 230 320 Z" fill="#f8fafc" />
    <path d="M 195 345 L 205 345 L 208 410 L 200 422 L 192 410 Z" fill="url(#aikoGold)" />
    <rect x="184" y="280" width="32" height="45" rx="6" fill="#fde8d7" />
    <path d="M 135 210 C 135 150 265 150 265 210 C 265 265 235 305 200 305 C 165 305 135 265 135 210 Z" fill="#fde8d7" />
    <path d="M 125 210 C 105 280 115 380 140 420 L 120 420 C 95 360 85 270 115 190 Z" fill="url(#aikoHair)" />
    <path d="M 275 210 C 295 280 285 380 260 420 L 280 420 C 305 360 315 270 285 190 Z" fill="url(#aikoHair)" />
    ${eyebrowLeft}
    ${eyebrowRight}
    ${eyeLeft}
    ${eyeRight}
    <path d="M 198 248 L 201 254 L 196 256" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" />
    ${mouthPath}
    <path d="M 130 190 C 145 130 255 130 270 190 C 255 180 240 175 230 195 C 220 170 200 170 190 200 C 180 175 160 175 150 205 C 142 180 135 185 130 190 Z" fill="url(#aikoHair)" />
    <path d="M 125 180 A 75 75 0 0 1 275 180" fill="none" stroke="url(#aikoGold)" stroke-width="12" stroke-linecap="round" />
    <rect x="110" y="195" width="22" height="48" rx="10" fill="#fbbf24" stroke="#d97706" stroke-width="3" />
    <rect x="268" y="195" width="22" height="48" rx="10" fill="#fbbf24" stroke="#d97706" stroke-width="3" />
    <circle cx="121" cy="219" r="6" fill="#1e293b" />
    <circle cx="279" cy="219" r="6" fill="#1e293b" />
    <path d="M 120 225 Q 140 280 175 275" fill="none" stroke="#d97706" stroke-width="4" stroke-linecap="round" />
    <ellipse cx="178" cy="275" rx="7" ry="5" fill="#fbbf24" stroke="#fef3c7" stroke-width="1.5" />
  </svg>`;
}

// Générateur SVG de Ren avec variantes de poses par émotion
function createRenSVG(emotion = 'neutre', variant = 0, mouthOpen = 0) {
  let eyeLeft = `<ellipse cx="165" cy="225" rx="13" ry="15" fill="#1e293b" /><ellipse cx="163" cy="221" rx="4" ry="5" fill="#ffffff" />`;
  let eyeRight = `<ellipse cx="235" cy="225" rx="13" ry="15" fill="#1e293b" /><ellipse cx="233" cy="221" rx="4" ry="5" fill="#ffffff" />`;
  let eyebrowLeft = `<path d="M 150 202 L 180 198" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
  let eyebrowRight = `<path d="M 220 198 L 250 202" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
  let armLeft = `<path d="M 120 350 Q 105 410 130 460" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />`;
  let armRight = `<path d="M 280 350 Q 295 410 270 460" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />`;
  let mouthPath = '';
  let sparkles = '';

  switch (emotion) {
    case 'bonjour':
      // Geste d'accueil de la main levée
      armRight = `<path d="M 280 350 Q 320 280 300 195" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />
                  <circle cx="300" cy="190" r="16" fill="#fcd5b8" />
                  <path d="M 295 190 Q 310 165 320 175" stroke="#fcd5b8" stroke-width="9" stroke-linecap="round" />`;
      mouthPath = `<path d="M 188 268 Q 200 ${288 + mouthOpen * 8} 212 268 Z" fill="#78350f" /><path d="M 190 269 Q 200 274 210 269" fill="#ffffff" />`;
      sparkles = `<text x="315" y="155" font-family="sans-serif" font-weight="900" font-size="28" fill="#fbbf24">👋</text>`;
      break;

    case 'au_revoir':
      // Geste d'adieu V de la victoire
      armRight = `<path d="M 280 350 Q 320 280 305 200" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />
                  <circle cx="305" cy="195" r="16" fill="#fcd5b8" />
                  <line x1="300" y1="195" x2="290" y2="165" stroke="#fcd5b8" stroke-width="8" stroke-linecap="round" />
                  <line x1="310" y1="195" x2="320" y2="165" stroke="#fcd5b8" stroke-width="8" stroke-linecap="round" />`;
      mouthPath = `<path d="M 190 272 Q 200 ${284 + mouthOpen * 8} 212 272 Z" fill="#78350f" />`;
      sparkles = `<text x="315" y="155" font-family="sans-serif" font-weight="900" font-size="28" fill="#fbbf24">✌️</text>`;
      break;

    case 'neutre':
      mouthPath = mouthOpen > 0.3
        ? `<ellipse cx="200" cy="${275 + mouthOpen * 4}" rx="${8 + mouthOpen * 4}" ry="${6 + mouthOpen * 8}" fill="#78350f" />`
        : `<path d="M 192 274 L 208 274" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
      break;

    case 'enthousiaste':
      if (variant === 0) {
        armLeft = `<path d="M 120 350 Q 75 330 70 280" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" /><circle cx="70" cy="275" r="16" fill="#fcd5b8" />`;
        armRight = `<path d="M 280 350 Q 325 330 330 280" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" /><circle cx="330" cy="275" r="16" fill="#fcd5b8" />`;
      } else {
        armRight = `<path d="M 280 350 Q 330 310 320 250" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" /><circle cx="320" cy="245" r="16" fill="#fcd5b8" />`;
      }
      mouthPath = `<path d="M 188 268 Q 200 ${288 + mouthOpen * 8} 212 268 Z" fill="#78350f" /><path d="M 190 269 Q 200 274 210 269" fill="#ffffff" />`;
      sparkles = `<path d="M 320 150 L 324 162 L 336 166 L 324 170 L 320 182 L 316 170 L 304 166 L 316 162 Z" fill="#fbbf24" />`;
      break;

    case 'explicative':
      armRight = `<path d="M 280 350 Q 315 320 315 260" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" /><circle cx="315" cy="255" r="15" fill="#fcd5b8" /><path d="M 315 255 L 320 225" stroke="#fcd5b8" stroke-width="9" stroke-linecap="round" />`;
      mouthPath = mouthOpen > 0.3
        ? `<ellipse cx="200" cy="${275 + mouthOpen * 4}" rx="${9 + mouthOpen * 3}" ry="${7 + mouthOpen * 6}" fill="#78350f" />`
        : `<path d="M 192 272 Q 200 277 208 273" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
      break;

    case 'pensive':
      armRight = `<path d="M 280 350 Q 285 400 245 370 Q 215 340 215 300" fill="none" stroke="#0b1329" stroke-width="26" stroke-linecap="round" /><circle cx="215" cy="295" r="15" fill="#fcd5b8" />`;
      mouthPath = `<ellipse cx="202" cy="275" rx="${6 + mouthOpen * 4}" ry="${5 + mouthOpen * 6}" fill="#78350f" />`;
      sparkles = `<text x="280" y="160" font-family="sans-serif" font-weight="900" font-size="34" fill="#fbbf24">?</text>`;
      break;

    case 'surprise':
      eyeLeft = `<ellipse cx="165" cy="223" rx="16" ry="19" fill="#1e293b" /><circle cx="163" cy="219" r="6" fill="#ffffff" />`;
      eyeRight = `<ellipse cx="235" cy="223" rx="16" ry="19" fill="#1e293b" /><circle cx="233" cy="219" r="6" fill="#ffffff" />`;
      mouthPath = `<ellipse cx="200" cy="${278 + mouthOpen * 4}" rx="${12 + mouthOpen * 4}" ry="${16 + mouthOpen * 10}" fill="#78350f" />`;
      sparkles = `<text x="285" y="150" font-family="sans-serif" font-weight="900" font-size="36" fill="#fbbf24">!</text>`;
      break;

    case 'confiante':
      mouthPath = `<path d="M 190 274 Q 200 282 212 272" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      break;

    case 'joyeuse':
      eyeLeft = `<path d="M 152 225 Q 165 212 178 225" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" />`;
      eyeRight = `<path d="M 222 225 Q 235 212 248 225" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" />`;
      mouthPath = `<path d="M 188 268 Q 200 ${288 + mouthOpen * 8} 212 268 Z" fill="#78350f" />`;
      break;

    case 'serieuse':
      mouthPath = `<line x1="192" y1="274" x2="208" y2="274" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
      break;

    case 'ironique':
      mouthPath = `<path d="M 193 275 Q 202 277 212 269" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      break;

    case 'enervee':
      eyebrowLeft = `<path d="M 148 196 L 180 206" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      eyebrowRight = `<path d="M 220 206 L 252 196" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      mouthPath = `<path d="M 190 278 Q 200 270 210 278" fill="none" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      break;

    case 'determinee':
      eyebrowLeft = `<path d="M 148 198 L 180 204" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      eyebrowRight = `<path d="M 220 204 L 252 198" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
      mouthPath = `<line x1="192" y1="274" x2="208" y2="274" stroke="#92400e" stroke-width="4" stroke-linecap="round" />`;
      break;

    case 'embarrassee':
      armRight = `<path d="M 280 350 Q 305 290 265 210" fill="none" stroke="#0b1329" stroke-width="26" stroke-linecap="round" /><circle cx="265" cy="205" r="16" fill="#fcd5b8" />`;
      mouthPath = `<ellipse cx="200" cy="275" rx="6" ry="5" fill="#78350f" />`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
    <defs>
      <linearGradient id="renHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a" /><stop offset="60%" stop-color="#0f172a" /><stop offset="100%" stop-color="#070b14" />
      </linearGradient>
      <linearGradient id="renJacket" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#172554" /><stop offset="60%" stop-color="#0b1329" /><stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="renGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fde68a" /><stop offset="50%" stop-color="#fbbf24" /><stop offset="100%" stop-color="#d97706" />
      </linearGradient>
    </defs>
    ${sparkles}
    ${armLeft}
    ${armRight}
    <path d="M 115 340 C 130 325 160 315 200 315 C 240 315 270 325 285 340 L 310 500 L 90 500 Z" fill="url(#renJacket)" />
    <path d="M 165 315 L 200 375 L 235 315 Z" fill="#070b14" />
    <polygon points="195,355 205,355 200,345" fill="url(#renGold)" />
    <rect x="182" y="275" width="36" height="45" rx="6" fill="#fcd5b8" />
    <path d="M 135 210 C 135 150 265 150 265 210 C 265 270 235 305 200 305 C 165 305 135 270 135 210 Z" fill="#fcd5b8" />
    ${eyebrowLeft}
    ${eyebrowRight}
    ${eyeLeft}
    ${eyeRight}
    <rect x="145" y="210" width="42" height="26" rx="6" fill="none" stroke="url(#renGold)" stroke-width="3.5" />
    <rect x="213" y="210" width="42" height="26" rx="6" fill="none" stroke="url(#renGold)" stroke-width="3.5" />
    <line x1="187" y1="222" x2="213" y2="222" stroke="url(#renGold)" stroke-width="3.5" />
    <path d="M 198 250 L 202 255 L 197 257" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" />
    ${mouthPath}
    <path d="M 130 185 C 125 125 170 115 200 115 C 235 115 275 125 270 185 C 260 165 240 160 225 175 C 210 150 190 150 175 180 C 160 160 140 165 130 185 Z" fill="url(#renHair)" />
    <path d="M 130 195 A 72 72 0 0 1 270 195" fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round" />
    <rect x="114" y="205" width="22" height="42" rx="8" fill="#1e293b" stroke="url(#renGold)" stroke-width="2.5" />
    <rect x="264" y="205" width="22" height="42" rx="8" fill="#1e293b" stroke="url(#renGold)" stroke-width="2.5" />
    <path d="M 270 235 Q 260 278 220 278" fill="none" stroke="url(#renGold)" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="218" cy="278" r="5" fill="#fef3c7" />
  </svg>`;
}

// Construction des émotions pour Aiko
const aikoEmotions = {};
BASE_EMOTIONS.forEach(emo => {
  if (['neutre', 'enthousiaste', 'explicative', 'pensive'].includes(emo.id)) {
    aikoEmotions[emo.id] = [
      createAikoSVG(emo.id, 0, 0),
      createAikoSVG(emo.id, 1, 0)
    ];
  } else {
    aikoEmotions[emo.id] = [
      createAikoSVG(emo.id, 0, 0)
    ];
  }
});

// Construction des émotions pour Ren
const renEmotions = {};
BASE_EMOTIONS.forEach(emo => {
  if (['neutre', 'enthousiaste', 'explicative'].includes(emo.id)) {
    renEmotions[emo.id] = [
      createRenSVG(emo.id, 0, 0),
      createRenSVG(emo.id, 1, 0)
    ];
  } else {
    renEmotions[emo.id] = [
      createRenSVG(emo.id, 0, 0)
    ];
  }
});

export const DEFAULT_MASCOTS = [];

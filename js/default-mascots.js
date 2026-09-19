/**
 * DEFAULT MASCOTS - ANIME PODCAST STUDIO
 * Deux mascottes intégrées haute qualité avec 5 poses expressives :
 * - neutre
 * - enthousiaste
 * - explicative
 * - pensive
 * - surprise
 * Charte : Vêtements bleu nuit, accessoires jaune doré, peaux pêche naturelle. Zéro rose.
 */

// Générateur SVG d'Aiko (Podcasteuse Anime)
function createAikoSVG(pose = 'neutre', mouthOpen = 0) {
  // Ajustements selon la pose
  let eyeLeft = `<ellipse cx="165" cy="225" rx="14" ry="18" fill="#1e293b" /><ellipse cx="163" cy="220" rx="5" ry="7" fill="#ffffff" /><ellipse cx="168" cy="228" rx="2" ry="3" fill="#ffffff" />`;
  let eyeRight = `<ellipse cx="235" cy="225" rx="14" ry="18" fill="#1e293b" /><ellipse cx="233" cy="220" rx="5" ry="7" fill="#ffffff" /><ellipse cx="238" cy="228" rx="2" ry="3" fill="#ffffff" />`;
  let eyebrowLeft = `<path d="M 150 200 Q 165 194 180 198" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
  let eyebrowRight = `<path d="M 220 198 Q 235 194 250 200" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
  let armLeft = `<path d="M 125 350 Q 110 410 135 460" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
  let armRight = `<path d="M 275 350 Q 290 410 265 460" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
  let mouthPath = '';
  let sparkles = '';

  if (pose === 'neutre') {
    mouthPath = mouthOpen > 0.3
      ? `<ellipse cx="200" cy="${276 + mouthOpen * 4}" rx="${8 + mouthOpen * 4}" ry="${6 + mouthOpen * 8}" fill="#78350f" /><path d="M 194 ${273 + mouthOpen * 3} Q 200 ${276 + mouthOpen * 3} 206 ${273 + mouthOpen * 3}" fill="#ffffff" />`
      : `<path d="M 190 274 Q 200 282 210 274" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
  } else if (pose === 'enthousiaste') {
    eyebrowLeft = `<path d="M 150 192 Q 165 186 182 194" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
    eyebrowRight = `<path d="M 218 194 Q 235 186 250 192" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
    armLeft = `<path d="M 125 350 Q 80 340 75 290" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
               <circle cx="75" cy="285" r="15" fill="#fde8d7" />`;
    armRight = `<path d="M 275 350 Q 320 340 325 290" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
                <circle cx="325" cy="285" r="15" fill="#fde8d7" />`;
    mouthPath = `<path d="M 188 268 Q 200 ${288 + mouthOpen * 8} 212 268 Z" fill="#78350f" /><path d="M 190 269 Q 200 274 210 269" fill="#ffffff" />`;
    sparkles = `<path d="M 90 150 L 94 162 L 106 166 L 94 170 L 90 182 L 86 170 L 74 166 L 86 162 Z" fill="#fbbf24" />
                <path d="M 310 160 L 314 172 L 326 176 L 314 180 L 310 192 L 306 180 L 294 176 L 306 172 Z" fill="#fbbf24" />`;
  } else if (pose === 'explicative') {
    eyebrowLeft = `<path d="M 152 195 Q 165 190 180 196" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
    eyebrowRight = `<path d="M 220 194 Q 235 188 248 195" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
    armLeft = `<path d="M 125 350 Q 110 410 135 460" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />`;
    armRight = `<path d="M 275 350 Q 310 330 310 270" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
                <!-- Main avec index pointé -->
                <circle cx="310" cy="265" r="14" fill="#fde8d7" />
                <path d="M 310 265 L 315 235" stroke="#fde8d7" stroke-width="9" stroke-linecap="round" />`;
    mouthPath = mouthOpen > 0.3
      ? `<ellipse cx="200" cy="${276 + mouthOpen * 4}" rx="${9 + mouthOpen * 3}" ry="${7 + mouthOpen * 6}" fill="#78350f" /><path d="M 193 ${274 + mouthOpen * 2} Q 200 ${278 + mouthOpen * 2} 207 ${274 + mouthOpen * 2}" fill="#ffffff" />`
      : `<path d="M 192 272 Q 200 278 208 274" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
  } else if (pose === 'pensive') {
    eyebrowLeft = `<path d="M 152 196 Q 165 192 180 197" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
    eyebrowRight = `<path d="M 220 190 Q 235 194 248 202" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;
    eyeLeft = `<ellipse cx="165" cy="221" rx="14" ry="17" fill="#1e293b" /><ellipse cx="163" cy="216" rx="5" ry="6" fill="#ffffff" />`;
    eyeRight = `<ellipse cx="235" cy="221" rx="14" ry="17" fill="#1e293b" /><ellipse cx="233" cy="216" rx="5" ry="6" fill="#ffffff" />`;
    armRight = `<path d="M 275 350 Q 280 400 240 370 Q 215 340 215 300" fill="none" stroke="#111d38" stroke-width="24" stroke-linecap="round" />
                <circle cx="215" cy="295" r="14" fill="#fde8d7" />`;
    mouthPath = `<ellipse cx="202" cy="275" rx="${6 + mouthOpen * 4}" ry="${5 + mouthOpen * 6}" fill="#78350f" />`;
    sparkles = `<text x="280" y="160" font-family="sans-serif" font-weight="900" font-size="34" fill="#fbbf24">?</text>`;
  } else if (pose === 'surprise') {
    eyebrowLeft = `<path d="M 148 185 Q 165 178 182 185" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
    eyebrowRight = `<path d="M 218 185 Q 235 178 252 185" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
    eyeLeft = `<ellipse cx="165" cy="223" rx="17" ry="21" fill="#1e293b" /><circle cx="163" cy="218" r="7" fill="#ffffff" /><circle cx="168" cy="228" r="3" fill="#ffffff" />`;
    eyeRight = `<ellipse cx="235" cy="223" rx="17" ry="21" fill="#1e293b" /><circle cx="233" cy="218" r="7" fill="#ffffff" /><circle cx="238" cy="228" r="3" fill="#ffffff" />`;
    armLeft = `<path d="M 125 350 Q 85 370 95 310" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
               <circle cx="95" cy="305" r="15" fill="#fde8d7" />`;
    armRight = `<path d="M 275 350 Q 315 370 305 310" fill="none" stroke="#111d38" stroke-width="26" stroke-linecap="round" />
                <circle cx="305" cy="305" r="15" fill="#fde8d7" />`;
    mouthPath = `<ellipse cx="200" cy="${278 + mouthOpen * 4}" rx="${12 + mouthOpen * 4}" ry="${16 + mouthOpen * 10}" fill="#78350f" /><ellipse cx="200" cy="${282 + mouthOpen * 4}" rx="8" ry="6" fill="#92400e" />`;
    sparkles = `<text x="285" y="150" font-family="sans-serif" font-weight="900" font-size="36" fill="#fbbf24">!</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
    <defs>
      <linearGradient id="aikoHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="50%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#070b14" />
      </linearGradient>
      <linearGradient id="aikoJacket" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a" />
        <stop offset="50%" stop-color="#172554" />
        <stop offset="100%" stop-color="#0b1329" />
      </linearGradient>
      <linearGradient id="aikoGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fde68a" />
        <stop offset="60%" stop-color="#fbbf24" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
    </defs>

    <!-- Éclats / Sparkles décoratifs selon la pose -->
    ${sparkles}

    <!-- Bras arrière / Positionnement -->
    ${armLeft}
    ${armRight}

    <!-- Torse & Tenue (Bleu nuit profond & col doré) -->
    <path d="M 120 340 C 130 330 160 320 200 320 C 240 320 270 330 280 340 L 305 500 L 95 500 Z" fill="url(#aikoJacket)" />
    <!-- Col de chemise & Cravate dorée -->
    <path d="M 170 320 L 200 365 L 230 320 Z" fill="#f8fafc" />
    <path d="M 195 345 L 205 345 L 208 410 L 200 422 L 192 410 Z" fill="url(#aikoGold)" />

    <!-- Cou -->
    <rect x="184" y="280" width="32" height="45" rx="6" fill="#fde8d7" />

    <!-- Tête / Visage -->
    <path d="M 135 210 C 135 150 265 150 265 210 C 265 265 235 305 200 305 C 165 305 135 265 135 210 Z" fill="#fde8d7" />

    <!-- Cheveux Arrière -->
    <path d="M 125 210 C 105 280 115 380 140 420 L 120 420 C 95 360 85 270 115 190 Z" fill="url(#aikoHair)" />
    <path d="M 275 210 C 295 280 285 380 260 420 L 280 420 C 305 360 315 270 285 190 Z" fill="url(#aikoHair)" />

    <!-- Yeux & Sourcils -->
    ${eyebrowLeft}
    ${eyebrowRight}
    ${eyeLeft}
    ${eyeRight}

    <!-- Nez discret anime -->
    <path d="M 198 248 L 201 254 L 196 256" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" />

    <!-- Bouche dynamique -->
    ${mouthPath}

    <!-- Frange & Mèches Cheveux Avant -->
    <path d="M 130 190 C 145 130 255 130 270 190 C 255 180 240 175 230 195 C 220 170 200 170 190 200 C 180 175 160 175 150 205 C 142 180 135 185 130 190 Z" fill="url(#aikoHair)" />

    <!-- Casque Audio Doré Professionnel (Headphones) -->
    <path d="M 125 180 A 75 75 0 0 1 275 180" fill="none" stroke="url(#aikoGold)" stroke-width="12" stroke-linecap="round" />
    <!-- Écouteurs latéraux -->
    <rect x="110" y="195" width="22" height="48" rx="10" fill="#fbbf24" stroke="#d97706" stroke-width="3" />
    <rect x="268" y="195" width="22" height="48" rx="10" fill="#fbbf24" stroke="#d97706" stroke-width="3" />
    <circle cx="121" cy="219" r="6" fill="#1e293b" />
    <circle cx="279" cy="219" r="6" fill="#1e293b" />

    <!-- Micro-casque orienté vers la bouche -->
    <path d="M 120 225 Q 140 280 175 275" fill="none" stroke="#d97706" stroke-width="4" stroke-linecap="round" />
    <ellipse cx="178" cy="275" rx="7" ry="5" fill="#fbbf24" stroke="#fef3c7" stroke-width="1.5" />
  </svg>`;
}

// Générateur SVG de Ren (Chroniqueur Pop-Culture / Tech)
function createRenSVG(pose = 'neutre', mouthOpen = 0) {
  let eyeLeft = `<ellipse cx="165" cy="225" rx="13" ry="15" fill="#1e293b" /><ellipse cx="163" cy="221" rx="4" ry="5" fill="#ffffff" />`;
  let eyeRight = `<ellipse cx="235" cy="225" rx="13" ry="15" fill="#1e293b" /><ellipse cx="233" cy="221" rx="4" ry="5" fill="#ffffff" />`;
  let eyebrowLeft = `<path d="M 150 202 L 180 198" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
  let eyebrowRight = `<path d="M 220 198 L 250 202" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
  let armLeft = `<path d="M 120 350 Q 105 410 130 460" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />`;
  let armRight = `<path d="M 280 350 Q 295 410 270 460" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />`;
  let mouthPath = '';
  let sparkles = '';

  if (pose === 'neutre') {
    mouthPath = mouthOpen > 0.3
      ? `<ellipse cx="200" cy="${275 + mouthOpen * 4}" rx="${8 + mouthOpen * 4}" ry="${6 + mouthOpen * 8}" fill="#78350f" />`
      : `<path d="M 192 274 L 208 274" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
  } else if (pose === 'enthousiaste') {
    eyebrowLeft = `<path d="M 148 196 L 180 192" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
    eyebrowRight = `<path d="M 220 192 L 252 196" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
    armLeft = `<path d="M 120 350 Q 75 330 70 280" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />
               <circle cx="70" cy="275" r="16" fill="#fcd5b8" />`;
    armRight = `<path d="M 280 350 Q 325 330 330 280" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />
                <circle cx="330" cy="275" r="16" fill="#fcd5b8" />`;
    mouthPath = `<path d="M 188 268 Q 200 ${288 + mouthOpen * 8} 212 268 Z" fill="#78350f" /><path d="M 190 269 Q 200 274 210 269" fill="#ffffff" />`;
    sparkles = `<path d="M 320 150 L 324 162 L 336 166 L 324 170 L 320 182 L 316 170 L 304 166 L 316 162 Z" fill="#fbbf24" />`;
  } else if (pose === 'explicative') {
    armLeft = `<path d="M 120 350 Q 105 410 130 460" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />`;
    armRight = `<path d="M 280 350 Q 315 320 315 260" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />
                <circle cx="315" cy="255" r="15" fill="#fcd5b8" />
                <path d="M 315 255 L 320 225" stroke="#fcd5b8" stroke-width="9" stroke-linecap="round" />`;
    mouthPath = mouthOpen > 0.3
      ? `<ellipse cx="200" cy="${275 + mouthOpen * 4}" rx="${9 + mouthOpen * 3}" ry="${7 + mouthOpen * 6}" fill="#78350f" />`
      : `<path d="M 192 272 Q 200 277 208 273" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round" />`;
  } else if (pose === 'pensive') {
    eyebrowLeft = `<path d="M 150 200 L 180 196" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
    eyebrowRight = `<path d="M 220 192 L 250 204" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />`;
    armRight = `<path d="M 280 350 Q 285 400 245 370 Q 215 340 215 300" fill="none" stroke="#0b1329" stroke-width="26" stroke-linecap="round" />
                <circle cx="215" cy="295" r="15" fill="#fcd5b8" />`;
    mouthPath = `<ellipse cx="202" cy="275" rx="${6 + mouthOpen * 4}" ry="${5 + mouthOpen * 6}" fill="#78350f" />`;
    sparkles = `<text x="280" y="160" font-family="sans-serif" font-weight="900" font-size="34" fill="#fbbf24">?</text>`;
  } else if (pose === 'surprise') {
    eyebrowLeft = `<path d="M 148 186 L 180 182" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
    eyebrowRight = `<path d="M 220 182 L 252 186" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />`;
    eyeLeft = `<ellipse cx="165" cy="223" rx="16" ry="19" fill="#1e293b" /><circle cx="163" cy="219" r="6" fill="#ffffff" />`;
    eyeRight = `<ellipse cx="235" cy="223" rx="16" ry="19" fill="#1e293b" /><circle cx="233" cy="219" r="6" fill="#ffffff" />`;
    armLeft = `<path d="M 120 350 Q 80 370 90 310" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />
               <circle cx="90" cy="305" r="16" fill="#fcd5b8" />`;
    armRight = `<path d="M 280 350 Q 320 370 310 310" fill="none" stroke="#0b1329" stroke-width="28" stroke-linecap="round" />
                <circle cx="310" cy="305" r="16" fill="#fcd5b8" />`;
    mouthPath = `<ellipse cx="200" cy="${278 + mouthOpen * 4}" rx="${12 + mouthOpen * 4}" ry="${16 + mouthOpen * 10}" fill="#78350f" />`;
    sparkles = `<text x="285" y="150" font-family="sans-serif" font-weight="900" font-size="36" fill="#fbbf24">!</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
    <defs>
      <linearGradient id="renHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a" />
        <stop offset="60%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#070b14" />
      </linearGradient>
      <linearGradient id="renJacket" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#172554" />
        <stop offset="60%" stop-color="#0b1329" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="renGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fde68a" />
        <stop offset="50%" stop-color="#fbbf24" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
    </defs>

    ${sparkles}

    <!-- Bras -->
    ${armLeft}
    ${armRight}

    <!-- Veste & T-shirt -->
    <path d="M 115 340 C 130 325 160 315 200 315 C 240 315 270 325 285 340 L 310 500 L 90 500 Z" fill="url(#renJacket)" />
    <!-- T-shirt intérieur foncé avec logo doré -->
    <path d="M 165 315 L 200 375 L 235 315 Z" fill="#070b14" />
    <polygon points="195,355 205,355 200,345" fill="url(#renGold)" />

    <!-- Cou -->
    <rect x="182" y="275" width="36" height="45" rx="6" fill="#fcd5b8" />

    <!-- Visage -->
    <path d="M 135 210 C 135 150 265 150 265 210 C 265 270 235 305 200 305 C 165 305 135 270 135 210 Z" fill="#fcd5b8" />

    <!-- Yeux & Sourcils -->
    ${eyebrowLeft}
    ${eyebrowRight}
    ${eyeLeft}
    ${eyeRight}

    <!-- Lunettes Stylées (Monture Dorée) -->
    <rect x="145" y="210" width="42" height="26" rx="6" fill="none" stroke="url(#renGold)" stroke-width="3.5" />
    <rect x="213" y="210" width="42" height="26" rx="6" fill="none" stroke="url(#renGold)" stroke-width="3.5" />
    <line x1="187" y1="222" x2="213" y2="222" stroke="url(#renGold)" stroke-width="3.5" />

    <!-- Nez -->
    <path d="M 198 250 L 202 255 L 197 257" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" />

    <!-- Bouche -->
    ${mouthPath}

    <!-- Cheveux courts hérissés anime -->
    <path d="M 130 185 C 125 125 170 115 200 115 C 235 115 275 125 270 185 C 260 165 240 160 225 175 C 210 150 190 150 175 180 C 160 160 140 165 130 185 Z" fill="url(#renHair)" />
    <!-- Mèches dynamiques -->
    <polygon points="190,115 198,95 205,116" fill="url(#renHair)" />
    <polygon points="215,118 228,100 230,122" fill="url(#renHair)" />
    <polygon points="168,122 160,102 175,120" fill="url(#renHair)" />

    <!-- Écouteurs modernes tour de cou avec micro -->
    <path d="M 130 195 A 72 72 0 0 1 270 195" fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round" />
    <rect x="114" y="205" width="22" height="42" rx="8" fill="#1e293b" stroke="url(#renGold)" stroke-width="2.5" />
    <rect x="264" y="205" width="22" height="42" rx="8" fill="#1e293b" stroke="url(#renGold)" stroke-width="2.5" />
    <path d="M 270 235 Q 260 278 220 278" fill="none" stroke="url(#renGold)" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="218" cy="278" r="5" fill="#fef3c7" />
  </svg>`;
}

export const DEFAULT_MASCOTS = [
  {
    id: 'default-aiko',
    name: 'Aiko',
    tagline: 'Podcasteuse Anime & Pop-Culture',
    isDefault: true,
    poses: {
      neutre: createAikoSVG('neutre', 0),
      enthousiaste: createAikoSVG('enthousiaste', 0),
      explicative: createAikoSVG('explicative', 0),
      pensive: createAikoSVG('pensive', 0),
      surprise: createAikoSVG('surprise', 0)
    },
    // Générateurs de SVG avec flap buccal temps réel
    getSvgWithMouth: (pose, mouthOpen) => createAikoSVG(pose, mouthOpen)
  },
  {
    id: 'default-ren',
    name: 'Ren',
    tagline: 'Chroniqueur Tech & Critique Manga',
    isDefault: true,
    poses: {
      neutre: createRenSVG('neutre', 0),
      enthousiaste: createRenSVG('enthousiaste', 0),
      explicative: createRenSVG('explicative', 0),
      pensive: createRenSVG('pensive', 0),
      surprise: createRenSVG('surprise', 0)
    },
    getSvgWithMouth: (pose, mouthOpen) => createRenSVG(pose, mouthOpen)
  }
];

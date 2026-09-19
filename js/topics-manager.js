/**
 * TOPICS MANAGER - AUTOPOD STUDIO
 * Panneau "Sujets Vidéo" : génération assistée d'une vidéo longue (5-10 min)
 * à partir d'un sujet anime/pop-culture choisi en un clic.
 * Flux : clic sur un sujet -> script écrit par Gemini -> aperçu éditable ->
 * validation -> voix off (ElevenLabs/Gemini TTS) -> segmentation & alternance
 * de poses (existant) -> regroupement en scènes + illustrations par scène
 * (Gemini image) -> export vidéo (existant).
 */

import { PRESET_ENGLISH_VOICES } from './audio-manager.js';
import { WORKER_BASE_URL } from './worker-config.js';

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const SCENE_TARGET_DURATION = 40; // secondes visées par scène/illustration

// Icônes SVG (style Feather, cohérent avec le reste de l'interface) pour
// chaque sujet, en remplacement des emojis.
const ICON_FLAG = '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>';
const ICON_DOMAIN = '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="4"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2"></path>';
const ICON_SWORDS = '<path d="M4 4l16 16"></path><path d="M20 4L4 20"></path><path d="M4 4l3 0M4 4l0 3M20 4l-3 0M20 4l0 3M4 20l3 0M4 20l0-3M20 20l-3 0M20 20l0-3"></path>';
const ICON_DAGGER = '<path d="M12 2v12"></path><path d="M8 14h8l-4 8z"></path><path d="M9 6h6"></path>';
const ICON_FLAME = '<path d="M12 22c4 0 6-3 6-6.5 0-3-2-4.5-3-7-1 2-2 3-2 3-1-2 0-4-1-6-3 2-5 5-5 9 0 4 1.5 7.5 5 7.5z"></path>';
const ICON_APPLE = '<path d="M12 7c2 0 4.5 2 4.5 6S14 21 12 21s-4.5-3-4.5-8S10 7 12 7z"></path><path d="M12 7c0-1.2 1-2.2 2-2.2"></path><path d="M9.5 4.5c1.2 0 2.2.6 2.5 2"></path>';
const ICON_EYE = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle>';
const ICON_DROPLET = '<path d="M12 2s7 8.5 7 13.5a7 7 0 0 1-14 0C5 10.5 12 2 12 2z"></path>';
const ICON_ANCHOR = '<circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>';
const ICON_CLOCK = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
const ICON_MASK = '<path d="M6 10c0-4 3-6 6-6s6 2 6 6v4c0 4-3 7-6 7s-6-3-6-7z"></path><path d="M7 8l-2-4M17 8l2-4"></path><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle>';
const ICON_SPIRAL = '<path d="M12 2a10 10 0 1 0 7 17"></path><path d="M12 7a5 5 0 1 0 3.5 8.5"></path>';
const ICON_TOMBSTONE = '<path d="M7 22V11a5 5 0 0 1 10 0v11"></path><line x1="5" y1="22" x2="19" y2="22"></line><line x1="10" y1="8" x2="14" y2="8"></line><line x1="12" y1="6" x2="12" y2="10"></line>';
const ICON_FIST = '<path d="M7 21V13a3 3 0 0 1 3-3h1V6a2 2 0 0 1 4 0v1.2a2 2 0 0 1 3 1.8v2a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5H9a2 2 0 0 1-2-2z"></path>';
const ICON_FILM = '<path d="M2 8h20M7 3v5M17 3v5"></path><rect x="2" y="8" width="20" height="13" rx="2" ry="2"></rect><path d="M9 12.5l5 2.5-5 2.5z"></path>';
const ICON_PERSON = '<circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 1 0-16 0"></path>';

function iconSvg(innerPath, size = 26) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${innerPath}</svg>`;
}

export const VIDEO_TOPICS = [
  {
    id: 'one-piece-void-century',
    icon: ICON_FLAG,
    title: 'One Piece : Le Secret du Siècle Oublié',
    category: 'Théorie & Lore',
    hook: "Du Grand Line à Joy Boy, on reconstitue le mystère ultime derrière le trésor de Roger.",
    angle: "A deep theory-driven retrospective connecting the Void Century, the Ancient Weapons, and Joy Boy's identity, building suspense toward Luffy's role in completing the story."
  },
  {
    id: 'jjk-domain-expansions',
    icon: ICON_DOMAIN,
    title: 'Jujutsu Kaisen : Le Classement des Domaines',
    category: 'Classement',
    hook: "On classe les Domain Expansions les plus dévastatrices, de Gojo à Sukuna.",
    angle: "A ranked countdown of the most powerful Domain Expansions in Jujutsu Kaisen, analyzing their mechanics, symbolism and the sorcerers behind them."
  },
  {
    id: 'snk-eren-paradox',
    icon: ICON_SWORDS,
    title: "L'Attaque des Titans : Le Paradoxe d'Eren",
    category: 'Analyse',
    hook: "Héros ou monstre ? On décortique la chute tragique d'Eren Jaeger.",
    angle: "A psychological deep-dive into Eren Jaeger's transformation from victim to antagonist, examining free will, fate, and the Rumbling's moral weight."
  },
  {
    id: 'solo-leveling-rise',
    icon: ICON_DAGGER,
    title: "Solo Leveling : L'Éveil du Monarque",
    category: 'Rétrospective',
    hook: "De chasseur rang E à Monarque des Ombres, retour sur l'ascension de Sung Jinwoo.",
    angle: "A power-scaling retrospective tracing Sung Jinwoo's evolution from the weakest hunter to the Shadow Monarch, highlighting key turning points."
  },
  {
    id: 'demon-slayer-animation',
    icon: ICON_FLAME,
    title: "Demon Slayer : Le Secret de l'Animation Ufotable",
    category: 'Making-of',
    hook: "Comment Ufotable a redéfini les standards de l'animation d'action.",
    angle: "A technical breakdown of Ufotable's animation techniques in Demon Slayer, from 2D/3D hybrid backgrounds to fluid combat choreography."
  },
  {
    id: 'death-note-duel',
    icon: ICON_APPLE,
    title: 'Death Note : Le Duel Light vs L',
    category: 'Analyse',
    hook: "La plus grande bataille d'esprits de l'anime, phase par phase.",
    angle: "A chess-match analysis of the psychological duel between Light Yagami and L, breaking down their strategies and fatal mistakes."
  },
  {
    id: 'gojo-evolution',
    icon: ICON_EYE,
    title: "Jujutsu Kaisen : L'Évolution de Gojo",
    category: 'Portrait',
    hook: "Le sorcier le plus fort à travers son passé, sa philosophie et sa chute.",
    angle: "A character study of Satoru Gojo, exploring his backstory, his 'strongest' philosophy, and the tragedy that follows him."
  },
  {
    id: 'chainsaw-man-horror',
    icon: ICON_DROPLET,
    title: "Chainsaw Man : L'Horreur qui Fascine",
    category: 'Analyse',
    hook: "Pourquoi le body-horror de Chainsaw Man captive autant qu'il dérange.",
    angle: "An analysis of Chainsaw Man's unique blend of body horror, dark comedy and emotional storytelling, and why it stands out in modern anime."
  },
  {
    id: 'vinland-saga-redemption',
    icon: ICON_ANCHOR,
    title: 'Vinland Saga : Le Chemin de la Rédemption',
    category: 'Thème',
    hook: "De guerrier sanguinaire à pacifiste, le voyage le plus mature de l'anime.",
    angle: "A thematic exploration of Thorfinn's journey from vengeance to pacifism in Vinland Saga, and what it says about the cost of violence."
  },
  {
    id: 'frieren-time',
    icon: ICON_CLOCK,
    title: 'Frieren : La Beauté du Temps qui Passe',
    category: 'Thème',
    hook: "Une elfe immortelle face à la fragilité de la vie humaine.",
    angle: "A reflective essay on Frieren's meditation on mortality, memory and the slow passage of time, and why it resonates with viewers."
  },
  {
    id: 'jjk-curses-explained',
    icon: ICON_MASK,
    title: 'Jujutsu Kaisen : Les Malédictions Expliquées',
    category: 'Lore',
    hook: "Comment naissent les fléaux, et pourquoi ils sont le vrai miroir de l'humanité.",
    angle: "An explainer on the lore of cursed energy and curses in Jujutsu Kaisen, connecting them to human emotion and societal fear."
  },
  {
    id: 'naruto-legacy',
    icon: ICON_SPIRAL,
    title: "Naruto : L'Héritage d'une Génération",
    category: 'Rétrospective',
    hook: "Comment Naruto a changé l'anime pour toujours, 20 ans après.",
    angle: "A legacy retrospective on Naruto's cultural impact on anime worldwide, its themes of perseverance, and its lasting influence on the genre."
  },
  {
    id: 'bleach-return',
    icon: ICON_TOMBSTONE,
    title: 'Bleach : Le Retour Triomphant',
    category: 'Rétrospective',
    hook: "Après des années d'attente, la Guerre Sanglante du Millénaire tient enfin ses promesses.",
    angle: "A retrospective on Bleach's long-awaited return with the Thousand-Year Blood War arc, and why it redeems the series' legacy."
  },
  {
    id: 'mha-all-might-origin',
    icon: ICON_FIST,
    title: "My Hero Academia : Les Origines d'All Might",
    category: 'Portrait',
    hook: "Le Symbole de la Paix n'a pas toujours été invincible.",
    angle: "A character origin story exploring All Might's rise from a quirkless boy to the world's greatest hero, and the sacrifices behind the smile."
  }
];

export class TopicsManager {
  constructor(app) {
    this.app = app;
    this.gridEl = document.getElementById('topics-grid');

    this.modal = document.getElementById('modal-topic-pipeline');
    this.statusEl = document.getElementById('topic-pipeline-status');

    this.previewModal = document.getElementById('modal-topic-preview');
    this.previewTitleEl = document.getElementById('topic-preview-title');
    this.previewScriptEl = document.getElementById('topic-preview-script');
    this.btnPreviewGenerate = document.getElementById('btn-topic-preview-generate');
    this.btnPreviewCancel = document.getElementById('btn-topic-preview-cancel');
    this.previewCloseBtn = document.getElementById('modal-topic-preview-close-btn');

    this.currentPreviewTopic = null;
    this.isGenerating = false;

    this.btnPreviewGenerate?.addEventListener('click', () => this.confirmGenerateFromPreview());
    this.btnPreviewCancel?.addEventListener('click', () => this.closePreviewModal());
    this.previewCloseBtn?.addEventListener('click', () => this.closePreviewModal());
    this.previewModal?.addEventListener('click', (e) => {
      if (e.target === this.previewModal) this.closePreviewModal();
    });
  }

  // ==================== RENDU DE LA GRILLE ====================

  renderGrid() {
    if (!this.gridEl) {
      this.gridEl = document.getElementById('topics-grid');
    }
    if (!this.gridEl) return;

    this.updateActiveMascotLabel();
    this.gridEl.innerHTML = '';

    VIDEO_TOPICS.forEach(topic => {
      const card = document.createElement('div');
      card.className = 'mascot-full-card';
      card.dataset.id = topic.id;
      card.style.cursor = 'pointer';

      const thumb = document.createElement('div');
      thumb.className = 'mascot-full-thumb';
      thumb.innerHTML = iconSvg(topic.icon, 30);

      const nameEl = document.createElement('div');
      nameEl.className = 'mascot-full-name';
      nameEl.textContent = topic.title;

      const hookEl = document.createElement('div');
      hookEl.style.cssText = 'font-size:0.78rem; color: var(--text-muted); margin: 4px 0 8px; line-height:1.4;';
      hookEl.textContent = topic.hook;

      const statsEl = document.createElement('div');
      statsEl.className = 'mascot-full-stats';

      const catBadge = document.createElement('span');
      catBadge.className = 'mascot-stat-badge';
      catBadge.textContent = topic.category;

      const durBadge = document.createElement('span');
      durBadge.className = 'mascot-stat-badge';
      durBadge.style.cssText = 'display:inline-flex; align-items:center; gap:4px;';
      durBadge.innerHTML = `${iconSvg(ICON_FILM, 12)}<span>5-10 min</span>`;

      statsEl.appendChild(catBadge);
      statsEl.appendChild(durBadge);

      const btnPreview = document.createElement('button');
      btnPreview.type = 'button';
      btnPreview.className = 'btn btn-gold btn-sm';
      btnPreview.style.cssText = 'margin-top:10px; width:100%;';
      btnPreview.textContent = 'Aperçu du script';
      btnPreview.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openTopicPreview(topic);
      });

      card.appendChild(thumb);
      card.appendChild(nameEl);
      card.appendChild(hookEl);
      card.appendChild(statsEl);
      card.appendChild(btnPreview);

      card.addEventListener('click', () => this.openTopicPreview(topic));

      this.gridEl.appendChild(card);
    });
  }

  updateActiveMascotLabel() {
    const label = document.getElementById('topics-active-mascot');
    if (!label) return;
    const mascot = this.app.mascotManager?.activeMascot;
    label.innerHTML = mascot
      ? `${iconSvg(ICON_PERSON, 14)} Mascotte active : ${mascot.name} — changez-la depuis la page Mascottes si besoin.`
      : `${iconSvg(ICON_PERSON, 14)} Aucune mascotte sélectionnée.`;
  }

  // ==================== ÉTAPE 1 : APERÇU DU SCRIPT ====================

  async openTopicPreview(topic) {
    if (this.isGenerating) {
      alert('Une génération est déjà en cours, merci de patienter.');
      return;
    }

    const geminiKey = this.app.audioManager.getGeminiKey();
    if (!geminiKey && !WORKER_BASE_URL) {
      alert("Veuillez renseigner votre clé API Gemini dans Paramètres avant de générer un script (script et illustrations en dépendent).");
      this.app.navigateTo('page-settings');
      return;
    }

    this.isGenerating = true;
    this.showPipelineModal('Écriture du script...');

    try {
      const script = await this.generateScript(topic);
      this.hidePipelineModal();
      this.currentPreviewTopic = topic;
      this.openPreviewModal(topic, script);
    } catch (err) {
      console.error('[TopicsManager] Échec de la génération du script:', err);
      alert("Erreur lors de l'écriture du script : " + err.message);
      this.hidePipelineModal();
    } finally {
      this.isGenerating = false;
    }
  }

  openPreviewModal(topic, script) {
    if (!this.previewModal) this.previewModal = document.getElementById('modal-topic-preview');
    if (!this.previewTitleEl) this.previewTitleEl = document.getElementById('topic-preview-title');
    if (!this.previewScriptEl) this.previewScriptEl = document.getElementById('topic-preview-script');

    if (this.previewTitleEl) this.previewTitleEl.textContent = topic.title;
    if (this.previewScriptEl) this.previewScriptEl.value = script;
    this.previewModal?.classList.add('open');
  }

  closePreviewModal() {
    this.previewModal?.classList.remove('open');
    this.currentPreviewTopic = null;
  }

  // ==================== ÉTAPE 2 : GÉNÉRATION COMPLÈTE (depuis l'aperçu) ====================

  async confirmGenerateFromPreview() {
    if (this.isGenerating) return;
    const topic = this.currentPreviewTopic;
    const script = this.previewScriptEl?.value?.trim();

    if (!topic || !script) {
      alert('Aucun script à générer.');
      return;
    }

    this.closePreviewModal();
    await this.generateFullVideo(topic, script);
  }

  async generateFullVideo(topic, script) {
    if (this.isGenerating) {
      alert('Une génération est déjà en cours, merci de patienter.');
      return;
    }

    this.isGenerating = true;
    this.showPipelineModal('Préparation de la voix off...');

    try {
      if (this.app.textareaTts) {
        this.app.textareaTts.value = script;
      }
      document.getElementById('tab-audio-tts')?.click();

      this.updatePipelineStatus('Synthèse de la voix off...');
      const voiceId = this.pickVoiceId();
      const result = await this.app.audioManager.synthesizeSpeech(script, voiceId, 1.0, 1.0);

      this.app.speechAnalyzer.analyzeAudioBuffer(result.buffer, result.sentences);
      const segments = this.app.speechAnalyzer.segments;
      const scenes = this.buildScenes(segments);

      for (let i = 0; i < scenes.length; i++) {
        this.updatePipelineStatus(`Génération des illustrations (${i + 1}/${scenes.length})...`);
        try {
          const dataUrl = await this.generateSceneImage(scenes[i], topic);
          await this.app.speechAnalyzer.assignImageToSegments(scenes[i].segmentIds, dataUrl);
        } catch (imgErr) {
          console.warn(`[TopicsManager] Échec illustration scène ${i + 1}:`, imgErr);
        }
      }

      this.app.speechAnalyzer.renderSegmentsList();
      this.hidePipelineModal();

      this.app.navigateTo('page-production');
      await this.app.videoExporter.startExport();
    } catch (err) {
      console.error('[TopicsManager] Échec de la génération automatique:', err);
      alert('Erreur lors de la génération automatique : ' + err.message);
      this.hidePipelineModal();
    } finally {
      this.isGenerating = false;
    }
  }

  pickVoiceId() {
    const elKey = this.app.audioManager.getElevenLabsKey();
    if (elKey) {
      const preset = PRESET_ENGLISH_VOICES.find(v => v.provider === 'ElevenLabs');
      if (preset) return preset.id;
    }
    return 'gemini-Orbit';
  }

  // ==================== GÉNÉRATION DU SCRIPT (GEMINI TEXTE) ====================

  async generateScript(topic) {
    const apiKey = this.app.audioManager.getGeminiKey();
    const useWorker = !apiKey && !!WORKER_BASE_URL;
    const mascotName = this.app.mascotManager?.activeMascot?.name || 'the host';

    const groundingContext = WORKER_BASE_URL ? await this.fetchGroundingContext(topic) : '';
    const groundingBlock = groundingContext
      ? `\nHere is real reference context to keep facts accurate (weave it naturally into the narration, never read it out as a list):\n${groundingContext}\n`
      : '';

    const prompt = `You are writing a spoken-word narration script for an anime & pop-culture video essay hosted by a mascot named ${mascotName}.

Topic: ${topic.title}
Angle: ${topic.angle}
${groundingBlock}
Write ONLY the narration text the host will speak out loud — no markdown, no headers, no stage directions, no bullet points, just flowing spoken sentences.
Requirements:
- Length: approximately 1200 to 1450 words (about 8 minutes of natural spoken pace).
- Open with a warm, energetic greeting to the audience (e.g. "Welcome back..." / "Hey everyone...").
- Close with a friendly sign-off inviting the audience to come back (e.g. "...see you next time!").
- Vary sentence rhythm throughout: mix short punchy statements, a few rhetorical questions, and several exclamations to keep an enthusiastic, engaging tone.
- Structure the content into clear thematic beats (roughly one new idea every 3-5 sentences) so a video editor could naturally cut to a new illustration at each beat.
- Written entirely in English, aimed at an enthusiastic anime/pop-culture fan audience.
- Do not use any markdown formatting, asterisks, or headers — plain narration text only.`;

    const url = useWorker
      ? `${WORKER_BASE_URL}/proxy/gemini/${GEMINI_TEXT_MODEL}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erreur HTTP ${response.status} (script)`);
    }

    const json = await response.json();
    const rawText = (json.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || '')
      .join('');

    if (!rawText.trim()) {
      throw new Error("Gemini n'a retourné aucun texte de script.");
    }

    return this.cleanScriptText(rawText);
  }

  /**
   * Récupère quelques faits réels via Tavily (search grounding) pour rendre le
   * script plus factuellement fiable. Passe toujours par le Worker (la clé
   * Tavily n'existe que côté serveur) ; retourne '' silencieusement en cas
   * d'échec ou si aucun Worker n'est configuré, sans jamais bloquer le pipeline.
   */
  async fetchGroundingContext(topic) {
    if (!WORKER_BASE_URL) return '';
    try {
      const response = await fetch(`${WORKER_BASE_URL}/proxy/tavily/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${topic.title} ${topic.angle}`, max_results: 4 })
      });
      if (!response.ok) return '';
      const json = await response.json();
      const results = json.results || [];
      return results
        .map(r => `- ${r.title}: ${(r.content || '').slice(0, 300)}`)
        .join('\n');
    } catch (err) {
      console.warn('[TopicsManager] Contexte Tavily indisponible, poursuite sans grounding:', err);
      return '';
    }
  }

  cleanScriptText(text) {
    return text
      .replace(/\*\*/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .trim();
  }

  // ==================== SCÈNES : REGROUPEMENT POUR LES ILLUSTRATIONS ====================

  buildScenes(segments) {
    const scenes = [];
    let current = null;

    segments.forEach(seg => {
      if (!current) {
        current = { segmentIds: [], texts: [], duration: 0 };
      }
      current.segmentIds.push(seg.id);
      current.texts.push(seg.origText || seg.text || '');
      current.duration += seg.duration || 0;

      if (current.duration >= SCENE_TARGET_DURATION) {
        scenes.push(current);
        current = null;
      }
    });

    if (current && current.segmentIds.length) {
      scenes.push(current);
    }

    return scenes;
  }

  // ==================== GÉNÉRATION D'ILLUSTRATION PAR SCÈNE (GEMINI IMAGE) ====================

  async generateSceneImage(scene, topic) {
    const apiKey = this.app.audioManager.getGeminiKey();
    const useWorker = !apiKey && !!WORKER_BASE_URL;
    const excerpt = scene.texts.join(' ').slice(0, 300);

    const prompt = `Cinematic anime-style digital illustration for a video essay about "${topic.title}" (${topic.angle}). Scene context: ${excerpt}. Style: dramatic anime key visual, deep navy blue and gold accent lighting, dynamic composition, high detail, no text, no watermark, no logo, 16:9 widescreen.`;

    const url = useWorker
      ? `${WORKER_BASE_URL}/proxy/gemini/${GEMINI_IMAGE_MODEL}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erreur HTTP ${response.status} (image)`);
    }

    const json = await response.json();
    const parts = json.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData && p.inlineData.data);

    if (!imgPart) {
      throw new Error("Gemini n'a retourné aucune image.");
    }

    const mimeType = imgPart.inlineData.mimeType || 'image/png';
    return `data:${mimeType};base64,${imgPart.inlineData.data}`;
  }

  // ==================== MODAL DE STATUT (PIPELINE) ====================

  showPipelineModal(text) {
    if (!this.modal) this.modal = document.getElementById('modal-topic-pipeline');
    if (!this.statusEl) this.statusEl = document.getElementById('topic-pipeline-status');
    this.updatePipelineStatus(text);
    this.modal?.classList.add('open');
  }

  updatePipelineStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  hidePipelineModal() {
    this.modal?.classList.remove('open');
  }
}

/**
 * TOPICS MANAGER - AUTOPOD STUDIO
 * Panneau "Sujets Vidéo" : génération 100% automatique d'une vidéo longue (5-10 min)
 * à partir d'un sujet anime/pop-culture choisi en un clic.
 * Pipeline : script (Gemini texte) -> voix off (ElevenLabs/Gemini TTS) -> segmentation
 * & alternance de poses (existant) -> regroupement en scènes + illustrations par scène
 * (Gemini image) -> export vidéo (existant).
 */

import { PRESET_ENGLISH_VOICES } from './audio-manager.js';
import { WORKER_BASE_URL } from './worker-config.js';

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const SCENE_TARGET_DURATION = 40; // secondes visées par scène/illustration

export const VIDEO_TOPICS = [
  {
    id: 'one-piece-void-century',
    emoji: '🏴‍☠️',
    title: 'One Piece : Le Secret du Siècle Oublié',
    category: 'Théorie & Lore',
    hook: "Du Grand Line à Joy Boy, on reconstitue le mystère ultime derrière le trésor de Roger.",
    angle: "A deep theory-driven retrospective connecting the Void Century, the Ancient Weapons, and Joy Boy's identity, building suspense toward Luffy's role in completing the story."
  },
  {
    id: 'jjk-domain-expansions',
    emoji: '🤞',
    title: 'Jujutsu Kaisen : Le Classement des Domaines',
    category: 'Classement',
    hook: "On classe les Domain Expansions les plus dévastatrices, de Gojo à Sukuna.",
    angle: "A ranked countdown of the most powerful Domain Expansions in Jujutsu Kaisen, analyzing their mechanics, symbolism and the sorcerers behind them."
  },
  {
    id: 'snk-eren-paradox',
    emoji: '⚔️',
    title: "L'Attaque des Titans : Le Paradoxe d'Eren",
    category: 'Analyse',
    hook: "Héros ou monstre ? On décortique la chute tragique d'Eren Jaeger.",
    angle: "A psychological deep-dive into Eren Jaeger's transformation from victim to antagonist, examining free will, fate, and the Rumbling's moral weight."
  },
  {
    id: 'solo-leveling-rise',
    emoji: '🗡️',
    title: "Solo Leveling : L'Éveil du Monarque",
    category: 'Rétrospective',
    hook: "De chasseur rang E à Monarque des Ombres, retour sur l'ascension de Sung Jinwoo.",
    angle: "A power-scaling retrospective tracing Sung Jinwoo's evolution from the weakest hunter to the Shadow Monarch, highlighting key turning points."
  },
  {
    id: 'demon-slayer-animation',
    emoji: '🔥',
    title: "Demon Slayer : Le Secret de l'Animation Ufotable",
    category: 'Making-of',
    hook: "Comment Ufotable a redéfini les standards de l'animation d'action.",
    angle: "A technical breakdown of Ufotable's animation techniques in Demon Slayer, from 2D/3D hybrid backgrounds to fluid combat choreography."
  },
  {
    id: 'death-note-duel',
    emoji: '🍎',
    title: 'Death Note : Le Duel Light vs L',
    category: 'Analyse',
    hook: "La plus grande bataille d'esprits de l'anime, phase par phase.",
    angle: "A chess-match analysis of the psychological duel between Light Yagami and L, breaking down their strategies and fatal mistakes."
  },
  {
    id: 'gojo-evolution',
    emoji: '👁️',
    title: "Jujutsu Kaisen : L'Évolution de Gojo",
    category: 'Portrait',
    hook: "Le sorcier le plus fort à travers son passé, sa philosophie et sa chute.",
    angle: "A character study of Satoru Gojo, exploring his backstory, his 'strongest' philosophy, and the tragedy that follows him."
  },
  {
    id: 'chainsaw-man-horror',
    emoji: '🩸',
    title: "Chainsaw Man : L'Horreur qui Fascine",
    category: 'Analyse',
    hook: "Pourquoi le body-horror de Chainsaw Man captive autant qu'il dérange.",
    angle: "An analysis of Chainsaw Man's unique blend of body horror, dark comedy and emotional storytelling, and why it stands out in modern anime."
  },
  {
    id: 'vinland-saga-redemption',
    emoji: '⚓',
    title: 'Vinland Saga : Le Chemin de la Rédemption',
    category: 'Thème',
    hook: "De guerrier sanguinaire à pacifiste, le voyage le plus mature de l'anime.",
    angle: "A thematic exploration of Thorfinn's journey from vengeance to pacifism in Vinland Saga, and what it says about the cost of violence."
  },
  {
    id: 'frieren-time',
    emoji: '🕰️',
    title: 'Frieren : La Beauté du Temps qui Passe',
    category: 'Thème',
    hook: "Une elfe immortelle face à la fragilité de la vie humaine.",
    angle: "A reflective essay on Frieren's meditation on mortality, memory and the slow passage of time, and why it resonates with viewers."
  },
  {
    id: 'jjk-curses-explained',
    emoji: '👹',
    title: 'Jujutsu Kaisen : Les Malédictions Expliquées',
    category: 'Lore',
    hook: "Comment naissent les fléaux, et pourquoi ils sont le vrai miroir de l'humanité.",
    angle: "An explainer on the lore of cursed energy and curses in Jujutsu Kaisen, connecting them to human emotion and societal fear."
  },
  {
    id: 'naruto-legacy',
    emoji: '🍥',
    title: "Naruto : L'Héritage d'une Génération",
    category: 'Rétrospective',
    hook: "Comment Naruto a changé l'anime pour toujours, 20 ans après.",
    angle: "A legacy retrospective on Naruto's cultural impact on anime worldwide, its themes of perseverance, and its lasting influence on the genre."
  },
  {
    id: 'bleach-return',
    emoji: '⚰️',
    title: 'Bleach : Le Retour Triomphant',
    category: 'Rétrospective',
    hook: "Après des années d'attente, la Guerre Sanglante du Millénaire tient enfin ses promesses.",
    angle: "A retrospective on Bleach's long-awaited return with the Thousand-Year Blood War arc, and why it redeems the series' legacy."
  },
  {
    id: 'mha-all-might-origin',
    emoji: '💪',
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
    this.isGenerating = false;
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
      thumb.innerHTML = `<span style="font-size:2.6rem;">${topic.emoji}</span>`;

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
      durBadge.textContent = '🎬 5-10 min';

      statsEl.appendChild(catBadge);
      statsEl.appendChild(durBadge);

      const btnGenerate = document.createElement('button');
      btnGenerate.type = 'button';
      btnGenerate.className = 'btn btn-gold btn-sm';
      btnGenerate.style.cssText = 'margin-top:10px; width:100%;';
      btnGenerate.textContent = '▶️ Générer la vidéo';
      btnGenerate.addEventListener('click', (e) => {
        e.stopPropagation();
        this.generateFullVideo(topic);
      });

      card.appendChild(thumb);
      card.appendChild(nameEl);
      card.appendChild(hookEl);
      card.appendChild(statsEl);
      card.appendChild(btnGenerate);

      card.addEventListener('click', () => this.generateFullVideo(topic));

      this.gridEl.appendChild(card);
    });
  }

  updateActiveMascotLabel() {
    const label = document.getElementById('topics-active-mascot');
    if (!label) return;
    const mascot = this.app.mascotManager?.activeMascot;
    label.textContent = mascot
      ? `🎭 Mascotte active : ${mascot.name} — changez-la depuis la page Mascottes si besoin.`
      : '🎭 Aucune mascotte sélectionnée.';
  }

  // ==================== PIPELINE DE GÉNÉRATION ====================

  async generateFullVideo(topic) {
    if (this.isGenerating) {
      alert('Une génération est déjà en cours, merci de patienter.');
      return;
    }

    const geminiKey = this.app.audioManager.getGeminiKey();
    if (!geminiKey && !WORKER_BASE_URL) {
      alert("Veuillez renseigner votre clé API Gemini dans Paramètres avant de générer une vidéo automatique (script et illustrations en dépendent).");
      this.app.navigateTo('page-settings');
      return;
    }

    this.isGenerating = true;
    this.showPipelineModal('Écriture du script...');

    try {
      const script = await this.generateScript(topic);

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

  // ==================== SCÈNES : REGROUPEMENT + ALTERNANCE DE POSITION ====================

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

  // ==================== MODAL DE STATUT ====================

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

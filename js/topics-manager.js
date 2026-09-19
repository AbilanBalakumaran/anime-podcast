/**
 * TOPICS MANAGER - AUTOPOD STUDIO
 * Panneau "Sujets Vidéo" : liste dynamique de sujets anime tirée d'AniList
 * (image de couverture réelle, score, statut de diffusion, tendance), triée
 * par tendance du moment (nouvelle saison en cours = signal fort). Flux :
 * clic sur un sujet -> script écrit par Gemini, informé par des faits/articles
 * réels trouvés via Tavily -> aperçu éditable -> validation -> voix off
 * (ElevenLabs/Gemini TTS) -> segmentation & alternance de poses (existant) ->
 * regroupement en scènes + illustrations par scène (Gemini image) -> export
 * vidéo (existant).
 */

import { PRESET_ENGLISH_VOICES } from './audio-manager.js';
import { WORKER_BASE_URL } from './worker-config.js';

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const SCENE_TARGET_DURATION = 40; // secondes visées par scène/illustration
const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const ANILIST_PAGE_SIZE = 20;

const GENRE_FR = {
  'Action': 'Action',
  'Adventure': 'Aventure',
  'Comedy': 'Comédie',
  'Drama': 'Drame',
  'Ecchi': 'Ecchi',
  'Fantasy': 'Fantaisie',
  'Horror': 'Horreur',
  'Mahou Shoujo': 'Magical Girl',
  'Mecha': 'Mecha',
  'Music': 'Musique',
  'Mystery': 'Mystère',
  'Psychological': 'Psychologique',
  'Romance': 'Romance',
  'Sci-Fi': 'Science-Fiction',
  'Slice of Life': 'Tranche de vie',
  'Sports': 'Sport',
  'Supernatural': 'Surnaturel',
  'Thriller': 'Thriller'
};

const STATUS_FR = {
  RELEASING: 'En cours de diffusion',
  FINISHED: 'Terminé',
  NOT_YET_RELEASED: 'À venir',
  CANCELLED: 'Annulé',
  HIATUS: 'En pause'
};

// Icônes SVG (style Feather) réutilisées dans la liste.
const ICON_FILM = '<path d="M2 8h20M7 3v5M17 3v5"></path><rect x="2" y="8" width="20" height="13" rx="2" ry="2"></rect><path d="M9 12.5l5 2.5-5 2.5z"></path>';
const ICON_PERSON = '<circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 1 0-16 0"></path>';
const ICON_STAR = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>';
const ICON_TREND = '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>';
const ICON_IMAGE = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path>';

function iconSvg(innerPath, size = 26) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${innerPath}</svg>`;
}

// Secours minimal si AniList est injoignable : quelques sujets fixes pour que
// le panneau reste utilisable hors-ligne / en cas de panne de l'API.
const FALLBACK_TOPICS = [
  {
    id: 'fallback-one-piece',
    title: 'One Piece',
    category: 'Action, Aventure',
    hook: 'Impossible de charger les tendances en direct — sujet de secours.',
    angle: "A video essay about the anime One Piece, its enduring popularity, and why it remains a cultural phenomenon after 25+ years.",
    coverImage: null
  },
  {
    id: 'fallback-jjk',
    title: 'Jujutsu Kaisen',
    category: 'Action, Surnaturel',
    hook: 'Impossible de charger les tendances en direct — sujet de secours.',
    angle: "A video essay about the anime Jujutsu Kaisen, its cursed energy system, and why fans love its sorcerers and Domain Expansions.",
    coverImage: null
  },
  {
    id: 'fallback-frieren',
    title: 'Frieren: Beyond Journey\'s End',
    category: 'Aventure, Drame',
    hook: 'Impossible de charger les tendances en direct — sujet de secours.',
    angle: "A video essay about the anime Frieren: Beyond Journey's End and its meditation on mortality, memory and the passage of time.",
    coverImage: null
  }
];

function cleanDescription(text) {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\(Source:.*?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class TopicsManager {
  constructor(app) {
    this.app = app;
    this.gridEl = document.getElementById('topics-grid');
    this.btnRefresh = document.getElementById('btn-refresh-topics');

    this.modal = document.getElementById('modal-topic-pipeline');
    this.statusEl = document.getElementById('topic-pipeline-status');

    this.previewModal = document.getElementById('modal-topic-preview');
    this.previewTitleEl = document.getElementById('topic-preview-title');
    this.previewScriptEl = document.getElementById('topic-preview-script');
    this.btnPreviewGenerate = document.getElementById('btn-topic-preview-generate');
    this.btnPreviewCancel = document.getElementById('btn-topic-preview-cancel');
    this.previewCloseBtn = document.getElementById('modal-topic-preview-close-btn');

    this.topics = [];
    this.currentPreviewTopic = null;
    this.isGenerating = false;
    this.isLoadingTopics = false;

    this.btnRefresh?.addEventListener('click', () => this.renderGrid(true));

    this.btnPreviewGenerate?.addEventListener('click', () => this.confirmGenerateFromPreview());
    this.btnPreviewCancel?.addEventListener('click', () => this.closePreviewModal());
    this.previewCloseBtn?.addEventListener('click', () => this.closePreviewModal());
    this.previewModal?.addEventListener('click', (e) => {
      if (e.target === this.previewModal) this.closePreviewModal();
    });
  }

  // ==================== SOURCE DE DONNÉES DYNAMIQUE (ANILIST) ====================

  /**
   * Interroge AniList (API publique, sans clé, CORS ouvert) pour les animes
   * actuellement tendance. AniList calcule lui-même un score de tendance
   * (TRENDING_DESC) qui tient compte de la sortie de nouvelles saisons et de
   * l'engagement récent — exactement le signal recherché ici.
   */
  async fetchTrendingTopics() {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            id
            title { romaji english }
            coverImage { large }
            averageScore
            popularity
            trending
            status
            seasonYear
            season
            genres
            description(asHtml: false)
          }
        }
      }
    `;

    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { page: 1, perPage: ANILIST_PAGE_SIZE } })
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} (AniList)`);
    }

    const json = await response.json();
    const media = json?.data?.Page?.media || [];
    if (!media.length) {
      throw new Error('AniList n\'a retourné aucun résultat.');
    }

    return media.map((m, index) => this.mapAnimeToTopic(m, index));
  }

  mapAnimeToTopic(media, rank) {
    const title = media.title?.english || media.title?.romaji || 'Sans titre';
    const genres = (media.genres || []).slice(0, 3).map(g => GENRE_FR[g] || g);
    const statusLabel = STATUS_FR[media.status] || media.status || '';
    const scoreOn10 = media.averageScore ? (media.averageScore / 10).toFixed(1) : null;
    const description = cleanDescription(media.description);
    const isTrendingNow = media.status === 'RELEASING';

    return {
      id: `anilist-${media.id}`,
      title,
      category: genres.join(', ') || 'Anime',
      hook: [genres[0], statusLabel, scoreOn10 ? `Score ${scoreOn10}/10` : null].filter(Boolean).join(' • '),
      angle: `A video essay about the anime "${title}" (AniList score: ${scoreOn10 || 'N/A'}/10, ${statusLabel}). Synopsis: ${description.slice(0, 500)}. Genres: ${genres.join(', ')}. ${isTrendingNow ? 'This anime is currently airing and trending right now — mention the current buzz, recent episodes or new season, and why fans are excited.' : 'This anime is a fan favorite — explore why it left such a lasting impression.'}`,
      coverImage: media.coverImage?.large || null,
      score: scoreOn10,
      trendRank: rank + 1,
      isTrendingNow
    };
  }

  async getTopics(forceRefresh) {
    if (!forceRefresh && this.topics.length) return this.topics;
    try {
      this.topics = await this.fetchTrendingTopics();
    } catch (err) {
      console.warn('[TopicsManager] Échec du chargement des tendances AniList, secours statique:', err);
      if (!this.topics.length) this.topics = FALLBACK_TOPICS;
    }
    return this.topics;
  }

  // ==================== RENDU DE LA LISTE ====================

  async renderGrid(forceRefresh = false) {
    if (!this.gridEl) {
      this.gridEl = document.getElementById('topics-grid');
    }
    if (!this.gridEl) return;
    if (this.isLoadingTopics) return;

    this.updateActiveMascotLabel();

    this.isLoadingTopics = true;
    if (this.btnRefresh) this.btnRefresh.disabled = true;
    this.gridEl.innerHTML = '<div class="empty-state" style="padding: 30px;"><p>Chargement des tendances en direct (AniList)...</p></div>';

    const topics = await this.getTopics(forceRefresh);

    this.gridEl.innerHTML = '';
    topics.forEach((topic, index) => {
      this.gridEl.appendChild(this.buildTopicRow(topic, index));
    });

    this.isLoadingTopics = false;
    if (this.btnRefresh) this.btnRefresh.disabled = false;
  }

  buildTopicRow(topic, index) {
    const row = document.createElement('div');
    row.className = 'topic-row';
    row.dataset.id = topic.id;

    const rankEl = document.createElement('div');
    rankEl.className = 'topic-rank';
    rankEl.textContent = `#${index + 1}`;

    let coverEl;
    if (topic.coverImage) {
      coverEl = document.createElement('img');
      coverEl.className = 'topic-cover';
      coverEl.src = topic.coverImage;
      coverEl.alt = topic.title;
      coverEl.loading = 'lazy';
    } else {
      coverEl = document.createElement('div');
      coverEl.className = 'topic-cover';
      coverEl.innerHTML = iconSvg(ICON_IMAGE, 24);
    }

    const contentEl = document.createElement('div');
    contentEl.className = 'topic-row-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'topic-row-title';
    titleEl.textContent = topic.title;

    const metaEl = document.createElement('div');
    metaEl.className = 'topic-row-meta';
    metaEl.textContent = topic.hook;

    const badgesEl = document.createElement('div');
    badgesEl.className = 'topic-row-badges';

    if (topic.score) {
      const scoreBadge = document.createElement('span');
      scoreBadge.className = 'topic-badge topic-badge-score';
      scoreBadge.innerHTML = `${iconSvg(ICON_STAR, 11)}<span>${topic.score}/10</span>`;
      badgesEl.appendChild(scoreBadge);
    }

    if (topic.trendRank) {
      const trendBadge = document.createElement('span');
      trendBadge.className = 'topic-badge topic-badge-trend';
      trendBadge.innerHTML = `${iconSvg(ICON_TREND, 11)}<span>Tendance #${topic.trendRank}</span>`;
      badgesEl.appendChild(trendBadge);
    }

    const durBadge = document.createElement('span');
    durBadge.className = 'topic-badge topic-badge-neutral';
    durBadge.innerHTML = `${iconSvg(ICON_FILM, 11)}<span>5-10 min</span>`;
    badgesEl.appendChild(durBadge);

    contentEl.appendChild(titleEl);
    contentEl.appendChild(metaEl);
    contentEl.appendChild(badgesEl);

    const actionEl = document.createElement('div');
    actionEl.className = 'topic-row-action';
    const btnPreview = document.createElement('button');
    btnPreview.type = 'button';
    btnPreview.className = 'btn btn-gold btn-sm';
    btnPreview.textContent = 'Aperçu du script';
    btnPreview.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTopicPreview(topic);
    });
    actionEl.appendChild(btnPreview);

    row.appendChild(rankEl);
    row.appendChild(coverEl);
    row.appendChild(contentEl);
    row.appendChild(actionEl);

    row.addEventListener('click', () => this.openTopicPreview(topic));

    return row;
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
      ? `\nHere is real reference context gathered from articles about this topic to keep facts accurate (weave it naturally into the narration, never read it out as a list):\n${groundingContext}\n`
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
   * Récupère des faits/articles réels via Tavily (ex: pages "X facts you
   * didn't know") pour ancrer le script dans du contenu existant plutôt que
   * de tout inventer. Passe toujours par le Worker (la clé Tavily n'existe
   * que côté serveur) ; retourne '' silencieusement en cas d'échec ou si
   * aucun Worker n'est configuré, sans jamais bloquer le pipeline.
   */
  async fetchGroundingContext(topic) {
    if (!WORKER_BASE_URL) return '';
    try {
      const response = await fetch(`${WORKER_BASE_URL}/proxy/tavily/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${topic.title} facts trivia things you didn't know`, max_results: 4 })
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

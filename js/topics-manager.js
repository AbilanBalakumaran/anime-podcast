/**
 * TOPICS MANAGER - AUTOPOD STUDIO
 * Panneau "Sujets Vidéo" : liste dynamique de sujets anime tirée d'AniList
 * (image de couverture réelle, score, statut de diffusion, tendance), triée
 * par tendance du moment (nouvelle saison en cours = signal fort). Un clic
 * sur "Aperçu" génère un brief structuré (Gemini, informé par des faits/
 * articles réels trouvés via Tavily) : thème, durée, cible, objectif, plan
 * chronologique, sources. "Générer en vidéo" transmet ce brief à l'assistant
 * étape par étape de la page Production (js/production-wizard.js), qui
 * gère script -> audio -> illustrations -> export.
 */

import { WORKER_BASE_URL } from './worker-config.js';

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
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
const ICON_PERSON = '<circle cx="12" cy="8" r="5"></circle><path d="M20 21a8 8 0 1 0-16 0"></path>';
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

    this.listView = document.getElementById('topics-list-view');
    this.detailView = document.getElementById('topics-detail-view');
    this.previewTitleEl = document.getElementById('topic-preview-title');
    this.btnPreviewGenerate = document.getElementById('btn-topic-preview-generate');
    this.btnDetailBack = document.getElementById('btn-topic-detail-back');

    this.topics = [];
    this.currentPreviewTopic = null;
    this.currentBrief = null;
    this.isGenerating = false;
    this.isLoadingTopics = false;

    this.btnRefresh?.addEventListener('click', () => this.renderGrid(true));

    this.btnPreviewGenerate?.addEventListener('click', () => this.confirmGenerateFromPreview());
    this.btnDetailBack?.addEventListener('click', () => this.backToList());
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
      coverEl.innerHTML = iconSvg(ICON_IMAGE, 16);
    }

    const contentEl = document.createElement('div');
    contentEl.className = 'topic-row-content';

    const titleEl = document.createElement('span');
    titleEl.className = 'topic-row-title';
    titleEl.textContent = topic.title;
    contentEl.appendChild(titleEl);

    if (topic.hook) {
      const sepEl = document.createElement('span');
      sepEl.className = 'topic-row-sep';
      sepEl.textContent = ' — ';
      const metaEl = document.createElement('span');
      metaEl.className = 'topic-row-meta';
      metaEl.textContent = topic.hook;
      contentEl.appendChild(sepEl);
      contentEl.appendChild(metaEl);
    }

    const actionEl = document.createElement('div');
    actionEl.className = 'topic-row-action';
    const btnPreview = document.createElement('button');
    btnPreview.type = 'button';
    btnPreview.className = 'btn btn-gold btn-sm';
    btnPreview.textContent = 'Aperçu';
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

  // ==================== ÉTAPE 1 : APERÇU (BRIEF STRUCTURÉ) ====================

  async openTopicPreview(topic) {
    if (this.isGenerating) {
      alert('Une génération est déjà en cours, merci de patienter.');
      return;
    }

    const geminiKey = this.app.audioManager.getGeminiKey();
    if (!geminiKey && !WORKER_BASE_URL) {
      alert("Veuillez renseigner votre clé API Gemini dans Paramètres avant de générer un aperçu.");
      this.app.navigateTo('page-settings');
      return;
    }

    this.isGenerating = true;
    this.showPipelineModal('Analyse du sujet...');

    try {
      const brief = await this.generateBrief(topic);
      this.hidePipelineModal();
      this.currentPreviewTopic = topic;
      this.currentBrief = brief;
      this.showDetailView(topic, brief);
    } catch (err) {
      console.error('[TopicsManager] Échec de la génération du brief:', err);
      alert("Erreur lors de la génération de l'aperçu : " + err.message);
      this.hidePipelineModal();
    } finally {
      this.isGenerating = false;
    }
  }

  showDetailView(topic, brief) {
    if (!this.previewTitleEl) this.previewTitleEl = document.getElementById('topic-preview-title');

    if (this.previewTitleEl) this.previewTitleEl.textContent = topic.title;
    this.renderBriefView(brief);
    if (this.listView) this.listView.style.display = 'none';
    if (this.detailView) this.detailView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderBriefView(brief) {
    const container = document.getElementById('topic-preview-brief');
    if (!container) return;
    container.innerHTML = '';

    const addSection = (label, valueEl) => {
      const wrap = document.createElement('div');
      const labelEl = document.createElement('div');
      labelEl.className = 'topic-brief-section-label';
      labelEl.textContent = label;
      wrap.appendChild(labelEl);
      wrap.appendChild(valueEl);
      container.appendChild(wrap);
    };

    const textVal = (text) => {
      const d = document.createElement('div');
      d.className = 'topic-brief-section-value';
      d.textContent = text || '—';
      return d;
    };

    addSection('Thème', textVal(brief.theme));
    addSection('Durée visée', textVal(`${brief.duration_minutes || '5-10'} minutes`));
    addSection('Public cible', textVal(brief.target_audience));
    addSection('Objectif', textVal(`${brief.objective || ''}${brief.objective_reason ? ' — ' + brief.objective_reason : ''}`));

    const outlineList = document.createElement('ol');
    outlineList.className = 'topic-brief-outline';
    (brief.outline || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      outlineList.appendChild(li);
    });
    addSection('Plan chronologique', outlineList);

    const sourcesWrap = document.createElement('div');
    sourcesWrap.className = 'topic-brief-sources';
    (brief.sources || []).forEach(src => {
      const line = document.createElement('div');
      line.textContent = `• ${src}`;
      sourcesWrap.appendChild(line);
    });
    addSection('Sources', sourcesWrap);
  }

  backToList() {
    if (this.detailView) this.detailView.style.display = 'none';
    if (this.listView) this.listView.style.display = 'block';
    this.currentPreviewTopic = null;
    this.currentBrief = null;
  }

  // ==================== ÉTAPE 2 : TRANSMISSION À L'ASSISTANT PRODUCTION ====================

  confirmGenerateFromPreview() {
    const topic = this.currentPreviewTopic;
    const brief = this.currentBrief;

    if (!topic || !brief) {
      alert('Aucun brief à transmettre.');
      return;
    }

    const briefText = this.composeBriefText(topic, brief);
    this.backToList();
    this.app.productionWizard.startFromBrief(briefText);
    this.app.navigateTo('page-production');
  }

  composeBriefText(topic, brief) {
    const lines = [];
    lines.push(`Sujet : ${topic.title}`);
    lines.push('');
    lines.push(`Thème : ${brief.theme || ''}`);
    lines.push(`Durée visée : ${brief.duration_minutes || '5-10'} minutes`);
    lines.push(`Public cible : ${brief.target_audience || ''}`);
    lines.push(`Objectif : ${brief.objective || ''}${brief.objective_reason ? ' — ' + brief.objective_reason : ''}`);
    lines.push('');
    lines.push('Plan chronologique :');
    (brief.outline || []).forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    lines.push('');
    lines.push('Sources / faits de référence :');
    (brief.sources || []).forEach(src => lines.push(`- ${src}`));
    return lines.join('\n');
  }

  // ==================== GÉNÉRATION DU BRIEF (GEMINI TEXTE, JSON) ====================

  async generateBrief(topic) {
    const apiKey = this.app.audioManager.getGeminiKey();
    const useWorker = !apiKey && !!WORKER_BASE_URL;

    const groundingContext = WORKER_BASE_URL ? await this.fetchGroundingContext(topic) : '';
    const groundingBlock = groundingContext
      ? `\nReal reference material found online about this topic:\n${groundingContext}\n`
      : '';

    const prompt = `You are a content strategist preparing a brief for an anime & pop-culture video essay.

Topic: ${topic.title}
Angle: ${topic.angle}
${groundingBlock}
Return a JSON object with exactly these fields:
{
  "theme": "one clear sentence describing what the video is about",
  "duration_minutes": "a range like '7-9'",
  "target_audience": "who this video is for",
  "objective": "one of: nostalgic, opinion/claim-driven, theoretical/analytical, informative, entertainment — pick the single best fit for this topic",
  "objective_reason": "one sentence justifying that choice",
  "sources": ["2 to 4 short references to real facts or articles used, drawn from the reference material above if provided"],
  "outline": ["5 to 8 short chronological beats/themes the video will cover, in presentation order"]
}
Return ONLY the JSON object, no markdown, no code fences.`;

    const url = useWorker
      ? `${WORKER_BASE_URL}/proxy/gemini/${GEMINI_TEXT_MODEL}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erreur HTTP ${response.status} (brief)`);
    }

    const json = await response.json();
    const rawText = (json.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || '')
      .join('');

    if (!rawText.trim()) {
      throw new Error("Gemini n'a retourné aucun brief.");
    }

    try {
      return JSON.parse(rawText);
    } catch (err) {
      throw new Error('Le brief généré est invalide (JSON mal formé).');
    }
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

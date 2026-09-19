/**
 * TOPICS MANAGER - AUTOPOD STUDIO
 * Panneau "Sujets Vidéo" : liste dynamique de sujets anime tirée d'AniList
 * (image de couverture réelle, score, statut de diffusion, tendance), triée
 * par tendance du moment (nouvelle saison en cours = signal fort). Un clic
 * sur "Aperçu" affiche instantanément les informations déjà récupérées
 * (aucun appel API) sur une page dédiée. "Générer en vidéo" transmet ces
 * informations à l'assistant étape par étape de la page Production
 * (js/production-wizard.js) : la génération IA (script, puis audio et
 * illustrations) n'a lieu qu'après un clic explicite sur "Générer le script"
 * sur cette page-là, jamais depuis la liste des sujets.
 */

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

// Icône SVG (style Feather) réutilisée dans la liste.
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
    description: '',
    angle: "A video essay about the anime One Piece, its enduring popularity, and why it remains a cultural phenomenon after 25+ years.",
    coverImage: null
  },
  {
    id: 'fallback-jjk',
    title: 'Jujutsu Kaisen',
    category: 'Action, Surnaturel',
    hook: 'Impossible de charger les tendances en direct — sujet de secours.',
    description: '',
    angle: "A video essay about the anime Jujutsu Kaisen, its cursed energy system, and why fans love its sorcerers and Domain Expansions.",
    coverImage: null
  },
  {
    id: 'fallback-frieren',
    title: 'Frieren: Beyond Journey\'s End',
    category: 'Aventure, Drame',
    hook: 'Impossible de charger les tendances en direct — sujet de secours.',
    description: '',
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

    this.listView = document.getElementById('topics-list-view');
    this.detailView = document.getElementById('topics-detail-view');
    this.previewTitleEl = document.getElementById('topic-preview-title');
    this.btnPreviewGenerate = document.getElementById('btn-topic-preview-generate');
    this.btnDetailBack = document.getElementById('btn-topic-detail-back');

    this.topics = [];
    this.currentPreviewTopic = null;
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
      description,
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

    const titleEl = document.createElement('div');
    titleEl.className = 'topic-row-title';
    titleEl.textContent = topic.title;
    contentEl.appendChild(titleEl);

    if (topic.hook) {
      const metaEl = document.createElement('div');
      metaEl.className = 'topic-row-meta';
      metaEl.textContent = topic.hook;
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

  // ==================== APERÇU INSTANTANÉ (AUCUN APPEL API) ====================

  openTopicPreview(topic) {
    this.currentPreviewTopic = topic;
    this.showDetailView(topic);
  }

  showDetailView(topic) {
    if (!this.previewTitleEl) this.previewTitleEl = document.getElementById('topic-preview-title');

    if (this.previewTitleEl) this.previewTitleEl.textContent = topic.title;
    this.renderTopicDetailView(topic);
    if (this.listView) this.listView.style.display = 'none';
    if (this.detailView) this.detailView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderTopicDetailView(topic) {
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

    if (topic.category) addSection('Genres', textVal(topic.category));
    if (topic.hook) addSection('Infos', textVal(topic.hook));
    addSection('Synopsis', textVal(topic.description || 'Aucun synopsis disponible.'));
  }

  backToList() {
    if (this.detailView) this.detailView.style.display = 'none';
    if (this.listView) this.listView.style.display = 'block';
    this.currentPreviewTopic = null;
  }

  // ==================== TRANSMISSION À L'ASSISTANT PRODUCTION ====================

  confirmGenerateFromPreview() {
    const topic = this.currentPreviewTopic;

    if (!topic) {
      alert('Aucun sujet sélectionné.');
      return;
    }

    const briefText = this.composeBriefText(topic);
    this.backToList();
    this.app.productionWizard.startFromBrief(briefText);
    this.app.navigateTo('page-production');
  }

  composeBriefText(topic) {
    const lines = [];
    lines.push(`Sujet : ${topic.title}`);
    if (topic.category) lines.push(`Genres : ${topic.category}`);
    if (topic.hook) lines.push(topic.hook);
    if (topic.description) {
      lines.push('');
      lines.push('Synopsis :');
      lines.push(topic.description);
    }
    lines.push('');
    lines.push('Angle :');
    lines.push(topic.angle);
    return lines.join('\n');
  }
}

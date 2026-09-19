/**
 * PRODUCTION WIZARD - AUTOPOD STUDIO
 * Assistant étape par étape de la page Production :
 * 1) Brief -> 2) Script (édité) -> 3) Audio -> 4) Illustrations (plusieurs
 * candidats par scène, réordonnables) -> export (bouton déjà existant dans
 * la carte Prévisualisation, inchangé).
 */

import { PRESET_ENGLISH_VOICES } from './audio-manager.js';
import { WORKER_BASE_URL } from './worker-config.js';

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const SCENE_TARGET_DURATION = 40; // secondes visées par scène/illustration
const STYLE_SUFFIX = 'Style: cinematic anime key visual, deep navy blue and gold accent lighting, dynamic composition, high detail, no text, no watermark, no logo, 16:9 widescreen.';

export class ProductionWizard {
  constructor(app) {
    this.app = app;
    this.currentStep = 1;
    this.briefText = '';
    this.scenes = []; // [{ segmentIds, texts, duration, candidates: [dataUrl...], selectedIndex }]
    this.isBusy = false;

    this.stepBrief = document.getElementById('wizard-step-brief');
    this.stepScript = document.getElementById('wizard-step-script');
    this.stepAudio = document.getElementById('wizard-step-audio');
    this.stepImages = document.getElementById('wizard-step-images');
    this.stepFinal = document.getElementById('wizard-step-final');

    this.briefInput = document.getElementById('wizard-brief-input');
    this.scriptText = document.getElementById('wizard-script-text');
    this.scenesList = document.getElementById('wizard-scenes-list');
    this.imagesStatus = document.getElementById('wizard-images-status');

    this.btnGenerateScript = document.getElementById('btn-wizard-generate-script');
    this.btnBackToBrief = document.getElementById('btn-wizard-back-to-brief');
    this.btnGenerateAudio = document.getElementById('btn-wizard-generate-audio');
    this.btnGotoImages = document.getElementById('btn-wizard-goto-images');
    this.btnGotoFinal = document.getElementById('btn-wizard-goto-final');
    this.btnRestart = document.getElementById('btn-wizard-restart');

    this.setupEvents();
  }

  setupEvents() {
    this.btnGenerateScript?.addEventListener('click', () => this.handleGenerateScript());
    this.btnBackToBrief?.addEventListener('click', () => this.goToStep(1));
    this.btnGenerateAudio?.addEventListener('click', () => this.goToStep(3));
    this.btnGotoImages?.addEventListener('click', () => this.handleGenerateAudioAndImages());
    this.btnGotoFinal?.addEventListener('click', () => this.confirmImages());
    this.btnRestart?.addEventListener('click', () => this.reset());
  }

  // ==================== NAVIGATION ====================

  // Les étapes s'accumulent : atteindre l'étape n affiche les étapes 1..n
  // sans jamais masquer celles déjà révélées (rien ne doit disparaître).
  goToStep(n) {
    this.currentStep = n;
    const steps = { 1: this.stepBrief, 2: this.stepScript, 3: this.stepAudio, 4: this.stepImages };
    let target = null;
    Object.entries(steps).forEach(([num, el]) => {
      if (!el) return;
      if (parseInt(num, 10) <= n) {
        el.style.display = 'block';
        if (parseInt(num, 10) === n) target = el;
      }
    });
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  confirmImages() {
    if (this.stepFinal) this.stepFinal.style.display = 'block';
    this.stepFinal?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  reset() {
    this.briefText = '';
    this.scenes = [];
    if (this.briefInput) this.briefInput.value = '';
    if (this.scriptText) this.scriptText.value = '';
    if (this.imagesStatus) this.imagesStatus.textContent = '';
    if (this.btnGotoFinal) this.btnGotoFinal.style.display = 'none';
    [this.stepScript, this.stepAudio, this.stepImages, this.stepFinal].forEach(el => {
      if (el) el.style.display = 'none';
    });
    this.renderScenesList();
    this.currentStep = 1;
    if (this.stepBrief) this.stepBrief.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== HANDOFF DEPUIS SUJETS VIDÉO ====================

  startFromBrief(briefText) {
    this.briefText = briefText;
    if (this.briefInput) this.briefInput.value = briefText;
    this.goToStep(1);
  }

  // ==================== ÉTAPE 1 -> 2 : SCRIPT ====================

  async handleGenerateScript() {
    if (this.isBusy) return;
    const brief = this.briefInput?.value?.trim();
    if (!brief) {
      alert('Merci de décrire le sujet de la vidéo.');
      return;
    }

    const geminiKey = this.app.audioManager.getGeminiKey();
    if (!geminiKey && !WORKER_BASE_URL) {
      alert('Veuillez renseigner votre clé API Gemini dans Paramètres avant de générer un script.');
      this.app.navigateTo('page-settings');
      return;
    }

    this.briefText = brief;
    this.isBusy = true;
    this.setButtonBusy(this.btnGenerateScript, true, 'Écriture du script...');

    try {
      const script = await this.generateScriptFromBrief(brief);
      if (this.scriptText) this.scriptText.value = script;
      this.goToStep(2);
    } catch (err) {
      console.error('[ProductionWizard] Échec génération script:', err);
      alert('Erreur lors de la génération du script : ' + err.message);
    } finally {
      this.isBusy = false;
      this.setButtonBusy(this.btnGenerateScript, false, 'Générer le script');
    }
  }

  async generateScriptFromBrief(brief) {
    const apiKey = this.app.audioManager.getGeminiKey();
    const useWorker = !apiKey && !!WORKER_BASE_URL;
    const mascotName = this.app.mascotManager?.activeMascot?.name || 'the host';

    const prompt = `You are writing a spoken-word narration script for a video essay hosted by a mascot named ${mascotName}.

Brief from the creator:
${brief}

Write ONLY the narration text the host will speak out loud — no markdown, no headers, no stage directions, no bullet points, just flowing spoken sentences.
Requirements:
- Follow the brief's chronological outline and sources if any are given, in order.
- Length: approximately 1200 to 1450 words (about 8 minutes of natural spoken pace).
- Open with a warm, energetic greeting to the audience.
- Close with a friendly sign-off inviting the audience to come back.
- Vary sentence rhythm throughout: mix short punchy statements, a few rhetorical questions, and several exclamations to keep an enthusiastic, engaging tone.
- Structure the content into clear thematic beats (roughly one new idea every 3-5 sentences) so a video editor could naturally cut to a new illustration at each beat.
- Written entirely in English.
- Do not use any markdown formatting, asterisks, or headers — plain narration text only.`;

    const url = useWorker
      ? `${WORKER_BASE_URL}/proxy/gemini/${GEMINI_TEXT_MODEL}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erreur HTTP ${response.status} (script)`);
    }

    const json = await response.json();
    const rawText = (json.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    if (!rawText.trim()) throw new Error("Gemini n'a retourné aucun texte de script.");

    return rawText.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/^[-*]\s+/gm, '').trim();
  }

  // ==================== ÉTAPE 2 -> 3 -> 4 : AUDIO PUIS IMAGES ====================

  async handleGenerateAudioAndImages() {
    if (this.isBusy) return;
    const text = this.scriptText?.value?.trim();
    if (!text) {
      alert('Aucun script à synthétiser.');
      return;
    }

    this.isBusy = true;
    this.setButtonBusy(this.btnGotoImages, true, 'Génération de la voix...');

    try {
      const voiceId = this.pickVoiceId();
      const rate = parseFloat(document.getElementById('slider-tts-rate')?.value) || 1.0;
      const pitch = parseFloat(document.getElementById('slider-tts-pitch')?.value) || 1.0;

      const result = await this.app.audioManager.synthesizeSpeech(text, voiceId, rate, pitch);
      this.app.speechAnalyzer.analyzeAudioBuffer(result.buffer, result.sentences);

      this.goToStep(4);
      await this.generateAllSceneImages();
    } catch (err) {
      console.error('[ProductionWizard] Échec génération audio/images:', err);
      alert('Erreur lors de la génération de la voix ou des illustrations : ' + err.message);
    } finally {
      this.isBusy = false;
      this.setButtonBusy(this.btnGotoImages, false, 'Choisir les illustrations');
    }
  }

  pickVoiceId() {
    const select = document.getElementById('select-tts-voice');
    if (select && select.value) return select.value;
    const elKey = this.app.audioManager.getElevenLabsKey();
    if (elKey) {
      const preset = PRESET_ENGLISH_VOICES.find(v => v.provider === 'ElevenLabs');
      if (preset) return preset.id;
    }
    return 'gemini-Orbit';
  }

  buildScenes(segments) {
    const scenes = [];
    let current = null;

    segments.forEach(seg => {
      if (!current) current = { segmentIds: [], texts: [], duration: 0 };
      current.segmentIds.push(seg.id);
      current.texts.push(seg.origText || seg.text || '');
      current.duration += seg.duration || 0;

      if (current.duration >= SCENE_TARGET_DURATION) {
        scenes.push(current);
        current = null;
      }
    });

    if (current && current.segmentIds.length) scenes.push(current);
    return scenes;
  }

  // ==================== GÉNÉRATION DES CANDIDATS D'ILLUSTRATION ====================

  async generateAllSceneImages() {
    const segments = this.app.speechAnalyzer.segments;
    this.scenes = this.buildScenes(segments).map(s => ({ ...s, candidates: [], selectedIndex: 0 }));
    this.renderScenesList();

    for (let i = 0; i < this.scenes.length; i++) {
      if (this.imagesStatus) this.imagesStatus.textContent = `Scène ${i + 1}/${this.scenes.length}...`;
      try {
        this.scenes[i].candidates = await this.generateSceneImageCandidates(this.scenes[i]);
      } catch (err) {
        console.warn(`[ProductionWizard] Échec illustrations scène ${i + 1}:`, err);
        this.scenes[i].candidates = [];
      }
      if (this.scenes[i].candidates.length) {
        await this.applySceneSelection(i);
      }
      this.renderScenesList();
    }

    if (this.imagesStatus) this.imagesStatus.textContent = `${this.scenes.length} scène(s) illustrée(s)`;
    if (this.btnGotoFinal) this.btnGotoFinal.style.display = this.scenes.length ? 'block' : 'none';
  }

  /** Détection simple d'un nom propre (mot capitalisé hors début de phrase) pour biaiser un des 3 candidats vers un portrait de personnage. */
  detectCharacterName(text) {
    const words = text.split(/\s+/);
    const found = words.find((w, i) => i > 0 && /^[A-ZÀ-Ý][a-zà-ÿ]{2,}$/.test(w));
    return found || null;
  }

  async generateSceneImageCandidates(scene) {
    const apiKey = this.app.audioManager.getGeminiKey();
    const useWorker = !apiKey && !!WORKER_BASE_URL;
    const excerpt = scene.texts.join(' ').slice(0, 300);
    const character = this.detectCharacterName(excerpt);

    // 3 angles différents par scène : dépiction littérale, plan resserré sur un
    // personnage nommé dans le texte (si détecté), et plan thématique/symbolique.
    const angles = [
      `Direct cinematic depiction of this moment: ${excerpt}`,
      character
        ? `Close-up dramatic portrait shot focused on the character "${character}", in the context of: ${excerpt}`
        : `Wide establishing shot capturing the mood and setting of: ${excerpt}`,
      `Symbolic, thematic illustration representing the idea behind: ${excerpt}`
    ];

    const results = [];
    for (const angle of angles) {
      try {
        const dataUrl = await this.generateSingleImage(`${angle} ${STYLE_SUFFIX}`, apiKey, useWorker);
        results.push(dataUrl);
      } catch (err) {
        console.warn('[ProductionWizard] Candidat image échoué:', err);
      }
    }
    return results;
  }

  async generateSingleImage(prompt, apiKey, useWorker) {
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
    if (!imgPart) throw new Error("Gemini n'a retourné aucune image.");

    const mimeType = imgPart.inlineData.mimeType || 'image/png';
    return `data:${mimeType};base64,${imgPart.inlineData.data}`;
  }

  // ==================== SÉLECTION / RÉORDONNANCEMENT ====================

  async applySceneSelection(sceneIndex) {
    const scene = this.scenes[sceneIndex];
    const dataUrl = scene.candidates[scene.selectedIndex];
    if (!dataUrl) return;
    await this.app.speechAnalyzer.assignImageToSegments(scene.segmentIds, dataUrl);
  }

  async selectCandidate(sceneIndex, candidateIndex) {
    this.scenes[sceneIndex].selectedIndex = candidateIndex;
    await this.applySceneSelection(sceneIndex);
    this.renderScenesList();
  }

  /** Échange l'illustration (candidats + sélection) entre deux scènes adjacentes — "ordre d'apparition". */
  async swapScenes(i, j) {
    if (j < 0 || j >= this.scenes.length) return;
    const a = this.scenes[i];
    const b = this.scenes[j];
    const tmpCandidates = a.candidates;
    const tmpSelected = a.selectedIndex;
    a.candidates = b.candidates;
    a.selectedIndex = b.selectedIndex;
    b.candidates = tmpCandidates;
    b.selectedIndex = tmpSelected;
    await this.applySceneSelection(i);
    await this.applySceneSelection(j);
    this.renderScenesList();
  }

  // ==================== RENDU ====================

  renderScenesList() {
    if (!this.scenesList) return;

    if (!this.scenes.length) {
      this.scenesList.innerHTML = '<div class="timeline-empty">Générez d\'abord le script et la voix off.</div>';
      return;
    }

    this.scenesList.innerHTML = '';
    this.scenes.forEach((scene, i) => {
      const row = document.createElement('div');
      row.className = 'wizard-scene-row';

      const textEl = document.createElement('div');
      textEl.className = 'wizard-scene-text';
      textEl.textContent = scene.texts.join(' ');

      const bodyEl = document.createElement('div');
      bodyEl.className = 'wizard-scene-body';

      const candidatesEl = document.createElement('div');
      candidatesEl.className = 'wizard-scene-candidates';

      if (scene.candidates.length === 0) {
        const loading = document.createElement('span');
        loading.style.cssText = 'font-size:0.72rem; color: var(--text-dim); align-self:center;';
        loading.textContent = 'Génération...';
        candidatesEl.appendChild(loading);
      } else {
        scene.candidates.forEach((url, ci) => {
          const thumb = document.createElement('img');
          thumb.className = 'wizard-candidate-thumb' + (ci === scene.selectedIndex ? ' selected' : '');
          thumb.src = url;
          thumb.alt = `Scène ${i + 1} — option ${ci + 1}`;
          thumb.title = `Utiliser cette illustration pour la scène ${i + 1}`;
          thumb.addEventListener('click', () => this.selectCandidate(i, ci));
          candidatesEl.appendChild(thumb);
        });
      }

      const reorderEl = document.createElement('div');
      reorderEl.className = 'wizard-scene-reorder';

      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.innerHTML = '&uarr;';
      btnUp.title = 'Échanger avec la scène précédente';
      btnUp.disabled = i === 0;
      btnUp.addEventListener('click', () => this.swapScenes(i, i - 1));

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.innerHTML = '&darr;';
      btnDown.title = 'Échanger avec la scène suivante';
      btnDown.disabled = i === this.scenes.length - 1;
      btnDown.addEventListener('click', () => this.swapScenes(i, i + 1));

      reorderEl.appendChild(btnUp);
      reorderEl.appendChild(btnDown);

      bodyEl.appendChild(candidatesEl);
      bodyEl.appendChild(reorderEl);

      row.appendChild(textEl);
      row.appendChild(bodyEl);
      this.scenesList.appendChild(row);
    });
  }

  setButtonBusy(btn, busy, label) {
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = label;
  }
}

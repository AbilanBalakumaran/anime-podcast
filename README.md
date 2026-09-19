# 🎙️ AUTOPOD Studio

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-facc15?style=flat-square)](./manifest.webmanifest)
[![License: MIT](https://img.shields.io/badge/License-MIT-09090b?style=flat-square)](LICENSE)
[![Theme: Noir Obsidienne & Jaune Cyber](https://img.shields.io/badge/Theme-Obsidian%20%26%20Cyber%20Gold-facc15?style=flat-square)](#-charte-graphique-stricte)

> **Générateur vidéo PWA de podcast animé avec mascottes interactives et synchronisation vocale dynamique (rendu transparent 1080p).**  
> Conçu pour produire des vidéos de mascottes animées détourées sur fond transparent (canal alpha WebM) parfaitement synchronisées avec une piste vocale, prêtes pour l'intégration en post-production (DaVinci Resolve, Adobe Premiere, OBS, CapCut).

---

## ✨ Fonctionnalités Principales

- **📱 Progressive Web App (PWA) Complète** :
  - **Mise à jour automatique immédiate** : Service Worker configuré avec `skipWaiting()` et `clients.claim()`, rechargement instantané via l'écoute de `controllerchange`.
  - **Écran de chargement dynamique (Splash Screen)** : Affiché à chaque ouverture avec ambiance bleu nuit profonde et halo doré animé.
  - Installable sur mobile, tablette et bureau (icônes vectorielles adaptatives 192px et 512px).
- **🎨 Charte Graphique Stricte** :
  - Palette reposant exclusivement sur un **bleu sombre profond** (`#070b14`, `#0b1329`, `#111d38`) et des accents **jaune doré** (`#f59e0b`, `#fbbf24`, `#d97706`).
  - **Exclusion totale et absolue de toute nuance de rose** sur l'ensemble de l'interface.
- **🎭 Gestionnaire de Mascottes Multi-Poses** :
  - 2 mascottes haute qualité intégrées et prêtes à l'emploi : **Aiko** (Podcasteuse Anime) et **Ren** (Chroniqueur Pop-Culture).
  - 5 attitudes expressives prédéfinies :
    1. `neutre` (posture calme et attentive)
    2. `enthousiaste` (dynamique, bras ouverts, étincelles)
    3. `explicative` (geste pédagogique, index pointé)
    4. `pensive` (main au menton, regard songeur)
    5. `surprise` (yeux écarquillés, posture d'étonnement)
  - Module d'ajout de mascottes personnalisées avec upload par glisser-déposer pour chaque pose et persistance **IndexedDB**.
- **🗣️ Gestion Audio & Synthèse Vocale (TTS)** :
  - Importation directe de fichiers sonores (MP3, WAV, AAC, OGG, WebM).
  - Synthèse vocale intégrée (Web Speech API) avec choix de la voix, réglage du débit et de la tonalité.
- **⏱️ Analyseur Temporel (VAD) & Segmentation par Phrase (NotebookLM)** :
  - Algorithme de détection d'activité vocale (Voice Activity Detection) mesurant l'énergie RMS par fenêtre temporelle.
  - Découpage automatique phrase par phrase avec alternance intelligente et logique des poses.
  - Visualisation de la forme d'onde et éditeur de segments interactif permettant de réassigner manuellement la pose de n'importe quelle phrase.
- **🎬 Canevas Vidéo & Export Transparent** :
  - Canevas HTML5 avec **fond transparent natif** (canal alpha RGBA 0,0,0,0).
  - Bascule d'affichage pour l'édition : Fond damier de transparence vs fond studio sombre.
  - **Animation Idle & Flap Buccal Réactif** : respiration subtile et ouverture dynamique de la bouche au rythme précis de la voix.
  - **Export Vidéo WebM Transparent** : capture directe du canevas et de la piste sonore via `MediaRecorder` (VP9/VP8 avec canal alpha + Opus) pour intégration transparente en post-production.

---

## 📁 Arborescence du Projet

```
anime-podcast/
├── index.html                # Interface utilisateur principale
├── manifest.webmanifest      # Manifeste PWA
├── sw.js                     # Service Worker avec auto-refresh immédiat
├── package.json              # Définition du projet et scripts
├── README.md                 # Documentation complète
├── css/
│   ├── main.css              # Charte bleu sombre/or, variables CSS, typographie
│   ├── splash.css            # Styles du splash screen dynamique animé
│   ├── components.css        # Boutons dorés, cartes, picker mascottes, modales
│   ├── timeline.css          # Forme d'onde audio, playhead et cartes de phrases
│   └── responsive.css        # Adaptabilité mobile, tablette et desktop
├── js/
│   ├── app.js                # Point d'entrée principal et orchestrateur
│   ├── pwa.js                # Gestionnaire PWA, installation et auto-reload
│   ├── db.js                 # Couche IndexedDB pour la persistance locale
│   ├── default-mascots.js    # Définition des 2 mascottes intégrées (5 poses)
│   ├── mascot-manager.js     # Gestionnaire des mascottes et uploads
│   ├── audio-manager.js      # Gestionnaire audio (import, TTS, décodage Web Audio)
│   ├── speech-analyzer.js    # Analyseur temporel VAD et segmentation des poses
│   ├── canvas-renderer.js    # Rendu canevas transparent, flap buccal et idle
│   └── video-exporter.js     # Capture et encodage WebM avec canal alpha
└── assets/
    └── icons/
        ├── favicon.svg       # Favicon SVG haute résolution
        ├── icon-192.svg      # Icône PWA 192x192
        └── icon-512.svg      # Icône PWA 512x512
```

---

## 🚀 Démarrage Rapide

L'application est construite en JavaScript moderne (ES Modules) et ne requiert aucun bundler lourd pour fonctionner.

### Lancer localement :

```bash
# Avec npx serve :
npx serve .

# Ou avec Python 3 :
python -m http.server 8080
```

Ouvrez ensuite votre navigateur sur `http://localhost:3000` (ou `http://localhost:8080`).

---

## 🛠️ Utilisation

1. **Sélectionner une mascotte** : Cliquez sur **Aiko** ou **Ren** dans le panneau gauche, ou cliquez sur `Nouvelle Mascotte` pour téléverser vos propres illustrations détourées (PNG, SVG, WebP).
2. **Configurer l'audio** :
   - *Option A* : Glissez-déposez un fichier audio (voix off) sur la zone dédiée.
   - *Option B* : Saisissez votre script dans l'onglet `Synthèse Vocale (TTS)` et cliquez sur `Générer la Voix`.
3. **Analyse & Découpage** : L'outil découpe automatiquement le discours en phrases et leur attribue une pose expressive (`neutre`, `enthousiaste`, `explicative`, `pensive`, `surprise`). Vous pouvez ajuster la pose de chaque segment dans la liste.
4. **Prévisualiser** : Lancez la lecture pour observer le balancement naturel, le flap buccal et les transitions de pose en rythme avec la parole.
5. **Exporter la Vidéo** : Cliquez sur `Exporter la Vidéo Transparente (WebM)`. Le fichier généré peut être superposé directement sur n'importe quel arrière-plan dans votre logiciel de montage vidéo favori.

---

## 📄 Licence

Projet sous licence MIT &bull; Réalisé par [AbilanBalakumaran](https://github.com/AbilanBalakumaran).
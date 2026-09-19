/**
 * PWA & Service Worker Manager
 * Gère l'enregistrement, la mise à jour automatique immédiate (skipWaiting + reload),
 * et l'installation de l'application.
 */

export class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.installBtn = document.getElementById('btn-pwa-install');
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.purgeOldCaches();
  }

  purgeOldCaches() {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'autopod-v1.5.2') {
            console.log('[PWA] Purge du cache obsolète:', key);
            caches.delete(key);
          }
        });
      });
    }
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker non supporté dans ce navigateur.');
      return;
    }

    let isRefreshing = false;

    // Détection immédiate du changement de contrôleur (mise à jour du Service Worker)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        console.log('[PWA] Nouvelle version détectée et activée ! Rechargement immédiat...');
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=1.5.2')
        .then((registration) => {
          console.log('[PWA] Service Worker enregistré avec succès:', registration.scope);
          registration.update().catch(() => {});

          // Vérification des mises à jour toutes les 30 secondes
          setInterval(() => {
            registration.update().catch(() => {});
          }, 30000);

          // Vérification lors du retour sur l'onglet
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch(() => {});
            }
          });

          // Si un worker est déjà en attente, lui demander de prendre la main
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nouveau code installé, demande d'activation immédiate
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Échec de l\'enregistrement du Service Worker:', error);
        });
    });
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.installBtn) {
        this.installBtn.style.display = 'inline-flex';
      }
    });

    if (this.installBtn) {
      this.installBtn.addEventListener('click', async () => {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`[PWA] Résultat de l'installation: ${outcome}`);
        this.deferredPrompt = null;
        this.installBtn.style.display = 'none';
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Application installée avec succès !');
      if (this.installBtn) {
        this.installBtn.style.display = 'none';
      }
    });
  }
}

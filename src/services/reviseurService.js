import { claudeService } from 'src/boot/gemini';

// Charger le prompt du reviseur
const revieurLongPrompt = import.meta.glob('/src/config/revieur_long.md', {
  as: 'raw',
  eager: true,
})['/src/config/revieur_long.md'] || '';

class ReviseurService {
  constructor() {
    this.isProcessing = false;
    this.shouldStop = false;
    this.results = [];
    this.parallelCount = 20; // Nombre de requêtes parallèles (20 slots)
    this.activeFiles = new Map(); // Map pour suivre les fichiers en cours
  }

  /**
   * Construit le prompt complet pour le reviseur
   * @param {Object} analysisData - Données du fichier JSON simplifié
   * @returns {string} - Le prompt formaté
   */
  buildPrompt(analysisData) {
    const { fileName, originalText, erreursCritere4, erreursCritere5 } = analysisData.result;

    // Construire la liste des erreurs à réviser
    const erreursFormatted = {
      erreursCritere4: erreursCritere4 || [],
      erreursCritere5: erreursCritere5 || []
    };

    // Remplacer le placeholder dans le prompt
    let prompt = revieurLongPrompt;

    // Ajouter le texte original et les erreurs détectées
    prompt = prompt.replace('[INSÉRER LE TEXTE ICI]', originalText);

    // Ajouter les erreurs existantes à réviser après le texte
    prompt += `\n\n---\n\n## ERREURS DÉTECTÉES À RÉVISER\n\nVoici les erreurs identifiées par l'analyse initiale. Tu dois les réviser et assigner un verdict à chacune :\n\n`;
    prompt += '```json\n' + JSON.stringify(erreursFormatted, null, 2) + '\n```\n';
    prompt += `\n\nPour chaque erreur ci-dessus, conserve l'id existant et ajoute les champs: verdict, confidence, confidenceReason, counterArgument.\n`;
    prompt += `\nLe fichier s'appelle: ${fileName}\n`;

    return prompt;
  }

  /**
   * Traite un fichier avec le reviseur
   * @param {Object} analysisData - Données du fichier JSON simplifié
   * @param {Function} onProgress - Callback de progression
   * @returns {Object} - Résultat de la révision
   */
  async processFile(analysisData, onProgress) {
    const fileName = analysisData.result.fileName;
    const startTime = Date.now();

    try {
      if (onProgress) {
        onProgress({ status: 'processing', fileName, message: 'Révision en cours...' });
      }

      const prompt = this.buildPrompt(analysisData);

      // Appeler Claude avec le prompt
      const response = await claudeService.generateTextWithSystemPrompt(
        'Tu es un réviseur linguistique expert. Retourne uniquement du JSON valide.',
        prompt
      );

      // Parser la réponse JSON
      let result;
      try {
        // Nettoyer la réponse (enlever les balises markdown si présentes)
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.slice(7);
        }
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
          cleanResponse = cleanResponse.slice(0, -3);
        }
        result = JSON.parse(cleanResponse.trim());
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
        console.log('Réponse brute:', response);
        throw new Error('Réponse JSON invalide du reviseur');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        fileName,
        status: 'success',
        result,
        startTimestamp: new Date(startTime).toISOString(),
        endTimestamp: new Date(endTime).toISOString(),
        durationMs: duration,
        durationFormatted: this.formatDuration(duration)
      };

    } catch (error) {
      console.error(`Erreur lors de la révision de ${fileName}:`, error);
      return {
        fileName,
        status: 'error',
        error: error.message,
        startTimestamp: new Date(startTime).toISOString(),
        endTimestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Traite tous les fichiers avec un pool de workers (téléchargement immédiat, remplacement continu)
   * @param {Function} onProgress - Callback de progression
   * @param {Function} onFileComplete - Callback quand un fichier est terminé (téléchargement immédiat)
   * @returns {Object} - Résultats globaux
   */
  async processAllFiles(onProgress, onFileComplete) {
    this.isProcessing = true;
    this.shouldStop = false;
    this.results = [];
    this.activeFiles.clear();

    try {
      // Charger tous les fichiers JSON simplifiés
      const files = await this.loadSimplifiedFiles();

      if (files.length === 0) {
        throw new Error('Aucun fichier trouvé dans resultats_simplified');
      }

      const total = files.length;
      let processed = 0;
      let successful = 0;
      let failed = 0;
      let fileIndex = 0;

      console.log(`Traitement de ${total} fichiers avec ${this.parallelCount} slots parallèles`);

      // Fonction pour mettre à jour l'affichage
      const updateProgress = () => {
        if (onProgress) {
          const activeFilesArray = Array.from(this.activeFiles.values());
          onProgress({
            current: processed,
            total,
            percentage: Math.round((processed / total) * 100),
            currentFile: `${this.activeFiles.size} fichiers en cours`,
            activeFiles: activeFilesArray,
            status: processed === total ? 'complete' : 'processing'
          });
        }
      };

      // Fonction pour traiter un fichier et lancer le suivant
      const processNext = async () => {
        while (fileIndex < files.length && !this.shouldStop) {
          // Prendre le prochain fichier
          const currentIndex = fileIndex++;
          const file = files[currentIndex];
          const fileName = file.fileName;

          // Ajouter aux fichiers actifs
          this.activeFiles.set(fileName, {
            name: fileName,
            status: 'processing',
            stepLabel: 'Révision en cours...'
          });
          updateProgress();

          try {
            // Traiter le fichier
            const result = await this.processFile(file, null);

            // Mettre à jour le statut
            this.activeFiles.set(fileName, {
              name: fileName,
              status: result.status,
              stepLabel: result.status === 'success' ? 'Terminé' : 'Erreur'
            });

            // Enregistrer le résultat
            this.results.push(result);
            processed++;

            if (result.status === 'success') {
              successful++;
              // Télécharger immédiatement le résultat
              if (onFileComplete) {
                onFileComplete(result);
              }
            } else {
              failed++;
            }

            updateProgress();

            // Retirer des fichiers actifs après un court délai (pour voir le statut)
            setTimeout(() => {
              this.activeFiles.delete(fileName);
              updateProgress();
            }, 500);

          } catch (error) {
            console.error(`Erreur lors du traitement de ${fileName}:`, error);
            this.activeFiles.delete(fileName);
            failed++;
            processed++;
            updateProgress();
          }
        }
      };

      // Lancer les workers initiaux (20 en parallèle)
      const workers = [];
      for (let i = 0; i < this.parallelCount; i++) {
        workers.push(processNext());
      }

      // Attendre que tous les workers terminent
      await Promise.all(workers);

      return {
        total,
        successful,
        failed,
        cancelled: this.shouldStop ? total - processed : 0,
        results: this.results
      };

    } finally {
      this.isProcessing = false;
      this.activeFiles.clear();
    }
  }

  /**
   * Définit le nombre de requêtes parallèles
   * @param {number} count - Nombre de requêtes parallèles
   */
  setParallelCount(count) {
    this.parallelCount = Math.max(1, Math.min(count, 50)); // Entre 1 et 50
  }

  /**
   * Charge tous les fichiers JSON simplifiés
   * @returns {Array} - Liste des fichiers avec leur contenu
   */
  async loadSimplifiedFiles() {
    const files = [];

    // Utiliser fetch pour charger les fichiers depuis public/resultats_simplified
    try {
      // D'abord, obtenir la liste des fichiers (on suppose qu'ils suivent le pattern MAE_GCCC_XXX.json)
      for (let i = 1; i <= 150; i++) {
        const num = String(i).padStart(3, '0');
        const fileName = `MAE_GCCC_${num}.json`;

        try {
          const response = await fetch(`/resultats_simplified/${fileName}`);
          if (response.ok) {
            const data = await response.json();
            files.push({
              fileName,
              ...data
            });
          }
        } catch (err) {
          // Fichier non trouvé, continuer
          console.log(`Fichier ${fileName} non trouvé`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
    }

    return files;
  }

  /**
   * Arrête le traitement en cours
   */
  stopProcessing() {
    this.shouldStop = true;
  }

  /**
   * Réinitialise le flag d'arrêt
   */
  resetStop() {
    this.shouldStop = false;
  }

  /**
   * Formate une durée en ms en format lisible
   * @param {number} ms - Durée en millisecondes
   * @returns {string} - Durée formatée
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = ms % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}:${String(remainingMs).padStart(3, '0')}`;
  }

  /**
   * Délai utilitaire
   * @param {number} ms - Délai en millisecondes
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Exporte un résultat unique au format JSON
   * @param {Object} result - Résultat à exporter
   * @returns {Object} - Données formatées pour export
   */
  exportResult(result) {
    return {
      processedAt: new Date().toISOString(),
      reviseurVersion: '1.0',
      ...result
    };
  }
}

export default new ReviseurService();

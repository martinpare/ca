import { claudeService } from 'src/boot/gemini';
import * as XLSX from 'xlsx';

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

      // Appeler Claude avec le prompt et récupérer les métadonnées
      const claudeResponse = await claudeService.generateTextWithSystemPrompt(
        'Tu es un réviseur linguistique expert. Retourne uniquement du JSON valide, sans balises markdown.',
        prompt,
        { returnMetadata: true }
      );

      const { text: response, isTruncated, stopReason } = claudeResponse;

      // Vérifier si la réponse a été tronquée
      if (isTruncated) {
        console.error(`Réponse tronquée pour ${fileName} (stop_reason: ${stopReason})`);
        throw new Error(`Réponse tronquée par Claude (limite de tokens atteinte). Le fichier ${fileName} contient probablement trop d'erreurs à analyser.`);
      }

      // Parser la réponse JSON
      let result;
      try {
        // Nettoyer la réponse (enlever les balises markdown si présentes)
        let cleanResponse = response.trim();

        // Debug: voir les derniers caractères
        const lastChars = cleanResponse.slice(-20);
        console.log('Derniers 20 chars (codes):', [...lastChars].map(c => c.charCodeAt(0)));
        console.log('Derniers 20 chars:', JSON.stringify(lastChars));

        // Enlever les balises markdown au début
        cleanResponse = cleanResponse.replace(/^```json\s*/m, '');
        cleanResponse = cleanResponse.replace(/^```\s*/m, '');
        // Enlever les balises markdown à la fin (avec différentes variantes de backticks)
        cleanResponse = cleanResponse.replace(/\s*```\s*$/m, '');
        cleanResponse = cleanResponse.replace(/\s*`{3,}\s*$/m, '');

        // Dernier trim
        cleanResponse = cleanResponse.trim();

        // Debug après nettoyage
        console.log('Après nettoyage, derniers 20 chars:', JSON.stringify(cleanResponse.slice(-20)));

        result = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
        console.log('Réponse brute:', response);
        // Message d'erreur plus détaillé
        const truncatedPreview = response.length > 200 ? response.slice(-200) : response;
        throw new Error(`Réponse JSON invalide du reviseur. Fin de la réponse: "${truncatedPreview}"`);
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
        } catch {
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
   * Retourne la liste des fichiers disponibles dans resultats_simplified
   * @returns {Array<string>} - Liste des noms de fichiers
   */
  async getAvailableFiles() {
    const fileNames = [];

    for (let i = 1; i <= 150; i++) {
      const num = String(i).padStart(3, '0');
      const fileName = `MAE_GCCC_${num}.json`;

      try {
        const response = await fetch(`/resultats_simplified/${fileName}`, { method: 'HEAD' });
        if (response.ok) {
          fileNames.push(fileName);
        }
      } catch {
        // Fichier non trouvé, continuer
      }
    }

    return fileNames;
  }

  /**
   * Traite un seul fichier avec le reviseur
   * @param {string} fileName - Nom du fichier à traiter
   * @param {Function} onProgress - Callback de progression
   * @param {Function} onFileComplete - Callback quand le fichier est terminé
   * @returns {Object} - Résultats
   */
  async processSingleFile(fileName, onProgress, onFileComplete) {
    this.isProcessing = true;
    this.shouldStop = false;
    this.results = [];
    this.activeFiles.clear();

    try {
      // Charger le fichier
      const response = await fetch(`/resultats_simplified/${fileName}`);
      if (!response.ok) {
        throw new Error(`Fichier ${fileName} non trouvé`);
      }

      const data = await response.json();
      const file = { fileName, ...data };

      // Ajouter aux fichiers actifs
      this.activeFiles.set(fileName, {
        name: fileName,
        status: 'processing',
        stepLabel: 'Révision en cours...'
      });

      if (onProgress) {
        onProgress({
          current: 0,
          total: 1,
          percentage: 0,
          currentFile: fileName,
          activeFiles: [{ name: fileName, status: 'processing', stepLabel: 'Révision en cours...' }],
          status: 'processing'
        });
      }

      // Traiter le fichier
      const result = await this.processFile(file, null);
      this.results.push(result);

      // Mettre à jour le statut
      this.activeFiles.set(fileName, {
        name: fileName,
        status: result.status,
        stepLabel: result.status === 'success' ? 'Terminé' : 'Erreur'
      });

      if (onProgress) {
        onProgress({
          current: 1,
          total: 1,
          percentage: 100,
          currentFile: fileName,
          activeFiles: [{ name: fileName, status: result.status, stepLabel: result.status === 'success' ? 'Terminé' : 'Erreur' }],
          status: 'complete'
        });
      }

      if (result.status === 'success' && onFileComplete) {
        onFileComplete(result);
      }

      return {
        total: 1,
        successful: result.status === 'success' ? 1 : 0,
        failed: result.status === 'error' ? 1 : 0,
        cancelled: 0,
        results: this.results
      };

    } finally {
      this.isProcessing = false;
      this.activeFiles.clear();
    }
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

  /**
   * Extrait le numéro du fichier depuis le nom (ex: MAE_GCCC_002_final.json -> 2)
   * @param {string} fileName - Nom du fichier
   * @returns {number} - Numéro du fichier
   */
  extractFileNumber(fileName) {
    const match = fileName.match(/MAE_GCCC_(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  }

  /**
   * Charge tous les fichiers JSON depuis public/resultats/finaux
   * @returns {Array} - Liste des fichiers avec leur contenu
   */
  async loadFinalFiles() {
    const files = [];

    for (let i = 1; i <= 150; i++) {
      const num = String(i).padStart(3, '0');
      const fileName = `MAE_GCCC_${num}_final.json`;

      try {
        const response = await fetch(`/resultats/finaux/${fileName}`);
        if (response.ok) {
          const data = await response.json();
          files.push({
            fileName,
            ...data
          });
        }
      } catch {
        // Fichier non trouvé, continuer
      }
    }

    return files;
  }

  /**
   * Compte les erreurs par verdict
   * @param {Array} erreurs - Liste des erreurs
   * @param {string} verdict - Type de verdict à compter
   * @returns {number} - Nombre d'erreurs avec ce verdict
   */
  countByVerdict(erreurs, verdict) {
    if (!erreurs || !Array.isArray(erreurs)) return 0;
    return erreurs.filter(e => e.verdict === verdict).length;
  }

  /**
   * Filtre les erreurs valides (ERREUR ou DISCUTABLE, exclut FAUX_POSITIF)
   * @param {Array} erreurs - Liste des erreurs
   * @returns {Array} - Erreurs valides après révision
   */
  filterValidErrors(erreurs) {
    if (!erreurs || !Array.isArray(erreurs)) return [];
    return erreurs.filter(e => e.verdict === 'ERREUR' || e.verdict === 'DISCUTABLE');
  }

  /**
   * Calcule les points perdus pour le critère 4
   * S: 1 point, P (et variantes): 0.5 point
   * @param {Array} erreurs - Liste des erreurs
   * @returns {number} - Points perdus
   */
  calculerPointsCritere4(erreurs) {
    let points = 0;
    for (const erreur of erreurs) {
      const type = erreur.type;
      switch (type) {
        case 'S':
          points += 1;
          break;
        case 'P':
        case '« P »':
        case '«P»':
        case '« P»':
        case '«P »':
        case '[P]':
          points += 0.5;
          break;
        // (S) et (P) = 0 point
      }
    }
    return points;
  }

  /**
   * Calcule les points perdus pour le critère 5
   * U: 1 point, G: 1 point
   * @param {Array} erreurs - Liste des erreurs
   * @returns {number} - Points perdus
   */
  calculerPointsCritere5(erreurs) {
    let points = 0;
    for (const erreur of erreurs) {
      const type = erreur.type;
      switch (type) {
        case 'U':
        case 'G':
          points += 1;
          break;
        // (U) et - = 0 point
      }
    }
    return points;
  }

  /**
   * Calcule la note selon les points perdus - Critère 4
   * 0-4=A, 5-9=B, 10-14=C, 15-17=D, 18+=E
   * @param {number} pointsPerdus - Points perdus
   * @returns {string} - Note (A, B, C, D, E)
   */
  calculerNoteCritere4(pointsPerdus) {
    if (pointsPerdus <= 4) return 'A';
    if (pointsPerdus <= 9) return 'B';
    if (pointsPerdus <= 14) return 'C';
    if (pointsPerdus <= 17) return 'D';
    return 'E';
  }

  /**
   * Calcule la note selon les points perdus - Critère 5
   * 0-4=A, 5-9=B, 10-14=C, 15-18=D, 19+=E
   * @param {number} pointsPerdus - Points perdus
   * @returns {string} - Note (A, B, C, D, E)
   */
  calculerNoteCritere5(pointsPerdus) {
    if (pointsPerdus <= 4) return 'A';
    if (pointsPerdus <= 9) return 'B';
    if (pointsPerdus <= 14) return 'C';
    if (pointsPerdus <= 18) return 'D';
    return 'E';
  }

  /**
   * Génère un fichier Excel à partir des fichiers finaux
   * Format identique à resultats_2025-12-10T14-01-43-728Z.xlsx
   * @returns {ArrayBuffer} - Buffer du fichier Excel
   */
  async generateFinalResultsExcel() {
    const files = await this.loadFinalFiles();

    if (files.length === 0) {
      throw new Error('Aucun fichier trouvé dans resultats/finaux');
    }

    // Trier par numéro de fichier
    files.sort((a, b) => {
      return this.extractFileNumber(a.fileName) - this.extractFileNumber(b.fileName);
    });

    // Construire les données pour le tableau Excel (même format que batchProcessor)
    const excelData = files.map((file) => {
      const result = file.result || {};
      const erreurs4 = result.erreursCritere4 || [];
      const erreurs5 = result.erreursCritere5 || [];

      // Filtrer pour garder seulement ERREUR et DISCUTABLE (exclure FAUX_POSITIF)
      const erreurs4Valides = this.filterValidErrors(erreurs4);
      const erreurs5Valides = this.filterValidErrors(erreurs5);

      // Calculer les points après révision
      const points4 = this.calculerPointsCritere4(erreurs4Valides);
      const points5 = this.calculerPointsCritere5(erreurs5Valides);

      // Calculer les notes après révision
      const note4 = this.calculerNoteCritere4(points4);
      const note5 = this.calculerNoteCritere5(points5);

      // Le nom du fichier original (sans _final.json)
      const originalFileName = result.fileName || file.fileName.replace('_final.json', '.txt');

      return {
        'N° Fichier': this.extractFileNumber(file.fileName),
        'Nom du fichier': originalFileName,
        'Temps de traitement': file.durationFormatted || '-',
        'Nb erreurs C4': erreurs4Valides.length,
        'Points perdus C4': points4,
        'Note C4': note4,
        'Nb erreurs C5': erreurs5Valides.length,
        'Points perdus C5': points5,
        'Note C5': note5,
      };
    });

    // Créer le workbook et la worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Définir les largeurs de colonnes (même format que batchProcessor)
    worksheet['!cols'] = [
      { wch: 10 },  // N° Fichier
      { wch: 25 },  // Nom du fichier
      { wch: 18 },  // Temps de traitement
      { wch: 14 },  // Nb erreurs C4
      { wch: 16 },  // Points perdus C4
      { wch: 10 },  // Note C4
      { wch: 14 },  // Nb erreurs C5
      { wch: 16 },  // Points perdus C5
      { wch: 10 },  // Note C5
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Résultats');

    // Générer le fichier Excel en binaire
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }
}

export default new ReviseurService();

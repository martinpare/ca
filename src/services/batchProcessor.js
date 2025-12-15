import { geminiService, claudeService } from 'src/boot/gemini';
import correctionPrompt from 'src/config/prompt';
import * as XLSX from 'xlsx';

// Modèles IA disponibles
const AI_MODELS = {
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    service: () => geminiService,
  },
  claude: {
    id: 'claude',
    label: 'Claude Sonnet 4',
    service: () => claudeService,
  },
};

// Charger les prompts
const prompt45 = import.meta.glob('/src/config/prompt45.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})['/src/config/prompt45.md'] || correctionPrompt;

const promptSimplifie45 = import.meta.glob('/src/config/promptSimplifie45.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})['/src/config/promptSimplifie45.md'] || correctionPrompt;

const promptGemini = import.meta.glob('/src/config/promptGemini.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})['/src/config/promptGemini.md'] || correctionPrompt;

const promptClaudeSimplifie = import.meta.glob('/src/config/promptClaudeSimplifie.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})['/src/config/promptClaudeSimplifie.md'] || correctionPrompt;

const promptAnalyseurDuplicatas = import.meta.glob('/src/config/promptAnalyseurDuplicatas.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})['/src/config/promptAnalyseurDuplicatas.md'] || '';

// Liste des prompts disponibles
const PROMPTS = {
  prompt45: {
    id: 'prompt45',
    label: 'Prompt Complet (prompt45)',
    content: prompt45,
  },
  promptSimplifie45: {
    id: 'promptSimplifie45',
    label: 'Prompt Simplifié (promptSimplifie45)',
    content: promptSimplifie45,
  },
  promptGemini: {
    id: 'promptGemini',
    label: 'Prompt Gemini (promptGemini)',
    content: promptGemini,
  },
  promptClaudeSimplifie: {
    id: 'promptClaudeSimplifie',
    label: 'Prompt Claude Simplifié (promptClaudeSimplifie)',
    content: promptClaudeSimplifie,
  },
  promptAnalyseurDuplicatas: {
    id: 'promptAnalyseurDuplicatas',
    label: 'Analyseur de Duplicatas',
    content: promptAnalyseurDuplicatas,
  },
};

class BatchProcessor {
  constructor() {
    this.results = [];
    this.errors = [];
    this.isProcessing = false;
    this.simulationMode = false; // MODE RÉEL PAR DÉFAUT
    this.shouldStop = false; // Flag pour arrêter le traitement
    this.requestsPerMinute = 60; // Limite de l'API Gemini
    this.requestTimestamps = []; // Historique des requêtes
    this.selectedPrompt = 'prompt45'; // Prompt par défaut
    this.nombrePasses = 1; // Nombre de passes par défaut
    this.selectedModel = 'gemini'; // Modèle IA par défaut
  }

  // Obtenir la liste des modèles IA disponibles
  getAvailableModels() {
    return Object.values(AI_MODELS).map(m => ({ id: m.id, label: m.label }));
  }

  // Changer le modèle IA sélectionné
  setSelectedModel(modelId) {
    if (AI_MODELS[modelId]) {
      this.selectedModel = modelId;
      return true;
    }
    return false;
  }

  // Obtenir le modèle sélectionné
  getSelectedModel() {
    return this.selectedModel;
  }

  // Obtenir le service IA actuel
  getCurrentAIService() {
    return AI_MODELS[this.selectedModel]?.service() || geminiService;
  }

  // Obtenir la liste des prompts disponibles
  getAvailablePrompts() {
    return Object.values(PROMPTS).map(p => ({ id: p.id, label: p.label }));
  }

  // Changer le prompt sélectionné
  setSelectedPrompt(promptId) {
    if (PROMPTS[promptId]) {
      this.selectedPrompt = promptId;
      return true;
    }
    return false;
  }

  // Obtenir le prompt sélectionné
  getSelectedPrompt() {
    return this.selectedPrompt;
  }

  // Obtenir le contenu du prompt actuel
  getCurrentPromptContent() {
    return PROMPTS[this.selectedPrompt]?.content || prompt45;
  }

  // Obtenir le nombre de passes
  getNombrePasses() {
    return this.nombrePasses;
  }

  // Définir le nombre de passes
  setNombrePasses(value) {
    if (value >= 1 && value <= 5) {
      this.nombrePasses = value;
      return true;
    }
    return false;
  }

  // Générateur de Lorem Ipsum aléatoire
  generateLoremIpsum() {
    const loremParagraphs = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
      'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
      'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.',
      'Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.',
      'Omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.',
      'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.',
    ];

    // Générer 2-4 paragraphes aléatoires
    const numParagraphs = Math.floor(Math.random() * 3) + 2;
    const selectedParagraphs = [];

    for (let i = 0; i < numParagraphs; i++) {
      const randomIndex = Math.floor(Math.random() * loremParagraphs.length);
      selectedParagraphs.push(loremParagraphs[randomIndex]);
    }

    return selectedParagraphs.join('\n\n');
  }

  // Simulation d'un délai aléatoire entre 1 et 5 secondes
  async simulateDelay() {
    const delay = Math.floor(Math.random() * 4000) + 1000; // 1000-5000ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Formater la durée en MM:SS:mmm
  formatDuration(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = milliseconds % 1000;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
  }

  // Extraire le JSON de la réponse Gemini (enlève les balises ```json ... ```)
  extractJsonFromResponse(text) {
    if (!text) return null;

    // 1. ESSAYER D'ABORD UN PARSING DIRECT (pour les réponses JSON pures de responseMimeType)
    try {
      const parsed = JSON.parse(text);
      console.log('JSON parsé directement avec succès');
      return parsed;
    } catch {
      // Continuer avec les autres méthodes
    }

    // 2. Chercher le contenu entre ```json et ```
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('Erreur de parsing JSON (balises markdown):', e);
        console.error('Contenu problématique:', jsonMatch[1].substring(0, 500));
        return { paragraphs: [] };
      }
    }

    // 3. Essayer de trouver un objet JSON dans le texte
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch (e) {
        console.error('Erreur de parsing JSON (extraction objet):', e);
        return { paragraphs: [] };
      }
    }

    // 4. Retourner une structure vide
    console.warn('Impossible de parser la réponse, retour structure vide');
    return { paragraphs: [] };
  }

  // Extraire les erreurs par critère depuis la réponse parsée
  extractErrorsByCriteria(parsedResponse) {
    const erreursCritere4 = [];
    const erreursCritere5 = [];

    if (!parsedResponse || !parsedResponse.paragraphs) {
      return { erreursCritere4, erreursCritere5 };
    }

    for (const paragraph of parsedResponse.paragraphs) {
      if (paragraph.errors && Array.isArray(paragraph.errors)) {
        for (const error of paragraph.errors) {
          if (error.criteria === 4) {
            erreursCritere4.push(error);
          } else if (error.criteria === 5) {
            erreursCritere5.push(error);
          }
        }
      }
    }

    return { erreursCritere4, erreursCritere5 };
  }

  // Calculer le pointage pour le critère 4
  // S: 1 point, (S): 0 point, P: 0.5 point, (P): 0 point, «P»: 0.5 point, [P]: 0.5 point
  // Notes: 0-4=A, 5-9=B, 10-14=C, 15-17=D, 18+=E
  calculerPointageCritere4(erreurs) {
    let pointsPerdus = 0;

    for (const erreur of erreurs) {
      const type = erreur.type;
      switch (type) {
        case 'S':
          pointsPerdus += 1;
          break;
        case '(S)':
          pointsPerdus += 0;
          break;
        case 'P':
          pointsPerdus += 0.5;
          break;
        case '(P)':
          pointsPerdus += 0;
          break;
        case '« P »':
        case '«P»':
        case '« P»':
        case '«P »':
          pointsPerdus += 0.5;
          break;
        case '[P]':
          pointsPerdus += 0.5;
          break;
      }
    }

    // Déterminer la note selon l'intervalle
    // 0-4=A, 5-9=B, 10-14=C, 15-17=D, 18+=E
    let note;
    if (pointsPerdus <= 4) {
      note = 'A';
    } else if (pointsPerdus <= 9) {
      note = 'B';
    } else if (pointsPerdus <= 14) {
      note = 'C';
    } else if (pointsPerdus <= 17) {
      note = 'D';
    } else {
      note = 'E';
    }

    return { pointsPerdus, note };
  }

  // Calculer le pointage pour le critère 5
  // U: 1 point, (U): 0 point, G: 1 point, -: 0 point
  // Notes: 0-4=A, 5-9=B, 10-14=C, 15-18=D, 19+=E
  calculerPointageCritere5(erreurs) {
    let pointsPerdus = 0;

    for (const erreur of erreurs) {
      const type = erreur.type;
      switch (type) {
        case 'U':
          pointsPerdus += 1;
          break;
        case '(U)':
          pointsPerdus += 0;
          break;
        case 'G':
          pointsPerdus += 1;
          break;
        case '-':
        case '_':
          pointsPerdus += 0;
          break;
      }
    }

    // Déterminer la note selon l'intervalle
    // 0-4=A, 5-9=B, 10-14=C, 15-18=D, 19+=E
    let note;
    if (pointsPerdus <= 4) {
      note = 'A';
    } else if (pointsPerdus <= 9) {
      note = 'B';
    } else if (pointsPerdus <= 14) {
      note = 'C';
    } else if (pointsPerdus <= 18) {
      note = 'D';
    } else {
      note = 'E';
    }

    return { pointsPerdus, note };
  }

  // Dédupliquer les erreurs en comparant text, type et criteria
  deduplicateErrors(errors) {
    const seen = new Set();
    return errors.filter(error => {
      // Créer une clé unique basée sur le texte, le type et le critère
      const key = `${error.text}|${error.type}|${error.criteria}|${error.occurenceIndex || 0}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Effectuer une seule passe d'analyse avec le modèle IA sélectionné
  async singlePass(fileContent, promptContent) {
    await this.waitForRateLimit();
    const aiService = this.getCurrentAIService();
    const response = await aiService.generateTextWithSystemPrompt(
      promptContent,
      fileContent
    );
    const parsedResponse = this.extractJsonFromResponse(response);
    return this.extractErrorsByCriteria(parsedResponse);
  }

  // Analyser les duplicatas pour un critère spécifique via l'API
  async analyserDuplicatasViAPI(erreurs, critere) {
    await this.waitForRateLimit();

    const inputData = {
      [`erreursCritere${critere}`]: erreurs,
    };

    const userPrompt = `Analysez les duplicatas pour le critère ${critere} dans les erreurs suivantes:\n\n${JSON.stringify(inputData, null, 2)}`;

    const aiService = this.getCurrentAIService();
    const response = await aiService.generateTextWithSystemPrompt(
      promptAnalyseurDuplicatas,
      userPrompt
    );

    const parsedResponse = this.extractJsonFromResponse(response);
    return parsedResponse;
  }

  // Effectuer N passes et fusionner les résultats
  async multiPassAnalysis(fileContent, promptContent, onStepProgress = null) {
    const allErreursCritere4 = [];
    const allErreursCritere5 = [];
    const totalPasses = this.nombrePasses;
    // Total des étapes: N passes + 2 analyses de duplicatas
    const totalSteps = totalPasses + 2;

    // Tableaux pour stocker le cumul après chaque passe
    const cumulParPasse = [];

    // Effectuer N passes
    for (let pass = 1; pass <= totalPasses; pass++) {
      console.log(`Passe ${pass}/${totalPasses}...`);

      // Callback de progression pour les passes
      if (onStepProgress) {
        onStepProgress({
          currentStep: pass,
          totalSteps: totalSteps,
          stepType: 'passe',
          stepLabel: `Passe ${pass}/${totalPasses}`,
        });
      }

      const { erreursCritere4, erreursCritere5 } = await this.singlePass(fileContent, promptContent);
      allErreursCritere4.push(...erreursCritere4);
      allErreursCritere5.push(...erreursCritere5);

      // Après chaque passe, dédupliquer et stocker le cumul
      const cumulCritere4 = this.deduplicateErrors([...allErreursCritere4]);
      const cumulCritere5 = this.deduplicateErrors([...allErreursCritere5]);

      cumulParPasse.push({
        passe: pass,
        erreursCritere4: cumulCritere4,
        erreursCritere5: cumulCritere5,
        totalErreursCritere4: cumulCritere4.length,
        totalErreursCritere5: cumulCritere5.length,
        scoreCritere4: this.calculerPointageCritere4(cumulCritere4),
        scoreCritere5: this.calculerPointageCritere5(cumulCritere5),
      });
    }

    // Dédupliquer les erreurs après les passes (déduplication simple)
    const erreursCritere4ApresPasses = this.deduplicateErrors(allErreursCritere4);
    const erreursCritere5ApresPasses = this.deduplicateErrors(allErreursCritere5);

    // Si une seule passe, pas besoin d'analyse IA des duplicatas
    if (totalPasses === 1) {
      console.log('Une seule passe configurée - pas d\'analyse IA des duplicatas');
      return {
        erreursCritere4: erreursCritere4ApresPasses,
        erreursCritere5: erreursCritere5ApresPasses,
        erreursCritere4AvantAnalyseIA: null,
        erreursCritere5AvantAnalyseIA: null,
        cumulParPasse: cumulParPasse,
        analyseIADuplicatas: null,
      };
    }

    // Analyse des duplicatas via IA pour le critère 4
    console.log('Analyse IA des duplicatas - Critère 4...');
    if (onStepProgress) {
      onStepProgress({
        currentStep: totalPasses + 1,
        totalSteps: totalSteps,
        stepType: 'analyseDuplicatas',
        stepLabel: 'Analyse IA duplicatas - Critère 4',
      });
    }

    let analyseDuplicatasCritere4 = null;
    let erreursCritere4Finales = erreursCritere4ApresPasses;
    try {
      analyseDuplicatasCritere4 = await this.analyserDuplicatasViAPI(erreursCritere4ApresPasses, 4);
      // Si l'analyse a réussi et contient des recommandations, filtrer les erreurs
      if (analyseDuplicatasCritere4?.recommandations?.erreursAConserverCritere4) {
        const indicesAConserver = analyseDuplicatasCritere4.recommandations.erreursAConserverCritere4;
        erreursCritere4Finales = erreursCritere4ApresPasses.filter((_, index) => indicesAConserver.includes(index));
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse des duplicatas critère 4:', error);
      analyseDuplicatasCritere4 = { error: error.message };
    }

    // Analyse des duplicatas via IA pour le critère 5
    console.log('Analyse IA des duplicatas - Critère 5...');
    if (onStepProgress) {
      onStepProgress({
        currentStep: totalPasses + 2,
        totalSteps: totalSteps,
        stepType: 'analyseDuplicatas',
        stepLabel: 'Analyse IA duplicatas - Critère 5',
      });
    }

    let analyseDuplicatasCritere5 = null;
    let erreursCritere5Finales = erreursCritere5ApresPasses;
    try {
      analyseDuplicatasCritere5 = await this.analyserDuplicatasViAPI(erreursCritere5ApresPasses, 5);
      // Si l'analyse a réussi et contient des recommandations, filtrer les erreurs
      if (analyseDuplicatasCritere5?.recommandations?.erreursAConserverCritere5) {
        const indicesAConserver = analyseDuplicatasCritere5.recommandations.erreursAConserverCritere5;
        erreursCritere5Finales = erreursCritere5ApresPasses.filter((_, index) => indicesAConserver.includes(index));
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse des duplicatas critère 5:', error);
      analyseDuplicatasCritere5 = { error: error.message };
    }

    return {
      // Erreurs finales après analyse IA des duplicatas
      erreursCritere4: erreursCritere4Finales,
      erreursCritere5: erreursCritere5Finales,
      // Erreurs avant analyse IA (après déduplication simple)
      erreursCritere4AvantAnalyseIA: erreursCritere4ApresPasses,
      erreursCritere5AvantAnalyseIA: erreursCritere5ApresPasses,
      // Cumul par passe
      cumulParPasse: cumulParPasse,
      // Résultats de l'analyse IA des duplicatas
      analyseIADuplicatas: {
        critere4: analyseDuplicatasCritere4,
        critere5: analyseDuplicatasCritere5,
      },
    };
  }

  // Vérifier et attendre si nécessaire pour respecter la limite de RPM
  async waitForRateLimit() {
    if (this.simulationMode) return; // Pas de limite en mode simulation

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Nettoyer les timestamps de plus d'une minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    // Si on a atteint la limite, attendre
    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestRequest) + 100; // +100ms de marge
      console.log(`Rate limit atteint, attente de ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForRateLimit(); // Vérifier à nouveau
    }

    // Enregistrer cette requête
    this.requestTimestamps.push(now);
  }

  // Arrêter le traitement en cours
  stopProcessing() {
    this.shouldStop = true;
  }

  // Réinitialiser le flag d'arrêt
  resetStop() {
    this.shouldStop = false;
  }

  async processFile(fileName, fileContent, onStepProgress = null, retryCount = 0) {
    const startTime = Date.now();
    const startTimestamp = new Date().toISOString();

    try {
      let erreursCritere4;
      let erreursCritere5;
      let cumulParPasse = null;
      let analyseIADuplicatas = null;
      let erreursCritere4AvantAnalyseIA = null;
      let erreursCritere5AvantAnalyseIA = null;

      if (this.simulationMode) {
        // MODE SIMULATION
        await this.simulateDelay();

        // 10% de chance d'erreur simulée pour tester l'affichage des erreurs
        if (Math.random() < 0.1) {
          throw new Error('Erreur simulée pour test');
        }

        // Simuler des erreurs vides en mode simulation
        erreursCritere4 = [];
        erreursCritere5 = [];
      } else {
        // MODE RÉEL avec N passes (configurable) + analyse IA des duplicatas
        console.log(`Traitement multi-passes (${this.nombrePasses}x) + analyse IA duplicatas pour ${fileName}...`);
        const results = await this.multiPassAnalysis(fileContent, this.getCurrentPromptContent(), onStepProgress);
        erreursCritere4 = results.erreursCritere4;
        erreursCritere5 = results.erreursCritere5;
        cumulParPasse = results.cumulParPasse;
        analyseIADuplicatas = results.analyseIADuplicatas;
        erreursCritere4AvantAnalyseIA = results.erreursCritere4AvantAnalyseIA;
        erreursCritere5AvantAnalyseIA = results.erreursCritere5AvantAnalyseIA;
      }

      const endTime = Date.now();
      const endTimestamp = new Date().toISOString();
      const duration = endTime - startTime;

      // Calculer les pointages pour chaque critère (sur les erreurs finales après analyse IA)
      const scoreCritere4 = this.calculerPointageCritere4(erreursCritere4);
      const scoreCritere5 = this.calculerPointageCritere5(erreursCritere5);

      // Construire le résultat
      const result = {
        fileName,
        originalText: fileContent,
        // Erreurs finales (après analyse IA des duplicatas)
        erreursCritere4,
        scoreCritere4,
        erreursCritere5,
        scoreCritere5,
        status: 'success',
        startTimestamp,
        endTimestamp,
        durationMs: duration,
        durationFormatted: this.formatDuration(duration),
      };

      // Ajouter le cumul par passe
      if (cumulParPasse && cumulParPasse.length > 0) {
        result.cumulParPasse = cumulParPasse;
      }

      // Ajouter les erreurs avant analyse IA (pour comparaison)
      if (erreursCritere4AvantAnalyseIA) {
        result.erreursCritere4AvantAnalyseIA = erreursCritere4AvantAnalyseIA;
      }
      if (erreursCritere5AvantAnalyseIA) {
        result.erreursCritere5AvantAnalyseIA = erreursCritere5AvantAnalyseIA;
      }

      // Ajouter les résultats de l'analyse IA des duplicatas
      if (analyseIADuplicatas) {
        result.analyseIADuplicatas = analyseIADuplicatas;
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const endTimestamp = new Date().toISOString();
      const duration = endTime - startTime;

      // Gestion des erreurs 429 (Too Many Requests) et 503 (Service Unavailable) avec retry
      if (error.message && (error.message.includes('429') || error.message.includes('503')) && retryCount < 5) {
        const waitTime = Math.min(5000 * Math.pow(2, retryCount), 60000); // Backoff exponentiel: 5s, 10s, 20s, 40s, 60s
        console.log(`Erreur ${error.message.includes('429') ? '429' : '503'} pour ${fileName}, retry ${retryCount + 1}/5 après ${waitTime/1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.processFile(fileName, fileContent, onStepProgress, retryCount + 1);
      }

      return {
        fileName,
        originalText: fileContent,
        error: error.message,
        status: 'error',
        startTimestamp,
        endTimestamp,
        durationMs: duration,
        durationFormatted: this.formatDuration(duration),
      };
    }
  }

  async processAllFiles(files, onProgress, onFileComplete = null) {
    this.isProcessing = true;
    this.shouldStop = false;
    this.results = [];
    this.errors = [];

    const totalFiles = files.length;
    // Total des étapes par fichier: N passes + 2 analyses IA (seulement si > 1 passe)
    const stepsPerFile = this.nombrePasses > 1 ? this.nombrePasses + 2 : this.nombrePasses;
    const totalSteps = totalFiles * stepsPerFile;
    let completedSteps = 0;

    // Tracker les fichiers actifs avec leur état
    const activeFiles = new Map(); // fileName -> { stepInfo, status }

    // Limiter le nombre de fichiers traités en parallèle
    const MAX_CONCURRENT = 10; // Maximum 10 fichiers en parallèle (évite les erreurs 503)
    const semaphore = {
      count: 0,
      queue: [],
      async acquire() {
        if (this.count < MAX_CONCURRENT) {
          this.count++;
          return;
        }
        await new Promise(resolve => this.queue.push(resolve));
        this.count++;
      },
      release() {
        this.count--;
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          next();
        }
      },
    };

    // Traiter tous les fichiers avec parallélisme limité
    const promises = files.map(async (file) => {
      // Attendre un slot disponible
      await semaphore.acquire();

      try {
        // Vérifier si on doit arrêter
        if (this.shouldStop) {
          return {
            fileName: file.name,
            originalText: file.content,
            error: 'Traitement arrêté par l\'utilisateur',
            status: 'cancelled',
            startTimestamp: new Date().toISOString(),
            endTimestamp: new Date().toISOString(),
            durationMs: 0,
            durationFormatted: '00:00:000',
          };
        }

        // Marquer le fichier comme actif
        activeFiles.set(file.name, { stepInfo: null, status: 'pending' });

        // Callback pour la progression des étapes internes
        const onStepProgress = (stepInfo) => {
          completedSteps++;
          activeFiles.set(file.name, { stepInfo, status: 'processing' });

          if (onProgress) {
            onProgress({
              current: completedSteps,
              total: totalSteps,
              percentage: Math.round((completedSteps / totalSteps) * 100),
              currentFile: file.name,
              stepInfo: stepInfo,
              // Liste de tous les fichiers actifs
              activeFiles: Array.from(activeFiles.entries()).map(([name, info]) => ({
                name,
                stepLabel: info.stepInfo?.stepLabel || 'En attente...',
                status: info.status,
              })),
            });
          }
        };

        const result = await this.processFile(file.name, file.content, onStepProgress);

        // Marquer le fichier comme terminé
        activeFiles.set(file.name, { stepInfo: null, status: result.status });

        if (result.status === 'success') {
          this.results.push(result);
        } else {
          this.errors.push(result);
        }

        // Appeler le callback de fin de fichier pour téléchargement immédiat
        if (onFileComplete && result.status === 'success') {
          onFileComplete(result);
        }

        // Notifier de la fin du fichier
        if (onProgress) {
          onProgress({
            current: completedSteps,
            total: totalSteps,
            percentage: Math.round((completedSteps / totalSteps) * 100),
            currentFile: file.name,
            stepInfo: { stepLabel: 'Terminé' },
            activeFiles: Array.from(activeFiles.entries()).map(([name, info]) => ({
              name,
              stepLabel: info.stepInfo?.stepLabel || (info.status === 'success' ? 'Terminé ✓' : info.status === 'error' ? 'Erreur ✗' : 'En attente...'),
              status: info.status,
            })),
          });
        }

        return result;
      } finally {
        // Libérer le slot du sémaphore dans tous les cas (succès, erreur, annulation)
        semaphore.release();
      }
    });

    const allResults = await Promise.all(promises);

    this.isProcessing = false;

    return {
      total: totalFiles,
      successful: this.results.length,
      failed: this.errors.length,
      cancelled: allResults.filter((r) => r.status === 'cancelled').length,
      results: allResults,
    };
  }

  async processFilesSequentially(files, onProgress, onFileComplete = null) {
    this.isProcessing = true;
    this.shouldStop = false;
    this.results = [];
    this.errors = [];

    const totalFiles = files.length;
    // Total des étapes par fichier: N passes + 2 analyses IA (seulement si > 1 passe)
    const stepsPerFile = this.nombrePasses > 1 ? this.nombrePasses + 2 : this.nombrePasses;
    const totalSteps = totalFiles * stepsPerFile;
    let completedSteps = 0;
    const allResults = [];

    for (let i = 0; i < files.length; i++) {
      // Vérifier si on doit arrêter
      if (this.shouldStop) {
        console.log('Traitement arrêté par l\'utilisateur');
        break;
      }

      const file = files[i];

      // Callback pour la progression des étapes internes
      const onStepProgress = (stepInfo) => {
        completedSteps++;
        if (onProgress) {
          onProgress({
            current: completedSteps,
            total: totalSteps,
            percentage: Math.round((completedSteps / totalSteps) * 100),
            currentFile: file.name,
            stepInfo: stepInfo,
          });
        }
      };

      const result = await this.processFile(file.name, file.content, onStepProgress);

      if (result.status === 'success') {
        this.results.push(result);
      } else {
        this.errors.push(result);
      }

      // Appeler le callback de fin de fichier pour téléchargement immédiat
      if (onFileComplete && result.status === 'success') {
        onFileComplete(result);
      }

      allResults.push(result);
    }

    this.isProcessing = false;

    return {
      total: totalFiles,
      successful: this.results.length,
      failed: this.errors.length,
      cancelled: this.shouldStop,
      results: allResults,
    };
  }

  // Méthode pour activer/désactiver le mode simulation
  setSimulationMode(enabled) {
    this.simulationMode = enabled;
  }

  getResults() {
    return this.results;
  }

  getErrors() {
    return this.errors;
  }

  exportResults() {
    return {
      processedAt: new Date().toISOString(),
      configuration: {
        promptUtilise: this.selectedPrompt,
        promptLabel: PROMPTS[this.selectedPrompt]?.label || this.selectedPrompt,
        nombrePasses: this.nombrePasses,
        modeleIA: this.selectedModel,
        modeleIALabel: AI_MODELS[this.selectedModel]?.label || this.selectedModel,
      },
      summary: {
        total: this.results.length + this.errors.length,
        successful: this.results.length,
        failed: this.errors.length,
      },
      results: this.results,
      errors: this.errors,
    };
  }

  // Exporter un seul résultat au format JSON
  exportSingleResult(result) {
    return {
      processedAt: new Date().toISOString(),
      configuration: {
        promptUtilise: this.selectedPrompt,
        promptLabel: PROMPTS[this.selectedPrompt]?.label || this.selectedPrompt,
        nombrePasses: this.nombrePasses,
        modeleIA: this.selectedModel,
        modeleIALabel: AI_MODELS[this.selectedModel]?.label || this.selectedModel,
      },
      result: result,
    };
  }

  // Extraire le nom de base du fichier (sans extension)
  getBaseFileName(fileName) {
    return fileName.replace(/\.[^/.]+$/, '');
  }

  // Exporter un seul résultat au format Excel (une ligne)
  exportSingleResultExcel(result) {
    // Construire la ligne de données pour ce résultat
    const rowData = {
      'N° Fichier': this.extractFileNumber(result.fileName),
      'Nom du fichier': result.fileName,
      'Temps de traitement': result.durationFormatted,
      'Nb erreurs C4': result.erreursCritere4?.length || 0,
      'Points perdus C4': result.scoreCritere4?.pointsPerdus || 0,
      'Note C4': result.scoreCritere4?.note || '-',
      'Nb erreurs C5': result.erreursCritere5?.length || 0,
      'Points perdus C5': result.scoreCritere5?.pointsPerdus || 0,
      'Note C5': result.scoreCritere5?.note || '-',
    };

    // Créer le workbook avec cette seule ligne
    const worksheet = XLSX.utils.json_to_sheet([rowData]);

    // Définir les largeurs de colonnes
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

  // Exporter tous les résultats actuels au format Excel (progressif)
  exportCurrentResultsExcel() {
    if (this.results.length === 0) {
      return null;
    }

    // Trier les résultats par nom de fichier
    const sortedResults = [...this.results].sort((a, b) => {
      return a.fileName.localeCompare(b.fileName);
    });

    // Construire les données pour le tableau Excel
    const excelData = sortedResults.map((result) => {
      return {
        'N° Fichier': this.extractFileNumber(result.fileName),
        'Nom du fichier': result.fileName,
        'Temps de traitement': result.durationFormatted,
        'Nb erreurs C4': result.erreursCritere4?.length || 0,
        'Points perdus C4': result.scoreCritere4?.pointsPerdus || 0,
        'Note C4': result.scoreCritere4?.note || '-',
        'Nb erreurs C5': result.erreursCritere5?.length || 0,
        'Points perdus C5': result.scoreCritere5?.pointsPerdus || 0,
        'Note C5': result.scoreCritere5?.note || '-',
      };
    });

    // Créer le workbook et la worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Définir les largeurs de colonnes
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

  // Exporter les résultats au format Excel
  // Extraire le numéro du fichier depuis le nom (ex: MAE_GCCC_002.txt -> 2)
  extractFileNumber(fileName) {
    // Chercher un pattern comme _001, _002, _123 etc. dans le nom
    const match = fileName.match(/_(\d+)\./);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Si pas de pattern trouvé, retourner 0
    return 0;
  }

  exportResultsExcel() {
    // Trier les résultats par nom de fichier
    const sortedResults = [...this.results].sort((a, b) => {
      return a.fileName.localeCompare(b.fileName);
    });

    // Construire les données pour le tableau Excel
    const excelData = sortedResults.map((result) => {
      return {
        'N° Fichier': this.extractFileNumber(result.fileName),
        'Nom du fichier': result.fileName,
        'Temps de traitement': result.durationFormatted,
        'Nb erreurs C4': result.erreursCritere4?.length || 0,
        'Points perdus C4': result.scoreCritere4?.pointsPerdus || 0,
        'Note C4': result.scoreCritere4?.note || '-',
        'Nb erreurs C5': result.erreursCritere5?.length || 0,
        'Points perdus C5': result.scoreCritere5?.pointsPerdus || 0,
        'Note C5': result.scoreCritere5?.note || '-',
      };
    });

    // Créer le workbook et la worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Définir les largeurs de colonnes
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
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    return excelBuffer;
  }
}

export default new BatchProcessor();

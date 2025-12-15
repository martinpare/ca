<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-md-10">
        <!-- Section Traitement en Lot -->
        <q-card class="q-mt-md">
          <q-card-section>
            <div class="text-h5">Traitement en Lot - Correction de Textes</div>
            <div class="text-subtitle2">
              Traiter tous les fichiers du répertoire 'finaux' en parallèle
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <!-- Sélection du Modèle IA, Prompt et Nombre de passes -->
            <div class="row q-gutter-md q-mb-md items-end">
              <q-select
                v-model="selectedModel"
                :options="availableModels"
                option-value="id"
                option-label="label"
                emit-value
                map-options
                label="Modèle IA"
                outlined
                dense
                :disable="batchLoading"
                @update:model-value="changeModel"
                style="min-width: 180px"
              />
              <q-select
                v-model="selectedPrompt"
                :options="availablePrompts"
                option-value="id"
                option-label="label"
                emit-value
                map-options
                label="Prompt de correction"
                outlined
                dense
                :disable="batchLoading"
                @update:model-value="changePrompt"
                style="min-width: 350px"
              />
              <q-select
                v-model="nombrePasses"
                :options="passesOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                label="Nombre de passes"
                outlined
                dense
                :disable="batchLoading"
                @update:model-value="changeNombrePasses"
                style="min-width: 150px"
              />
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              Sélectionnez le modèle IA, le prompt et le nombre de passes pour l'analyse des textes
            </div>

            <!-- Checkbox Mode Simulation -->
            <div class="q-mb-md">
              <q-checkbox
                v-model="simulationMode"
                label="Mode Simulation (ne consomme pas de quota API)"
                color="primary"
                :disable="batchLoading"
                @update:model-value="toggleSimulationMode"
              />
              <div class="text-caption text-grey-7 q-ml-lg">
                En mode simulation, les appels API sont simulés avec des réponses Lorem Ipsum
              </div>
            </div>

            <div class="row q-gutter-md q-mb-md items-center">
              <q-select
                v-model="selectedFileName"
                :options="fileOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                label="Fichier à analyser"
                outlined
                dense
                :disable="batchLoading"
                style="min-width: 250px"
                use-input
                input-debounce="0"
                @filter="filterFiles"
              />
              <q-btn
                label="Analyser ce fichier"
                color="accent"
                icon="science"
                :loading="batchLoading"
                :disable="batchLoading"
                @click="processSelectedFile"
              />
              <q-btn
                label="Traiter tous (Parallèle)"
                color="primary"
                icon="playlist_play"
                :loading="batchLoading"
                :disable="batchLoading"
                @click="processBatchParallel"
              />
              <q-btn
                label="Traiter en séquence"
                color="secondary"
                icon="format_list_numbered"
                :loading="batchLoading"
                :disable="batchLoading"
                @click="processBatchSequential"
              />
            </div>

            <div class="row q-gutter-md">
              <q-btn
                label="Arrêter"
                color="negative"
                icon="stop"
                :disable="!batchLoading"
                @click="stopProcessing"
              />
              <q-btn
                label="Réinitialiser"
                color="warning"
                icon="refresh"
                :disable="batchLoading || !batchResults"
                @click="resetBatch"
              />
              <q-btn
                label="Voir les résultats"
                color="info"
                icon="summarize"
                :disable="!batchResults"
                @click="showResults = true"
              />
            </div>

            <div v-if="batchProgress" class="q-mt-md">
              <div class="row items-center q-mb-sm">
                <div class="text-subtitle2">
                  Progression: {{ batchProgress.current }} / {{ batchProgress.total }} étapes
                  ({{ batchProgress.percentage }}%)
                </div>
                <q-space />
                <q-chip dense color="deep-purple" text-color="white" icon="timer">
                  {{ formatElapsedTime(elapsedTime) }}
                </q-chip>
              </div>

              <!-- Liste des fichiers en cours (mode parallèle) -->
              <div v-if="batchProgress.activeFiles && batchProgress.activeFiles.length > 0" class="q-mb-md">
                <div class="text-caption text-weight-bold q-mb-xs">Fichiers en traitement:</div>
                <div class="row q-gutter-xs">
                  <q-chip
                    v-for="file in batchProgress.activeFiles"
                    :key="file.name"
                    :color="file.status === 'success' ? 'positive' : file.status === 'error' ? 'negative' : file.status === 'processing' ? 'primary' : 'grey'"
                    text-color="white"
                    dense
                    size="sm"
                  >
                    <q-icon
                      :name="file.status === 'success' ? 'check_circle' : file.status === 'error' ? 'error' : file.status === 'processing' ? 'sync' : 'hourglass_empty'"
                      class="q-mr-xs"
                      :class="{ 'animate-spin': file.status === 'processing' }"
                    />
                    {{ file.name.substring(0, 15) }}{{ file.name.length > 15 ? '...' : '' }}
                    <q-tooltip>{{ file.name }} - {{ file.stepLabel }}</q-tooltip>
                  </q-chip>
                </div>
              </div>

              <!-- Mode séquentiel: un seul fichier -->
              <div v-else class="text-caption q-mb-sm">
                Fichier en cours: {{ batchProgress.currentFile }}
              </div>

              <div v-if="batchProgress.stepInfo" class="text-caption q-mb-sm text-primary">
                <q-icon name="sync" class="q-mr-xs" />
                {{ batchProgress.stepInfo.stepLabel }}
              </div>
              <q-linear-progress
                :value="batchProgress.percentage / 100"
                color="primary"
                size="20px"
              />
            </div>
          </q-card-section>

          <q-card-section v-if="batchResults">
            <q-banner class="bg-positive text-white" rounded>
              <template v-slot:avatar>
                <q-icon name="check_circle" color="white" />
              </template>
              <div class="text-subtitle1">Traitement terminé!</div>
              <div>
                Total: {{ batchResults.total }} | Succès:
                {{ batchResults.successful }} | Erreurs:
                {{ batchResults.failed }}
                <span v-if="batchResults.cancelled > 0">
                  | Annulés: {{ batchResults.cancelled }}
                </span>
              </div>
            </q-banner>
          </q-card-section>
        </q-card>

      </div>
    </div>

    <!-- Section Reviseur -->
    <div class="row justify-center">
      <div class="col-12 col-md-10">
        <q-card class="q-mt-md">
          <q-card-section>
            <div class="text-h5">Reviseur Linguistique</div>
            <div class="text-subtitle2">
              Réviser les erreurs détectées avec le prompt revieur_long (utilise les fichiers de resultats_simplified)
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row q-gutter-md q-mb-md items-center">
              <q-select
                v-model="selectedReviseurFile"
                :options="reviseurFileOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                label="Fichier à réviser"
                outlined
                dense
                :disable="reviseurLoading"
                style="min-width: 250px"
                use-input
                input-debounce="0"
                @filter="filterReviseurFiles"
              />
              <q-btn
                label="Réviser ce fichier"
                color="accent"
                icon="rate_review"
                :loading="reviseurLoading"
                :disable="reviseurLoading || !selectedReviseurFile"
                @click="processReviseurSingleFile"
              />
              <q-btn
                label="Réviser tous les fichiers"
                color="deep-purple"
                icon="playlist_play"
                :loading="reviseurLoading"
                :disable="reviseurLoading"
                @click="processReviseur"
              />
            </div>

            <div class="row q-gutter-md q-mb-md items-center">
              <q-btn
                label="Arrêter"
                color="negative"
                icon="stop"
                :disable="!reviseurLoading"
                @click="stopReviseur"
              />
              <q-btn
                label="Réinitialiser"
                color="warning"
                icon="refresh"
                :disable="reviseurLoading || !reviseurResults"
                @click="resetReviseur"
              />
              <q-btn
                label="Exporter Excel (finaux)"
                color="info"
                icon="download"
                :loading="excelLoading"
                :disable="excelLoading"
                @click="downloadFinalResultsExcel"
              />
            </div>

            <div class="text-caption text-grey-7 q-mb-md">
              Les résultats seront sauvegardés dans public/resultats/finaux/
            </div>

            <div v-if="reviseurProgress" class="q-mt-md">
              <div class="row items-center q-mb-sm">
                <div class="text-subtitle2">
                  Progression: {{ reviseurProgress.current }} / {{ reviseurProgress.total }} fichiers
                  ({{ reviseurProgress.percentage }}%)
                </div>
                <q-space />
                <q-chip dense color="deep-purple" text-color="white" icon="timer">
                  {{ formatElapsedTime(reviseurElapsedTime) }}
                </q-chip>
              </div>

              <!-- Liste des fichiers en cours (mode parallèle) -->
              <div v-if="reviseurProgress.activeFiles && reviseurProgress.activeFiles.length > 0" class="q-mb-md">
                <div class="text-caption text-weight-bold q-mb-xs">Fichiers en traitement:</div>
                <div class="row q-gutter-xs">
                  <q-chip
                    v-for="file in reviseurProgress.activeFiles"
                    :key="file.name"
                    :color="file.status === 'success' ? 'positive' : file.status === 'error' ? 'negative' : file.status === 'processing' ? 'deep-purple' : 'grey'"
                    text-color="white"
                    dense
                    size="sm"
                  >
                    <q-icon
                      :name="file.status === 'success' ? 'check_circle' : file.status === 'error' ? 'error' : file.status === 'processing' ? 'sync' : 'hourglass_empty'"
                      class="q-mr-xs"
                      :class="{ 'animate-spin': file.status === 'processing' }"
                    />
                    {{ file.name.replace('.json', '').substring(0, 15) }}{{ file.name.length > 20 ? '...' : '' }}
                    <q-tooltip>{{ file.name }} - {{ file.stepLabel }}</q-tooltip>
                  </q-chip>
                </div>
              </div>

              <!-- Mode séquentiel: un seul fichier -->
              <div v-else class="text-caption q-mb-sm">
                Lot en cours: {{ reviseurProgress.currentFile }}
              </div>

              <q-linear-progress
                :value="reviseurProgress.percentage / 100"
                color="deep-purple"
                size="20px"
              />
            </div>
          </q-card-section>

          <q-card-section v-if="reviseurResults">
            <q-banner class="bg-deep-purple text-white" rounded>
              <template v-slot:avatar>
                <q-icon name="check_circle" color="white" />
              </template>
              <div class="text-subtitle1">Révision terminée!</div>
              <div>
                Total: {{ reviseurResults.total }} | Succès:
                {{ reviseurResults.successful }} | Erreurs:
                {{ reviseurResults.failed }}
                <span v-if="reviseurResults.cancelled > 0">
                  | Annulés: {{ reviseurResults.cancelled }}
                </span>
              </div>
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog pour afficher les résultats -->
    <q-dialog v-model="showResults" maximized>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Résultats des Corrections</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none" style="max-height: 80vh; overflow-y: auto">
          <div v-if="batchResults && batchResults.results">
            <q-list separator>
              <q-item
                v-for="(result, index) in batchResults.results"
                :key="index"
              >
                <q-item-section>
                  <q-item-label class="text-weight-bold">
                    {{ result.fileName }}
                    <q-badge
                      :color="result.status === 'success' ? 'positive' : 'negative'"
                      :label="result.status"
                    />
                  </q-item-label>

                  <!-- Informations de timing -->
                  <div class="q-mt-sm q-mb-md">
                    <q-chip dense color="blue-grey-2" text-color="black" icon="schedule">
                      Début: {{ new Date(result.startTimestamp).toLocaleTimeString('fr-FR') }}
                    </q-chip>
                    <q-chip dense color="blue-grey-2" text-color="black" icon="event">
                      Fin: {{ new Date(result.endTimestamp).toLocaleTimeString('fr-FR') }}
                    </q-chip>
                    <q-chip dense color="primary" text-color="white" icon="timer">
                      Durée: {{ result.durationFormatted }}
                    </q-chip>
                  </div>

                  <div v-if="result.status === 'success'" class="q-mt-md">
                    <div class="text-subtitle2">Texte original:</div>
                    <q-card class="bg-grey-2 q-pa-sm q-mb-md">
                      <div style="white-space: pre-wrap; max-height: 200px; overflow-y: auto">
                        {{ result.originalText }}
                      </div>
                    </q-card>

                    <div class="text-subtitle2">Texte corrigé:</div>
                    <q-card class="bg-light-green-1 q-pa-sm">
                      <div style="white-space: pre-wrap; max-height: 200px; overflow-y: auto">
                        {{ result.correctedText }}
                      </div>
                    </q-card>
                  </div>

                  <div v-else class="q-mt-md">
                    <q-banner class="bg-negative text-white">
                      Erreur: {{ result.error }}
                    </q-banner>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            label="Télécharger JSON"
            color="primary"
            icon="download"
            @click="downloadResults"
          />
          <q-btn label="Fermer" color="secondary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent, ref } from 'vue';
import { useQuasar } from 'quasar';
import batchProcessor from 'src/services/batchProcessor';
import reviseurService from 'src/services/reviseurService';

export default defineComponent({
  name: 'IndexPage',

  setup() {
    const $q = useQuasar();
    const batchLoading = ref(false);
    const batchProgress = ref(null);
    const batchResults = ref(null);
    const showResults = ref(false);
    const simulationMode = ref(false); // Mode réel par défaut

    // État du reviseur
    const reviseurLoading = ref(false);
    const reviseurProgress = ref(null);
    const reviseurResults = ref(null);
    const reviseurElapsedTime = ref(0);
    const reviseurTimerInterval = ref(null);

    // Sélection du fichier pour le reviseur
    const selectedReviseurFile = ref('');
    const reviseurFileOptions = ref([]);
    const allReviseurFileOptions = ref([]);

    // État pour l'export Excel
    const excelLoading = ref(false);

    // Timer pour le temps d'analyse
    const elapsedTime = ref(0);
    const timerInterval = ref(null);

    const formatElapsedTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const startTimer = () => {
      elapsedTime.value = 0;
      timerInterval.value = setInterval(() => {
        elapsedTime.value++;
      }, 1000);
    };

    const stopTimer = () => {
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
        timerInterval.value = null;
      }
    };

    // Sélection du fichier à analyser
    const selectedFileName = ref('');
    const fileOptions = ref([]);
    const loadedFiles = ref([]); // Cache des fichiers chargés
    const allFileOptions = ref([]); // Toutes les options pour le filtre

    // Gestion des modèles IA
    const availableModels = ref(batchProcessor.getAvailableModels());
    const selectedModel = ref(batchProcessor.getSelectedModel());

    const changeModel = (modelId) => {
      batchProcessor.setSelectedModel(modelId);
      $q.notify({
        type: 'info',
        message: `Modèle IA changé: ${availableModels.value.find(m => m.id === modelId)?.label}`,
        position: 'top',
      });
    };

    // Gestion des prompts
    const availablePrompts = ref(batchProcessor.getAvailablePrompts());
    const selectedPrompt = ref(batchProcessor.getSelectedPrompt());

    const changePrompt = (promptId) => {
      batchProcessor.setSelectedPrompt(promptId);
      $q.notify({
        type: 'info',
        message: `Prompt changé: ${availablePrompts.value.find(p => p.id === promptId)?.label}`,
        position: 'top',
      });
    };

    // Gestion du nombre de passes
    const nombrePasses = ref(batchProcessor.getNombrePasses());
    const passesOptions = ref([
      { label: '1 passe', value: 1 },
      { label: '2 passes', value: 2 },
      { label: '3 passes', value: 3 },
      { label: '4 passes', value: 4 },
      { label: '5 passes', value: 5 },
    ]);

    const changeNombrePasses = (value) => {
      batchProcessor.setNombrePasses(value);
      $q.notify({
        type: 'info',
        message: `Nombre de passes: ${value}`,
        position: 'top',
      });
    };

    const loadTextFiles = async () => {
      try {
        // Liste des fichiers dans src/finaux
        const files = [];

        // Utiliser import.meta.glob pour charger tous les fichiers .txt
        const modules = import.meta.glob('/src/finaux/*.txt', {
          query: '?raw',
          import: 'default',
          eager: true
        });

        for (const [path, content] of Object.entries(modules)) {
          const fileName = path.split('/').pop();
          files.push({
            name: fileName,
            content: content,
          });
        }

        return files;
      } catch (error) {
        console.error('Erreur lors du chargement des fichiers:', error);
        throw error;
      }
    };

    // Charger la liste des fichiers au démarrage
    const initFileList = async () => {
      try {
        const files = await loadTextFiles();
        loadedFiles.value = files;
        // Trier par nom de fichier
        files.sort((a, b) => a.name.localeCompare(b.name));
        // Créer les options pour le dropdown
        const options = files.map(f => ({
          label: f.name.replace('.txt', ''),
          value: f.name
        }));
        fileOptions.value = options;
        allFileOptions.value = options; // Sauvegarder pour le filtre
        // Sélectionner le premier fichier par défaut
        if (files.length > 0) {
          selectedFileName.value = files[0].name;
        }
        console.log(`${files.length} fichiers chargés`);
      } catch (err) {
        console.error('Erreur lors du chargement de la liste des fichiers:', err);
      }
    };

    // Appeler au montage du composant
    initFileList();

    const processSelectedFile = async () => {
      batchLoading.value = true;
      batchProgress.value = null;
      batchResults.value = null;
      // Définir le nom du fichier Excel pour cette session
      excelFileName.value = `resultats_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      startTimer();

      try {
        // Vérifier qu'un fichier est sélectionné
        if (!selectedFileName.value) {
          $q.notify({
            type: 'warning',
            message: 'Veuillez sélectionner un fichier à analyser',
            position: 'top',
          });
          return;
        }

        // Trouver le fichier sélectionné dans le cache
        const file = loadedFiles.value.find(f => f.name === selectedFileName.value);
        if (!file) {
          $q.notify({
            type: 'warning',
            message: `Le fichier ${selectedFileName.value} n'a pas été trouvé`,
            position: 'top',
          });
          return;
        }

        // Traiter uniquement le fichier sélectionné
        const selectedFile = [file];

        $q.notify({
          type: 'info',
          message: `Analyse du fichier: ${file.name}`,
          position: 'top',
        });

        const results = await batchProcessor.processAllFiles(
          selectedFile,
          (progress) => {
            batchProgress.value = progress;
          },
          downloadSingleResult
        );

        batchResults.value = results;

        $q.notify({
          type: 'positive',
          message: `Analyse terminée! Statut: ${results.successful > 0 ? 'Succès' : 'Erreur'}`,
          position: 'top',
        });
      } catch (err) {
        console.error('Erreur lors de l\'analyse:', err);
        $q.notify({
          type: 'negative',
          message: 'Erreur lors de l\'analyse',
          caption: err.message,
          position: 'top',
        });
      } finally {
        stopTimer();
        batchLoading.value = false;
      }
    };

    const processBatchParallel = async () => {
      batchLoading.value = true;
      batchProgress.value = null;
      batchResults.value = null;
      // Définir le nom du fichier Excel pour cette session
      excelFileName.value = `resultats_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      startTimer();

      try {
        const files = await loadTextFiles();

        if (files.length === 0) {
          $q.notify({
            type: 'warning',
            message: 'Aucun fichier trouvé dans le répertoire finaux',
            position: 'top',
          });
          return;
        }

        $q.notify({
          type: 'info',
          message: `Traitement de ${files.length} fichiers en parallèle...`,
          position: 'top',
        });

        const results = await batchProcessor.processAllFiles(
          files,
          (progress) => {
            batchProgress.value = progress;
          },
          downloadSingleResult
        );

        batchResults.value = results;

        $q.notify({
          type: 'positive',
          message: `Traitement terminé! ${results.successful} succès, ${results.failed} erreurs`,
          position: 'top',
        });
      } catch (err) {
        console.error('Erreur lors du traitement en lot:', err);
        $q.notify({
          type: 'negative',
          message: 'Erreur lors du traitement en lot',
          caption: err.message,
          position: 'top',
        });
      } finally {
        stopTimer();
        batchLoading.value = false;
      }
    };

    const processBatchSequential = async () => {
      batchLoading.value = true;
      batchProgress.value = null;
      batchResults.value = null;
      // Définir le nom du fichier Excel pour cette session
      excelFileName.value = `resultats_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      startTimer();

      try {
        const files = await loadTextFiles();

        if (files.length === 0) {
          $q.notify({
            type: 'warning',
            message: 'Aucun fichier trouvé dans le répertoire finaux',
            position: 'top',
          });
          return;
        }

        $q.notify({
          type: 'info',
          message: `Traitement de ${files.length} fichiers en séquence...`,
          position: 'top',
        });

        const results = await batchProcessor.processFilesSequentially(
          files,
          (progress) => {
            batchProgress.value = progress;
          },
          downloadSingleResult
        );

        batchResults.value = results;

        $q.notify({
          type: 'positive',
          message: `Traitement terminé! ${results.successful} succès, ${results.failed} erreurs`,
          position: 'top',
        });
      } catch (err) {
        console.error('Erreur lors du traitement en lot:', err);
        $q.notify({
          type: 'negative',
          message: 'Erreur lors du traitement en lot',
          caption: err.message,
          position: 'top',
        });
      } finally {
        stopTimer();
        batchLoading.value = false;
      }
    };

    const stopProcessing = () => {
      batchProcessor.stopProcessing();
      $q.notify({
        type: 'warning',
        message: 'Arrêt du traitement en cours...',
        position: 'top',
      });
    };

    const resetBatch = () => {
      batchProgress.value = null;
      batchResults.value = null;
      batchProcessor.resetStop();
      $q.notify({
        type: 'info',
        message: 'Interface réinitialisée',
        position: 'top',
      });
    };

    // Nom du fichier Excel (fixe pour la session de traitement)
    const excelFileName = ref('resultats.xlsx');

    // Télécharger un seul résultat (appelé dès qu'un fichier est traité)
    const downloadSingleResult = (result) => {
      const baseFileName = batchProcessor.getBaseFileName(result.fileName);

      // 1. Télécharger le JSON individuel
      const data = batchProcessor.exportSingleResult(result);
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `${baseFileName}.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // 2. Télécharger le fichier Excel mis à jour (avec tous les résultats jusqu'à présent)
      setTimeout(() => {
        const excelBuffer = batchProcessor.exportCurrentResultsExcel();
        if (excelBuffer) {
          const excelBlob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const excelUrl = URL.createObjectURL(excelBlob);
          const excelLink = document.createElement('a');
          excelLink.href = excelUrl;
          excelLink.download = excelFileName.value;
          excelLink.click();
          URL.revokeObjectURL(excelUrl);
        }
      }, 300); // Petit délai pour éviter les téléchargements simultanés
    };

    const downloadResults = () => {
      const timestamp = new Date().toISOString();

      // 1. Télécharger le fichier JSON
      const data = batchProcessor.exportResults();
      const jsonBlob = new Blob([JSON.stringify(data)], {
        type: 'application/json',
      });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `corrections_${timestamp}.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // 2. Télécharger le fichier Excel
      const excelBuffer = batchProcessor.exportResultsExcel();
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const excelUrl = URL.createObjectURL(excelBlob);
      const excelLink = document.createElement('a');
      excelLink.href = excelUrl;
      excelLink.download = `corrections_${timestamp}.xlsx`;
      // Petit délai pour éviter que les deux téléchargements ne se chevauchent
      setTimeout(() => {
        excelLink.click();
        URL.revokeObjectURL(excelUrl);
      }, 500);
    };

    const toggleSimulationMode = (value) => {
      batchProcessor.setSimulationMode(value);
      $q.notify({
        type: 'info',
        message: value
          ? 'Mode simulation activé (ne consomme pas de quota)'
          : 'Mode réel activé (utilise l\'API Gemini)',
        position: 'top',
      });
    };

    // Filtre pour la recherche dans le dropdown des fichiers
    const filterFiles = (val, update) => {
      if (allFileOptions.value.length === 0) {
        // Sauvegarder toutes les options la première fois
        allFileOptions.value = [...fileOptions.value];
      }

      if (val === '') {
        update(() => {
          fileOptions.value = allFileOptions.value;
        });
        return;
      }

      update(() => {
        const needle = val.toLowerCase();
        fileOptions.value = allFileOptions.value.filter(
          v => v.label.toLowerCase().includes(needle)
        );
      });
    };

    // === Fonctions du Reviseur ===

    // Charger la liste des fichiers pour le reviseur (depuis resultats_simplified)
    const loadReviseurFiles = async () => {
      try {
        const files = await reviseurService.getAvailableFiles();
        // Trier par nom
        files.sort((a, b) => a.localeCompare(b));
        // Créer les options pour le dropdown
        const options = files.map(f => ({
          label: f.replace('.json', ''),
          value: f
        }));
        reviseurFileOptions.value = options;
        allReviseurFileOptions.value = options;
        // Sélectionner le premier fichier par défaut
        if (files.length > 0) {
          selectedReviseurFile.value = files[0];
        }
        console.log(`${files.length} fichiers disponibles pour le reviseur`);
      } catch (err) {
        console.error('Erreur lors du chargement des fichiers du reviseur:', err);
      }
    };

    // Initialiser la liste des fichiers du reviseur
    loadReviseurFiles();

    // Filtre pour la recherche dans le dropdown du reviseur
    const filterReviseurFiles = (val, update) => {
      if (val === '') {
        update(() => {
          reviseurFileOptions.value = allReviseurFileOptions.value;
        });
        return;
      }

      update(() => {
        const needle = val.toLowerCase();
        reviseurFileOptions.value = allReviseurFileOptions.value.filter(
          v => v.label.toLowerCase().includes(needle)
        );
      });
    };

    // Traiter un seul fichier avec le reviseur
    const processReviseurSingleFile = async () => {
      if (!selectedReviseurFile.value) {
        $q.notify({
          type: 'warning',
          message: 'Veuillez sélectionner un fichier à réviser',
          position: 'top',
        });
        return;
      }

      reviseurLoading.value = true;
      reviseurProgress.value = null;
      reviseurResults.value = null;
      startReviseurTimer();

      try {
        $q.notify({
          type: 'info',
          message: `Révision du fichier: ${selectedReviseurFile.value}`,
          position: 'top',
        });

        const results = await reviseurService.processSingleFile(
          selectedReviseurFile.value,
          (progress) => {
            reviseurProgress.value = progress;
          },
          downloadReviseurResult
        );

        reviseurResults.value = results;

        $q.notify({
          type: 'positive',
          message: `Révision terminée! Statut: ${results.successful > 0 ? 'Succès' : 'Erreur'}`,
          position: 'top',
        });
      } catch (err) {
        console.error('Erreur lors de la révision:', err);
        $q.notify({
          type: 'negative',
          message: 'Erreur lors de la révision',
          caption: err.message,
          position: 'top',
        });
      } finally {
        stopReviseurTimer();
        reviseurLoading.value = false;
      }
    };

    const startReviseurTimer = () => {
      reviseurElapsedTime.value = 0;
      reviseurTimerInterval.value = setInterval(() => {
        reviseurElapsedTime.value++;
      }, 1000);
    };

    const stopReviseurTimer = () => {
      if (reviseurTimerInterval.value) {
        clearInterval(reviseurTimerInterval.value);
        reviseurTimerInterval.value = null;
      }
    };

    const downloadReviseurResult = (result) => {
      // Télécharger le JSON dans public/resultats/finaux
      const data = reviseurService.exportResult(result);
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      // Utiliser le même nom de fichier mais dans le dossier finaux
      const baseFileName = result.fileName.replace('.json', '').replace('.txt', '');
      jsonLink.download = `${baseFileName}_final.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);
    };

    const processReviseur = async () => {
      reviseurLoading.value = true;
      reviseurProgress.value = null;
      reviseurResults.value = null;
      startReviseurTimer();

      try {
        $q.notify({
          type: 'info',
          message: 'Lancement du reviseur sur tous les fichiers...',
          position: 'top',
        });

        const results = await reviseurService.processAllFiles(
          (progress) => {
            reviseurProgress.value = progress;
          },
          downloadReviseurResult
        );

        reviseurResults.value = results;

        $q.notify({
          type: 'positive',
          message: `Révision terminée! ${results.successful} succès, ${results.failed} erreurs`,
          position: 'top',
        });
      } catch (err) {
        console.error('Erreur lors de la révision:', err);
        $q.notify({
          type: 'negative',
          message: 'Erreur lors de la révision',
          caption: err.message,
          position: 'top',
        });
      } finally {
        stopReviseurTimer();
        reviseurLoading.value = false;
      }
    };

    const stopReviseur = () => {
      reviseurService.stopProcessing();
      $q.notify({
        type: 'warning',
        message: 'Arrêt du reviseur en cours...',
        position: 'top',
      });
    };

    const resetReviseur = () => {
      reviseurProgress.value = null;
      reviseurResults.value = null;
      reviseurService.resetStop();
      $q.notify({
        type: 'info',
        message: 'Reviseur réinitialisé',
        position: 'top',
      });
    };

    // Télécharger le fichier Excel des résultats finaux
    const downloadFinalResultsExcel = async () => {
      excelLoading.value = true;

      try {
        $q.notify({
          type: 'info',
          message: 'Génération du fichier Excel en cours...',
          position: 'top',
        });

        const excelBuffer = await reviseurService.generateFinalResultsExcel();

        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resultats_revises_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);

        $q.notify({
          type: 'positive',
          message: 'Fichier Excel téléchargé avec succès!',
          position: 'top',
        });
      } catch (err) {
        console.error('Erreur lors de la génération Excel:', err);
        $q.notify({
          type: 'negative',
          message: 'Erreur lors de la génération du fichier Excel',
          caption: err.message,
          position: 'top',
        });
      } finally {
        excelLoading.value = false;
      }
    };

    return {
      batchLoading,
      batchProgress,
      batchResults,
      showResults,
      simulationMode,
      availableModels,
      selectedModel,
      availablePrompts,
      selectedPrompt,
      selectedFileName,
      fileOptions,
      filterFiles,
      nombrePasses,
      passesOptions,
      elapsedTime,
      formatElapsedTime,
      processSelectedFile,
      processBatchParallel,
      processBatchSequential,
      stopProcessing,
      resetBatch,
      downloadResults,
      toggleSimulationMode,
      changeModel,
      changePrompt,
      changeNombrePasses,
      // Reviseur
      reviseurLoading,
      reviseurProgress,
      reviseurResults,
      reviseurElapsedTime,
      selectedReviseurFile,
      reviseurFileOptions,
      filterReviseurFiles,
      processReviseurSingleFile,
      processReviseur,
      stopReviseur,
      resetReviseur,
      // Export Excel
      excelLoading,
      downloadFinalResultsExcel,
    };
  },
});
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

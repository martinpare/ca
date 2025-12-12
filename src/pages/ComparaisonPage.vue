<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-lg-11">
        <!-- En-tête avec sélecteur de fichier -->
        <q-card class="q-mb-md" flat square bordered>
          <q-card-section>
            <div class="row items-center q-gutter-md">
              <div class="text-h5">
                <q-icon name="rate_review" class="q-mr-sm" />
                Comparaison des Révisions
              </div>
              <q-space />
              <q-select
                v-model="selectedFile"
                :options="fileOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                label="Sélectionner un fichier"
                outlined
                dense
                style="min-width: 300px"
                use-input
                input-debounce="0"
                @filter="filterFiles"
                @update:model-value="loadFile"
              >
                <template v-slot:prepend>
                  <q-icon name="folder_open" />
                </template>
              </q-select>
            </div>
          </q-card-section>
        </q-card>

        <!-- Chargement -->
        <div v-if="loading" class="text-center q-pa-xl">
          <q-spinner-dots color="primary" size="50px" />
          <div class="text-subtitle1 q-mt-md">Chargement du fichier...</div>
        </div>

        <!-- Contenu principal -->
        <div v-else-if="fileData">
          <!-- Résumé général -->
          <q-card class="q-mb-md" flat square bordered>
            <q-card-section>
              <div class="row items-center q-gutter-md">
                <div>
                  <div class="text-h6">{{ fileData.fileName }}</div>
                  <div class="text-caption text-grey">
                    Traité le {{ formatDate(fileData.processedAt) }}
                    <span v-if="fileData.result?.registreIdentifie">
                      | Registre: <q-badge color="blue-grey">{{ fileData.result.registreIdentifie }}</q-badge>
                    </span>
                  </div>
                </div>
                </div>
            </q-card-section>
          </q-card>

          <!-- Comparaison Avant/Après révision -->
          <q-card class="q-mb-md" flat square bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-md">
                <q-icon name="compare_arrows" class="q-mr-sm" />
                Impact de la révision linguistique
              </div>

              <div class="row q-gutter-lg justify-center">
                <!-- AVANT révision -->
                <div class="col-auto">
                  <q-card flat square bordered class="q-pa-md" style="min-width: 280px;">
                    <div class="text-center q-mb-md">
                      <q-icon name="history" size="24px" color="negative" />
                      <div class="text-subtitle2 text-negative text-weight-bold">AVANT révision</div>
                      <div class="text-caption text-grey">Toutes les erreurs détectées</div>
                    </div>
                    <notes-aux-criteres :scores="scoresAvant" type="avant" />
                  </q-card>
                </div>

                <!-- Flèche de transition -->
                <div class="col-auto self-center">
                  <q-icon name="arrow_forward" size="48px" color="primary" />
                </div>

                <!-- APRÈS révision -->
                <div class="col-auto">
                  <q-card flat square bordered class="q-pa-md" style="min-width: 280px;">
                    <div class="text-center q-mb-md">
                      <q-icon name="verified" size="24px" color="positive" />
                      <div class="text-subtitle2 text-positive text-weight-bold">APRÈS révision</div>
                      <div class="text-caption text-grey">Faux positifs retirés</div>
                    </div>
                    <notes-aux-criteres :scores="scoresApres" type="apres" />
                  </q-card>
                </div>
              </div>

              <!-- Résumé de l'amélioration -->
              <div v-if="amelioration.total > 0" class="text-center q-mt-md">
                <q-chip color="positive" text-color="white" icon="trending_up">
                  {{ amelioration.total }} erreur(s) rejetée(s) = +{{ amelioration.points }} point(s) récupéré(s)
                </q-chip>
              </div>
            </q-card-section>
          </q-card>

          <!-- Statistiques des verdicts -->
          <q-card class="q-mb-md" flat square bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-md">Résumé des Verdicts</div>
              <div class="row q-gutter-md">
                <q-chip
                  color="negative"
                  text-color="white"
                  icon="error"
                  :label="`${stats.erreurs} Erreurs confirmées`"
                  class="text-weight-bold"
                />
                <q-chip
                  color="warning"
                  text-color="black"
                  icon="help"
                  :label="`${stats.discutables} Discutables`"
                  class="text-weight-bold"
                />
                <q-chip
                  color="positive"
                  text-color="white"
                  icon="check_circle"
                  :label="`${stats.fauxPositifs} Faux positifs (rejetés)`"
                  class="text-weight-bold"
                />
                <q-space />
                <q-btn-toggle
                  v-model="filterVerdict"
                  toggle-color="primary"
                  :options="[
                    { label: 'Tous', value: 'all' },
                    { label: 'Erreurs', value: 'ERREUR' },
                    { label: 'Discutables', value: 'DISCUTABLE' },
                    { label: 'Faux positifs', value: 'FAUX_POSITIF' }
                  ]"
                  unelevated
                  rounded
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Onglets par critère -->
          <q-card flat square bordered>
            <q-tabs
              v-model="activeTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
            >
              <q-tab name="critere4" label="Critère 4 - Syntaxe" :badge="countCritere4" />
              <q-tab name="critere5" label="Critère 5 - Usage" :badge="countCritere5" />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="activeTab" animated>
              <!-- Critère 4 -->
              <q-tab-panel name="critere4">
                <div v-if="filteredErreursCritere4.length === 0" class="text-center text-grey q-pa-xl">
                  <q-icon name="check_circle" size="48px" color="positive" />
                  <div class="text-subtitle1 q-mt-md">Aucune erreur pour ce filtre</div>
                </div>
                <div v-else class="row q-col-gutter-md">
                  <div
                    v-for="erreur in filteredErreursCritere4"
                    :key="erreur.id"
                    class="col-12 col-md-6"
                  >
                    <erreur-card :erreur="erreur" />
                  </div>
                </div>
              </q-tab-panel>

              <!-- Critère 5 -->
              <q-tab-panel name="critere5">
                <div v-if="filteredErreursCritere5.length === 0" class="text-center text-grey q-pa-xl">
                  <q-icon name="check_circle" size="48px" color="positive" />
                  <div class="text-subtitle1 q-mt-md">Aucune erreur pour ce filtre</div>
                </div>
                <div v-else class="row q-col-gutter-md">
                  <div
                    v-for="erreur in filteredErreursCritere5"
                    :key="erreur.id"
                    class="col-12 col-md-6"
                  >
                    <erreur-card :erreur="erreur" />
                  </div>
                </div>
              </q-tab-panel>
            </q-tab-panels>
          </q-card>
        </div>

        <!-- Aucun fichier sélectionné -->
        <div v-else class="text-center q-pa-xl">
          <q-icon name="description" size="64px" color="grey-5" />
          <div class="text-h6 text-grey q-mt-md">Sélectionnez un fichier pour voir les révisions</div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue';
import ErreurCard from 'src/components/ErreurCard.vue';
import NotesAuxCriteres from 'src/components/NotesAuxCriteres.vue';

export default defineComponent({
  name: 'ComparaisonPage',

  components: {
    ErreurCard,
    NotesAuxCriteres
  },

  setup() {
    const loading = ref(false);
    const selectedFile = ref(null);
    const fileData = ref(null);
    const fileOptions = ref([]);
    const allFileOptions = ref([]);
    const activeTab = ref('critere4');
    const filterVerdict = ref('all');

    // Charger la liste des fichiers
    const loadFileList = async () => {
      try {
        const modules = import.meta.glob('/public/resultats/finaux/*_final.json', {
          as: 'raw',
          eager: true
        });

        const options = [];
        for (const [path] of Object.entries(modules)) {
          const fileName = path.split('/').pop();
          options.push({
            label: fileName.replace('_final.json', ''),
            value: fileName
          });
        }

        // Trier par nom
        options.sort((a, b) => a.label.localeCompare(b.label));
        fileOptions.value = options;
        allFileOptions.value = options;

        // Sélectionner le premier par défaut
        if (options.length > 0) {
          selectedFile.value = options[0].value;
          await loadFile(options[0].value);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de la liste:', err);
      }
    };

    // Charger un fichier
    const loadFile = async (fileName) => {
      if (!fileName) return;

      loading.value = true;
      try {
        const modules = import.meta.glob('/public/resultats/finaux/*_final.json', {
          as: 'raw',
          eager: true
        });

        const path = `/public/resultats/finaux/${fileName}`;
        if (modules[path]) {
          fileData.value = JSON.parse(modules[path]);
        }
      } catch (err) {
        console.error('Erreur lors du chargement du fichier:', err);
        fileData.value = null;
      } finally {
        loading.value = false;
      }
    };

    // Filtrer les fichiers dans le dropdown
    const filterFiles = (val, update) => {
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

    // Statistiques
    const stats = computed(() => {
      if (!fileData.value?.result?.resumeVerdicts) {
        return { erreurs: 0, discutables: 0, fauxPositifs: 0 };
      }
      const rv = fileData.value.result.resumeVerdicts;
      return {
        erreurs: rv.vraisErreurs || 0,
        discutables: rv.discutables || 0,
        fauxPositifs: rv.fauxPositifs || 0
      };
    });

    // Calculer les points pour le critère 4
    // S: 1 point, (S): 0 point, P: 0.5 point, (P): 0 point, «P»: 0.5 point, [P]: 0.5 point
    const calculerPointsCritere4 = (erreurs) => {
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
    };

    // Calculer les points pour le critère 5
    // U: 1 point, (U): 0 point, G: 1 point
    const calculerPointsCritere5 = (erreurs) => {
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
    };

    // Calculer la note selon les points perdus - Critère 4
    // 0-4=A, 5-9=B, 10-14=C, 15-17=D, 18+=E
    const calculerNoteCritere4 = (pointsPerdus) => {
      if (pointsPerdus <= 4) return 'A';
      if (pointsPerdus <= 9) return 'B';
      if (pointsPerdus <= 14) return 'C';
      if (pointsPerdus <= 17) return 'D';
      return 'E';
    };

    // Calculer la note selon les points perdus - Critère 5
    // 0-4=A, 5-9=B, 10-14=C, 15-18=D, 19+=E
    const calculerNoteCritere5 = (pointsPerdus) => {
      if (pointsPerdus <= 4) return 'A';
      if (pointsPerdus <= 9) return 'B';
      if (pointsPerdus <= 14) return 'C';
      if (pointsPerdus <= 18) return 'D';
      return 'E';
    };

    // Scores AVANT révision (toutes les erreurs détectées)
    const scoresAvant = computed(() => {
      const erreurs4 = fileData.value?.result?.erreursCritere4 || [];
      const erreurs5 = fileData.value?.result?.erreursCritere5 || [];

      const points4 = calculerPointsCritere4(erreurs4);
      const points5 = calculerPointsCritere5(erreurs5);

      return {
        critere4: {
          erreurs: erreurs4.length,
          points: points4,
          note: calculerNoteCritere4(points4)
        },
        critere5: {
          erreurs: erreurs5.length,
          points: points5,
          note: calculerNoteCritere5(points5)
        }
      };
    });

    // Scores APRÈS révision (faux positifs retirés)
    const scoresApres = computed(() => {
      const erreurs4 = fileData.value?.result?.erreursCritere4 || [];
      const erreurs5 = fileData.value?.result?.erreursCritere5 || [];

      // Garder seulement les erreurs confirmées (ERREUR) et discutables
      const vraisErreurs4 = erreurs4.filter(e => e.verdict === 'ERREUR' || e.verdict === 'DISCUTABLE');
      const vraisErreurs5 = erreurs5.filter(e => e.verdict === 'ERREUR' || e.verdict === 'DISCUTABLE');

      const points4 = calculerPointsCritere4(vraisErreurs4);
      const points5 = calculerPointsCritere5(vraisErreurs5);

      return {
        critere4: {
          erreurs: vraisErreurs4.length,
          points: points4,
          note: calculerNoteCritere4(points4)
        },
        critere5: {
          erreurs: vraisErreurs5.length,
          points: points5,
          note: calculerNoteCritere5(points5)
        }
      };
    });

    // Calcul de l'amélioration
    const amelioration = computed(() => {
      const avant = scoresAvant.value;
      const apres = scoresApres.value;

      return {
        critere4: avant.critere4.points - apres.critere4.points,
        critere5: avant.critere5.points - apres.critere5.points,
        total: (avant.critere4.erreurs - apres.critere4.erreurs) + (avant.critere5.erreurs - apres.critere5.erreurs),
        points: (avant.critere4.points - apres.critere4.points) + (avant.critere5.points - apres.critere5.points)
      };
    });

    // Compter les erreurs par critère
    const countCritere4 = computed(() => {
      return fileData.value?.result?.erreursCritere4?.length || 0;
    });

    const countCritere5 = computed(() => {
      return fileData.value?.result?.erreursCritere5?.length || 0;
    });

    // Filtrer les erreurs selon le verdict sélectionné
    const filteredErreursCritere4 = computed(() => {
      const erreurs = fileData.value?.result?.erreursCritere4 || [];
      if (filterVerdict.value === 'all') return erreurs;
      return erreurs.filter(e => e.verdict === filterVerdict.value);
    });

    const filteredErreursCritere5 = computed(() => {
      const erreurs = fileData.value?.result?.erreursCritere5 || [];
      if (filterVerdict.value === 'all') return erreurs;
      return erreurs.filter(e => e.verdict === filterVerdict.value);
    });

    // Formater la date
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleString('fr-CA', {
        dateStyle: 'long',
        timeStyle: 'short'
      });
    };

    // Couleur selon la note
    const getNoteColor = (note) => {
      if (!note) return 'grey';
      if (note === 'A' || note === 'A+') return 'positive';
      if (note === 'B' || note === 'B+') return 'info';
      if (note === 'C' || note === 'C+') return 'warning';
      return 'negative';
    };

    onMounted(() => {
      loadFileList();
    });

    return {
      loading,
      selectedFile,
      fileData,
      fileOptions,
      activeTab,
      filterVerdict,
      stats,
      scoresAvant,
      scoresApres,
      amelioration,
      countCritere4,
      countCritere5,
      filteredErreursCritere4,
      filteredErreursCritere5,
      filterFiles,
      loadFile,
      formatDate,
      getNoteColor
    };
  }
});
</script>

<style scoped>
.q-badge {
  font-size: 1rem;
}
</style>

<template>
  <q-page class="text-viewer-page">
    <!-- Floating Toolbar draggable -->
    <div
      ref="floatingToolbar"
      class="floating-toolbar"
      :style="{ left: toolbarPosition.x + 'px', top: toolbarPosition.y + 'px' }"
    >
      <div class="toolbar-drag-handle" @mousedown="startDrag">
        <q-icon name="drag_indicator" size="sm" />
      </div>

      <q-select
        v-model="selectedFileName"
        :options="fileOptions"
        option-value="value"
        option-label="label"
        emit-value
        map-options
        label="Texte"
        outlined
        dense
        clearable
        style="min-width: 220px"
        use-input
        input-debounce="0"
        @filter="filterFiles"
        @update:model-value="loadSelectedFile"
      >
        <template v-slot:prepend>
          <q-icon name="description" />
        </template>
      </q-select>

      <q-separator vertical inset class="q-mx-sm" />

      <q-btn-group flat>
        <q-btn flat dense icon="remove" @click="zoomOut" :disable="zoom <= 50">
          <q-tooltip>Réduire</q-tooltip>
        </q-btn>
        <q-btn flat dense class="zoom-display">{{ zoom }}%</q-btn>
        <q-btn flat dense icon="add" @click="zoomIn" :disable="zoom >= 200">
          <q-tooltip>Agrandir</q-tooltip>
        </q-btn>
      </q-btn-group>

      <q-btn flat dense icon="fit_screen" @click="resetZoom">
        <q-tooltip>Réinitialiser le zoom</q-tooltip>
      </q-btn>

      <q-separator vertical inset class="q-mx-sm" />

      <q-btn
        flat
        dense
        icon="restart_alt"
        @click="resetErrorStates"
        :disable="checkedErrors.size === 0 && rejectedErrors.size === 0"
        data-tutorial="reset-btn"
      >
        <q-tooltip>Réinitialiser les états des erreurs</q-tooltip>
      </q-btn>

      <q-separator vertical inset class="q-mx-sm" />

      <q-btn flat dense icon="help_outline" color="primary" @click="showHelpDialog = true">
        <q-tooltip>Aide - Comment valider les erreurs</q-tooltip>
      </q-btn>

      <q-btn flat dense icon="school" @click="showTutorial = true">
        <q-tooltip>Lancer le tutoriel interactif</q-tooltip>
      </q-btn>
    </div>

    <!-- Dialogue d'aide -->
    <q-dialog v-model="showHelpDialog">
      <q-card style="max-width: 700px; width: 100%">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center no-wrap">
            <div>
              <div class="text-h5 text-weight-bold">Guide de Validation</div>
              <div class="text-caption">Comment valider les erreurs efficacement</div>
            </div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </div>
        </q-card-section>

        <q-card-section class="q-pt-lg">
          <!-- Section processus -->
          <div class="q-mb-lg">
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-bold text-primary">
                Le processus de validation
              </div>
            </div>
            <q-separator class="q-mb-md" />

            <div class="row q-gutter-md q-pr-md">
              <div class="col-12">
                <q-card flat class="" square>
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center">
                      <q-avatar color="primary" text-color="white" size="32px" class="q-mr-md"
                        >1</q-avatar
                      >
                      <div>
                        <div class="text-weight-bold">Sélectionnez un fichier</div>
                        <div class="text-caption text-grey-8">
                          Utilisez le menu déroulant pour choisir le document à réviser
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12">
                <q-card flat class="" square>
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center">
                      <q-avatar color="primary" text-color="white" size="32px" class="q-mr-md"
                        >2</q-avatar
                      >
                      <div>
                        <div class="text-weight-bold">Examinez chaque erreur</div>
                        <div class="text-caption text-grey-8">
                          Cliquez sur une erreur dans le panneau de droite pour la surligner dans le
                          texte
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12">
                <q-card flat class="" square>
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center">
                      <q-avatar color="primary" text-color="white" size="32px" class="q-mr-md"
                        >3</q-avatar
                      >
                      <div>
                        <div class="text-weight-bold">Rendez votre verdict</div>
                        <div class="text-caption text-grey-8">
                          <q-icon
                            name="check_circle"
                            color="positive"
                            size="18px"
                            class="q-mr-xs"
                          />
                          = erreur confirmée
                          <q-icon name="cancel" color="negative" size="18px" class="q-mx-sm" /> =
                          faux positif (rejeter)
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12">
                <q-card flat class="" square>
                  <q-card-section class="q-pa-sm">
                    <div class="row items-center">
                      <q-avatar color="primary" text-color="white" size="32px" class="q-mr-md"
                        >4</q-avatar
                      >
                      <div>
                        <div class="text-weight-bold">Les scores se mettent à jour</div>
                        <div class="text-caption text-grey-8">
                          Les points sont recalculés automatiquement en fonction de vos verdicts
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <!-- Section clavier -->
          <div class="q-mb-md text-center">
            <div class="row items-center q-mb-sm"></div>
            <q-separator class="q-mb-md" />

            <q-banner class="q-mb-md text-center">
              <div>
                <div class="text-subtitle1 text-weight-bold">Navigation 100% clavier</div>
              </div>

              <div class="text-weight-medium">
                Tout a été conçu pour une validation rapide au clavier!
              </div>
              <div class="text-caption text-grey-8">
                Gardez vos mains sur le clavier pour un flux de travail optimal.
              </div>
            </q-banner>

            <div class="row q-gutter-sm justify-center">
              <q-card flat bordered class="text-center" style="min-width: 160px">
                <q-card-section class="q-pa-sm">
                  <kbd class="keyboard-key bg-positive text-white">E</kbd>
                  <div class="text-caption q-mt-xs text-weight-bold">Confirmer l'erreur</div>
                </q-card-section>
              </q-card>

              <q-card flat bordered class="text-center" style="min-width: 160px">
                <q-card-section class="q-pa-sm">
                  <kbd class="keyboard-key bg-negative text-white">R</kbd>
                  <div class="text-caption q-mt-xs text-weight-bold">Rejeter (faux positif)</div>
                </q-card-section>
              </q-card>
            </div>

            <div class="row q-gutter-sm justify-center q-mt-md">
              <q-card flat bordered class="text-center" style="min-width: 160px">
                <q-card-section class="q-pa-sm">
                  <kbd class="keyboard-key bg-grey-8 text-white">←</kbd>
                  <span class="text-grey-6 q-mx-xs">ou</span>
                  <kbd class="keyboard-key bg-grey-8 text-white">↑</kbd>
                  <div class="text-caption q-mt-xs">Précédente</div>
                </q-card-section>
              </q-card>

              <q-card flat bordered class="text-center" style="min-width: 160px">
                <q-card-section class="q-pa-sm">
                  <kbd class="keyboard-key bg-grey-8 text-white">→</kbd>
                  <span class="text-grey-6 q-mx-xs">ou</span>
                  <kbd class="keyboard-key bg-grey-8 text-white">↓</kbd>
                  <div class="text-caption q-mt-xs">Suivante</div>
                </q-card-section>
              </q-card>

              <q-card flat bordered class="text-center" style="min-width: 120px">
                <q-card-section class="q-pa-sm">
                  <kbd class="keyboard-key bg-grey-8 text-white">Esc</kbd>
                  <div class="text-caption q-mt-xs">Désélectionner</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="center" class="q-pa-md bg-grey-1">
          <q-btn color="primary" label="Fermer" unelevated v-close-popup class="q-px-xl" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Splitter: Texte à gauche, Erreurs à droite -->
    <q-splitter v-model="splitterModel" class="splitter-container">
      <template v-slot:before>
        <!-- Zone de contenu avec fond grisé -->
        <div class="document-container">
          <div class="document-background">
            <!-- Page style Word -->
            <div class="document-page" :style="{ transform: `scale(${zoom / 100})` }">
              <div v-if="!currentText" class="placeholder-text">
                Sélectionnez un texte dans la liste ci-dessus
              </div>
              <template v-else>
                <div class="word-count-label text-center">
                  Nombre de mots: <strong>{{ wordCount }}</strong> mots
                </div>
                <div class="document-content" v-html="formattedText"></div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <template v-slot:after>
        <!-- Panneau des erreurs -->
        <div class="errors-panel">
          <!-- Partie fixe (toujours visible) -->
          <div class="errors-panel-header">
            <q-list dense>
              <q-item-label header class="text-h6"> Analyse des erreurs </q-item-label>

              <!-- Résumé des scores -->
              <q-item v-if="analysisData && scoresForDisplay">
                <q-item-section>
                  <NotesAuxCriteres :scores="scoresForDisplay" type="avant" />
                </q-item-section>
              </q-item>

              <!-- Toggle de tri -->
              <q-item v-if="analysisData">
                <q-item-section>
                  <q-btn-toggle
                    v-model="sortMode"
                    spread
                    no-caps
                    dense
                    size="md"
                    toggle-color="primary"
                    color="white"
                    text-color="primary"
                    :options="[
                      { label: 'Par position', value: 'position', icon: 'format_list_numbered' },
                      { label: 'Par type', value: 'type', icon: 'category' },
                    ]"
                  />
                </q-item-section>
              </q-item>

              <!-- Filtre de recherche -->
              <q-item v-if="analysisData">
                <q-item-section>
                  <q-input
                    v-model="searchFilter"
                    dense
                    outlined
                    clearable
                    placeholder="Rechercher dans les erreurs (min. 4 caractères)..."
                    :error="searchFilter.length > 0 && searchFilter.length < 4"
                    :error-message="
                      searchFilter.length > 0 && searchFilter.length < 4
                        ? 'Minimum 4 caractères'
                        : ''
                    "
                  >
                    <template v-slot:prepend>
                      <q-icon name="search" />
                    </template>
                    <template v-slot:append v-if="searchFilter.length >= 4">
                      <q-badge color="primary" :label="filteredErrorsCount + ' résultat(s)'" />
                    </template>
                  </q-input>
                </q-item-section>
              </q-item>
            </q-list>
            <q-separator />
          </div>

          <!-- Partie scrollable (liste des erreurs) -->
          <q-scroll-area class="errors-panel-list">
            <q-list class="errors-list-content">
              <!-- Mode: Par type -->
              <template v-if="sortMode === 'type'">
                <template v-for="(erreurs, type) in filteredErreursByType" :key="type">
                  <q-item-label header class="text-subtitle1">
                    <q-badge :color="getTypeColor(type)" class="q-mr-sm" style="font-size: 14px">
                      {{ type }}
                    </q-badge>
                    {{ typeLabels[type] || type }}
                    <q-badge :color="getTypeColor(type)" outline class="q-ml-sm">
                      {{ erreurs.length }}
                    </q-badge>
                  </q-item-label>

                  <q-item v-for="erreur in erreurs" :key="erreur.id" class="q-mb-sm">
                    <q-item-section>
                      <q-card
                        flat
                        bordered
                        :class="
                          'error-card error-card-' +
                          typeToCSS(erreur.type) +
                          (isErrorSelected(erreur.id)
                            ? ' error-card-selected error-card-selected-' + typeToCSS(erreur.type)
                            : '')
                        "
                        @click="onErrorClick(erreur)"
                      >
                        <q-card-section class="q-pa-sm">
                          <div class="row items-center q-mb-xs">
                            <q-chip
                              color="primary"
                              text-color="white"
                              size="sm"
                              dense
                              class="q-mr-sm"
                            >
                              C{{ erreur.critere }}
                            </q-chip>
                            <span
                              class="rule-id-link text-caption"
                              @click.stop="openRuleDialog(erreur)"
                            >
                              {{ erreur.ruleApplied }}
                            </span>
                            <q-space />
                            <q-icon
                              v-if="isErrorRejected(erreur.id)"
                              name="cancel"
                              color="red-3"
                              size="xs"
                            />
                            <q-icon
                              v-if="isErrorChecked(erreur.id)"
                              name="check_circle"
                              color="green"
                              size="xs"
                            />
                          </div>
                          <div
                            class="text-body2 text-weight-medium q-mb-xs"
                            style="color: #c62828"
                            v-html="'&quot;' + highlightSearchTerm(erreur.text) + '&quot;'"
                          ></div>
                          <div
                            class="text-caption"
                            v-html="highlightSearchTerm(erreur.description)"
                          ></div>
                          <div v-if="erreur.suggestions?.length" class="q-mt-xs">
                            <span class="text-caption text-grey">Suggestion:</span>
                            <q-chip
                              v-for="(sug, i) in erreur.suggestions"
                              :key="i"
                              size="sm"
                              color="green-2"
                              text-color="green-10"
                              dense
                              class="q-ml-xs"
                            >
                              <span v-html="highlightSearchTerm(sug)"></span>
                            </q-chip>
                          </div>
                          <div
                            v-if="isErrorRejected(erreur.id) && getJustification(erreur.id)"
                            class="q-mt-sm justification-display"
                          >
                            <q-icon name="rate_review" color="orange" size="xs" class="q-mr-xs" />
                            <span class="text-caption text-orange-8">{{
                              getJustification(erreur.id)
                            }}</span>
                          </div>
                        </q-card-section>
                      </q-card>
                    </q-item-section>
                  </q-item>

                  <q-separator spaced />
                </template>
              </template>

              <!-- Mode: Par position -->
              <template v-else>
                <q-item
                  v-for="erreur in filteredErreursByPosition"
                  :key="erreur.id"
                  class="q-mb-sm"
                >
                  <q-item-section>
                    <q-card
                      flat
                      bordered
                      :class="
                        'error-card error-card-' +
                        typeToCSS(erreur.type) +
                        (isErrorSelected(erreur.id)
                          ? ' error-card-selected error-card-selected-' + typeToCSS(erreur.type)
                          : '')
                      "
                      @click="onErrorClick(erreur)"
                    >
                      <q-card-section class="q-pa-sm">
                        <div class="row items-center q-mb-xs">
                          <q-badge :color="getTypeColor(erreur.type)" class="q-mr-sm">
                            {{ erreur.type }}
                          </q-badge>
                          <q-chip
                            color="primary"
                            text-color="white"
                            size="sm"
                            dense
                            class="q-mr-sm"
                          >
                            C{{ erreur.critere }}
                          </q-chip>
                          <span
                            class="rule-id-link text-caption"
                            @click.stop="openRuleDialog(erreur)"
                          >
                            {{ erreur.ruleApplied }}
                          </span>
                          <q-space />
                          <q-icon
                            v-if="isErrorRejected(erreur.id)"
                            name="cancel"
                            color="red-3"
                            size="xs"
                          />
                          <q-icon
                            v-if="isErrorChecked(erreur.id)"
                            name="check_circle"
                            color="green"
                            size="xs"
                          />
                        </div>
                        <div
                          class="text-body2 text-weight-medium q-mb-xs"
                          style="color: #c62828"
                          v-html="'&quot;' + highlightSearchTerm(erreur.text) + '&quot;'"
                        ></div>
                        <div
                          class="text-caption"
                          v-html="highlightSearchTerm(erreur.description)"
                        ></div>
                        <div v-if="erreur.suggestions?.length" class="q-mt-xs">
                          <span class="text-caption text-grey">Suggestion:</span>
                          <q-chip
                            v-for="(sug, i) in erreur.suggestions"
                            :key="i"
                            size="sm"
                            color="green-2"
                            text-color="green-10"
                            dense
                            class="q-ml-xs"
                          >
                            <span v-html="highlightSearchTerm(sug)"></span>
                          </q-chip>
                        </div>
                        <div
                          v-if="isErrorRejected(erreur.id) && getJustification(erreur.id)"
                          class="q-mt-sm justification-display"
                        >
                          <q-icon name="rate_review" color="orange" size="xs" class="q-mr-xs" />
                          <span class="text-caption text-orange-8">{{
                            getJustification(erreur.id)
                          }}</span>
                        </div>
                      </q-card-section>
                    </q-card>
                  </q-item-section>
                </q-item>
              </template>

              <!-- Message si pas de données -->
              <q-item v-if="!analysisData">
                <q-item-section>
                  <div class="text-center text-grey q-pa-md">
                    Sélectionnez un texte pour voir l'analyse
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </div>
      </template>
    </q-splitter>

    <!-- Dialog pour afficher les détails d'une règle -->
    <RuleDetailDialog
      v-model="ruleDialogOpen"
      :rule-id="selectedRuleId"
      :error-text="selectedErrorText"
      :error-description="selectedErrorDescription"
      :error-suggestions="selectedErrorSuggestions"
      :error-type="selectedErrorType"
    />

    <!-- Popup de justification pour les erreurs rejetées -->
    <div
      v-if="justificationPopupVisible"
      :class="['justification-popup', { 'justification-popup-below': justificationPopupBelow }]"
      :style="{
        top: justificationPopupPosition.top + 'px',
        left: justificationPopupPosition.left + 'px',
      }"
      @click.stop
    >
      <div
        :class="[
          'justification-popup-header',
          'justification-header-' + typeToCSS(justificationPopupErrorType),
        ]"
      >
        <q-icon name="rate_review" size="sm" class="q-mr-sm" />
        <span>Justification du rejet</span>
        <q-btn
          flat
          round
          dense
          icon="close"
          size="sm"
          class="justification-close-btn"
          @click="hideJustificationPopup"
        />
      </div>
      <div class="justification-popup-content">
        <q-input
          v-model="justificationPopupText"
          outlined
          dense
          autofocus
          placeholder="Saisissez votre justification (optionnel)..."
          class="justification-input"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          @keydown.enter.prevent="saveJustification"
          @keydown.escape="cancelJustification"
        />
      </div>
      <div class="justification-popup-actions">
        <q-btn flat dense label="Annuler" color="grey" @click="cancelJustification" />
        <q-btn flat dense label="Valider" color="primary" @click="saveJustification" />
      </div>
    </div>

    <!-- Tutoriel interactif -->
    <InteractiveTutorial
      v-model="showTutorial"
      :is-error-selected="!!selectedErrorId"
      @spotlight-click="handleTutorialAction"
      @step-enter="handleTutorialAction"
    />
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, onUnmounted, onMounted, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import RuleDetailDialog from '../components/RuleDetailDialog.vue'
import NotesAuxCriteres from '../components/NotesAuxCriteres.vue'
import InteractiveTutorial from '../components/InteractiveTutorial.vue'
import { findRuleById } from '../services/rulesService'

export default defineComponent({
  name: 'TextViewer',

  components: {
    RuleDetailDialog,
    NotesAuxCriteres,
    InteractiveTutorial,
  },

  emits: ['analysis-loaded'],

  setup(_, { emit }) {
    const $q = useQuasar()

    // Note: textViewerRef n'est plus utilisé avec DefaultLayout
    const textViewerRef = null
    const selectedFileName = ref('')
    const fileOptions = ref([])
    const allFileOptions = ref([])
    const loadedFiles = ref([])
    const currentText = ref('')
    const zoom = ref(100)
    const analysisData = ref(null)
    const hoveredErrorId = ref(null)
    const selectedErrorId = ref(null) // ID de l'erreur sélectionnée dans le panneau
    const splitterModel = ref(65) // 65% pour le texte, 35% pour les erreurs
    const showHelpDialog = ref(false) // Dialogue d'aide
    const showTutorial = ref(false) // Tutoriel interactif
    const sortMode = ref('position') // 'type' ou 'position'
    const checkedErrors = ref(new Set()) // IDs des erreurs vérifiées
    const rejectedErrors = ref(new Set()) // IDs des erreurs rejetées
    const errorJustifications = ref({}) // Justifications des erreurs rejetées { errorId: string }
    const justificationPopupVisible = ref(false)
    const justificationPopupErrorId = ref(null)
    const justificationPopupText = ref('')
    const justificationPopupPosition = ref({ top: 0, left: 0 })
    const justificationPopupBelow = ref(false) // true si le popup est positionné en dessous
    const justificationPopupErrorType = ref('') // type d'erreur pour la couleur du header

    // Filtre de recherche pour les erreurs
    const searchFilter = ref('')

    // Dialog pour afficher les détails d'une règle
    const ruleDialogOpen = ref(false)
    const selectedRuleId = ref('')
    const selectedErrorText = ref('')
    const selectedErrorDescription = ref('')
    const selectedErrorSuggestions = ref([])
    const selectedErrorType = ref('')
    // Erreur à réafficher après fermeture de la dialogue (ouvert via F1)
    const errorToRestoreAfterDialog = ref(null)

    // Fonction pour obtenir le nom de la règle à partir de son ID
    const getRuleName = (ruleId) => {
      if (!ruleId) return ''
      const result = findRuleById(ruleId)
      return result?.rule?.nom || ''
    }

    // Fonction pour obtenir la description de la règle à partir de son ID
    const getRuleDescription = (ruleId) => {
      if (!ruleId) return ''
      const result = findRuleById(ruleId)
      return result?.rule?.description || ''
    }

    const openRuleDialog = (erreur) => {
      if (erreur && erreur.ruleApplied) {
        // Désélectionner l'erreur
        selectedErrorId.value = null

        // Cacher le popup s'il est visible
        const existingPopup = document.querySelector('.error-popup')
        if (existingPopup) {
          existingPopup.remove()
        }

        selectedRuleId.value = erreur.ruleApplied
        selectedErrorText.value = erreur.text || ''
        selectedErrorDescription.value = erreur.description || ''
        selectedErrorSuggestions.value = erreur.suggestions || []
        selectedErrorType.value = erreur.type || ''
        ruleDialogOpen.value = true
      }
    }

    // Calcul du nombre de mots (méthode similaire à Microsoft Word)
    const wordCount = computed(() => {
      if (!currentText.value) return 0

      const text = currentText.value

      // Normaliser le texte : remplacer les caractères spéciaux par des espaces
      // Microsoft Word compte les mots séparés par espaces, tirets, apostrophes, etc.
      const normalizedText = text
        // Remplacer les retours à la ligne par des espaces
        .replace(/[\r\n]+/g, ' ')
        // Remplacer les tirets (sauf ceux dans les mots composés) par des espaces
        .replace(/\s+-\s+/g, ' ')
        // Remplacer les tirets longs (em dash, en dash) par des espaces
        .replace(/[—–]/g, ' ')
        // Supprimer la ponctuation en fin de mot mais garder les apostrophes internes
        .replace(/[.,;:!?()[\]{}«»""''…]/g, ' ')
        // Normaliser les espaces multiples
        .replace(/\s+/g, ' ')
        .trim()

      if (!normalizedText) return 0

      // Compter les mots (séquences de caractères non-espaces)
      const words = normalizedText.split(' ').filter((word) => word.length > 0)

      return words.length
    })

    // Labels pour les types d'erreurs
    const typeLabels = {
      S: 'Syntaxe',
      P: 'Ponctuation',
      '« P »': 'Ponctuation (citation)',
      U: 'Usage',
      G: 'Grammaire',
      O: 'Orthographe',
      // Types non-comptés
      '(S)': 'Syntaxe (non-compté)',
      '(P)': 'Ponctuation (non-compté)',
      '(U)': 'Usage (non-compté)',
      '(u)': 'Usage (non-compté)',
      '-': 'Grammaire (non-compté)',
      _: 'Grammaire (non-compté)',
      Autre: 'Autre',
    }

    // Convertir le type en clé CSS valide (sans caractères spéciaux)
    const typeToCSS = (type) => {
      if (!type) return 'Autre'
      // « P » -> PC (Ponctuation Citation)
      if (type === '« P »') return 'PC'
      // Types non-comptés -> NC (gris)
      if (['(S)', '(P)', '(U)', '(u)', '-', '_'].includes(type)) return 'NC'
      return type
    }

    // Couleurs par type
    const getTypeColor = (type) => {
      const colors = {
        S: 'orange',
        P: 'green',
        '« P »': 'light-green',
        U: 'blue',
        G: 'red',
        O: 'teal',
      }
      return colors[type] || 'grey'
    }

    // Fonction pour trouver la position d'un texte en utilisant le contexte
    const findTextPosition = (text, error) => {
      const searchText = error.text
      const occurenceIndex = error.occurenceIndex || 0
      const wordBefore = error.wordBefore
      const wordAfter = error.wordAfter
      const paragraphIndex = error.paragraphIndex

      // Stratégie 1: Utiliser le contexte (wordBefore + searchText + wordAfter) pour trouver la position exacte
      if (wordBefore || wordAfter) {
        // Construire un pattern de contexte
        const beforePart = wordBefore
          ? wordBefore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*'
          : ''
        const afterPart = wordAfter ? '\\s*' + wordAfter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''
        const searchPart = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        try {
          const contextPattern = new RegExp(beforePart + '(' + searchPart + ')' + afterPart, 'g')
          let match
          let matchCount = 0

          while ((match = contextPattern.exec(text)) !== null) {
            if (matchCount === occurenceIndex) {
              // Retourner la position du groupe capturé (le searchText)
              return match.index + (wordBefore ? match[0].indexOf(match[1]) : 0)
            }
            matchCount++
          }
        } catch {
          // Si le regex échoue, continuer avec la stratégie 2
        }
      }

      // Stratégie 2: Utiliser paragraphIndex pour limiter la recherche
      if (paragraphIndex !== undefined && paragraphIndex >= 0) {
        // Diviser le texte en paragraphes (séparés par des lignes vides)
        const paragraphPattern = /\n\s*\n|\r\n\s*\r\n/g
        const paragraphs = []
        let lastIndex = 0
        let match

        while ((match = paragraphPattern.exec(text)) !== null) {
          paragraphs.push({
            content: text.slice(lastIndex, match.index),
            start: lastIndex,
          })
          lastIndex = match.index + match[0].length
        }
        // Ajouter le dernier paragraphe
        paragraphs.push({
          content: text.slice(lastIndex),
          start: lastIndex,
        })

        if (paragraphIndex < paragraphs.length) {
          const paragraph = paragraphs[paragraphIndex]
          let position = -1
          let count = 0
          let startIndex = 0

          while (count <= occurenceIndex) {
            position = paragraph.content.indexOf(searchText, startIndex)
            if (position === -1) break
            if (count === occurenceIndex) break
            startIndex = position + 1
            count++
          }

          if (position !== -1) {
            return paragraph.start + position
          }
        }
      }

      // Stratégie 3 (fallback): Recherche simple par occurenceIndex
      let position = -1
      let count = 0
      let startIndex = 0

      while (count <= occurenceIndex) {
        position = text.indexOf(searchText, startIndex)
        if (position === -1) break
        if (count === occurenceIndex) break
        startIndex = position + 1
        count++
      }

      return position === -1 ? Infinity : position
    }

    // Erreurs regroupées par type
    const erreursByType = computed(() => {
      if (!analysisData.value?.result) return {}

      const originalText = analysisData.value.result.originalText || ''
      const allErrorsList = []

      const c4 = analysisData.value.result.erreursCritere4 || []
      c4.forEach((err, idx) => {
        const position = findTextPosition(originalText, err)
        allErrorsList.push({ ...err, id: `c4-${idx}`, critere: 4, position })
      })

      const c5 = analysisData.value.result.erreursCritere5 || []
      c5.forEach((err, idx) => {
        const position = findTextPosition(originalText, err)
        allErrorsList.push({ ...err, id: `c5-${idx}`, critere: 5, position })
      })

      const grouped = {}
      const typeOrder = ['S', 'P', 'U', 'G', 'O']

      for (const type of typeOrder) {
        const errorsOfType = allErrorsList.filter((e) => e.type === type)
        if (errorsOfType.length > 0) {
          errorsOfType.sort((a, b) => a.position - b.position)
          grouped[type] = errorsOfType
        }
      }

      const unknownTypes = allErrorsList.filter((e) => !typeOrder.includes(e.type))
      if (unknownTypes.length > 0) {
        unknownTypes.sort((a, b) => a.position - b.position)
        grouped['Autre'] = unknownTypes
      }

      return grouped
    })

    // Nombre d'erreurs par critère
    const errorsCountC4 = computed(() => {
      return analysisData.value?.result?.erreursCritere4?.length || 0
    })

    const errorsCountC5 = computed(() => {
      return analysisData.value?.result?.erreursCritere5?.length || 0
    })

    // Scores formatés pour NotesAuxCriteres
    const scoresForDisplay = computed(() => {
      const result = analysisData.value?.result
      if (!result) return null
      return {
        critere4: {
          note: result.scoreCritere4?.note || '-',
          points: result.scoreCritere4?.pointsPerdus || 0,
          erreurs: result.erreursCritere4?.length || 0,
        },
        critere5: {
          note: result.scoreCritere5?.note || '-',
          points: result.scoreCritere5?.pointsPerdus || 0,
          erreurs: result.erreursCritere5?.length || 0,
        },
      }
    })

    // Erreurs triées par position
    const erreursByPosition = computed(() => {
      if (!analysisData.value?.result) return []

      const originalText = analysisData.value.result.originalText || ''
      const allErrorsList = []

      const c4 = analysisData.value.result.erreursCritere4 || []
      c4.forEach((err, idx) => {
        const position = findTextPosition(originalText, err)
        allErrorsList.push({ ...err, id: `c4-${idx}`, critere: 4, position })
      })

      const c5 = analysisData.value.result.erreursCritere5 || []
      c5.forEach((err, idx) => {
        const position = findTextPosition(originalText, err)
        allErrorsList.push({ ...err, id: `c5-${idx}`, critere: 5, position })
      })

      allErrorsList.sort((a, b) => a.position - b.position)
      return allErrorsList
    })

    // Fonction pour vérifier si une erreur correspond au filtre de recherche
    const errorMatchesFilter = (error, filter) => {
      if (!filter || filter.length < 4) return true
      const lowerFilter = filter.toLowerCase()
      // Chercher dans text, description et suggestions
      if (error.text?.toLowerCase().includes(lowerFilter)) return true
      if (error.description?.toLowerCase().includes(lowerFilter)) return true
      if (error.suggestions?.some((s) => s.toLowerCase().includes(lowerFilter))) return true
      return false
    }

    // Erreurs filtrées par type
    const filteredErreursByType = computed(() => {
      const filter = searchFilter.value
      if (!filter || filter.length < 4) return erreursByType.value

      const filtered = {}
      for (const [type, errors] of Object.entries(erreursByType.value)) {
        const matchingErrors = errors.filter((err) => errorMatchesFilter(err, filter))
        if (matchingErrors.length > 0) {
          filtered[type] = matchingErrors
        }
      }
      return filtered
    })

    // Erreurs filtrées par position
    const filteredErreursByPosition = computed(() => {
      const filter = searchFilter.value
      if (!filter || filter.length < 4) return erreursByPosition.value
      return erreursByPosition.value.filter((err) => errorMatchesFilter(err, filter))
    })

    // Nombre d'erreurs filtrées
    const filteredErrorsCount = computed(() => {
      const filter = searchFilter.value
      if (!filter || filter.length < 4) {
        return erreursByPosition.value.length
      }
      return filteredErreursByPosition.value.length
    })

    // Fonction pour mettre en surbrillance le terme recherché dans le texte
    const highlightSearchTerm = (text) => {
      if (!text) return ''
      const filter = searchFilter.value
      if (!filter || filter.length < 4) return text

      // Échapper les caractères spéciaux HTML d'abord
      const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      // Créer une regex insensible à la casse pour le terme de recherche
      const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(${escapedFilter})`, 'gi')

      // Remplacer par une version avec highlight
      return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>')
    }

    // Floating toolbar position and drag
    const floatingToolbar = ref(null)
    const toolbarPosition = ref({ x: 20, y: 70 })
    const isDragging = ref(false)
    const dragOffset = ref({ x: 0, y: 0 })

    const startDrag = (e) => {
      isDragging.value = true
      dragOffset.value = {
        x: e.clientX - toolbarPosition.value.x,
        y: e.clientY - toolbarPosition.value.y,
      }
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', stopDrag)
    }

    const onDrag = (e) => {
      if (!isDragging.value) return
      toolbarPosition.value = {
        x: Math.max(0, e.clientX - dragOffset.value.x),
        y: Math.max(50, e.clientY - dragOffset.value.y),
      }
    }

    const stopDrag = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', onDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    // Charger la liste des fichiers au démarrage
    const loadTextFiles = async () => {
      try {
        const files = []
        const modules = import.meta.glob('/src/finaux/*.txt', {
          query: '?raw',
          import: 'default',
          eager: true,
        })

        for (const [path, content] of Object.entries(modules)) {
          const fileName = path.split('/').pop()
          files.push({
            name: fileName,
            content: content,
          })
        }

        return files
      } catch (error) {
        console.error('Erreur lors du chargement des fichiers:', error)
        throw error
      }
    }

    const initFileList = async () => {
      try {
        const files = await loadTextFiles()
        loadedFiles.value = files
        files.sort((a, b) => a.name.localeCompare(b.name))
        const options = files.map((f) => ({
          label: f.name.replace('.txt', ''),
          value: f.name,
        }))
        fileOptions.value = options
        allFileOptions.value = options
        console.log(`${files.length} fichiers chargés pour le visualiseur`)

        // Charger le premier document par défaut
        if (files.length > 0) {
          selectedFileName.value = files[0].name
          await loadSelectedFile(files[0].name)
        }
      } catch (err) {
        console.error('Erreur lors du chargement de la liste des fichiers:', err)
      }
    }

    initFileList()

    // Filtre pour la recherche dans le dropdown
    const filterFiles = (val, update) => {
      if (val === '') {
        update(() => {
          fileOptions.value = allFileOptions.value
        })
        return
      }

      update(() => {
        const needle = val.toLowerCase()
        fileOptions.value = allFileOptions.value.filter((v) =>
          v.label.toLowerCase().includes(needle),
        )
      })
    }

    // Charger le fichier JSON d'analyse associé
    const loadAnalysisData = async (fileName) => {
      try {
        const baseName = fileName.replace('.txt', '')
        const jsonPath = `/resultats/${baseName}.json`
        const response = await fetch(jsonPath)
        if (response.ok) {
          const data = await response.json()
          analysisData.value = data
          emit('analysis-loaded', data)
          console.log(`Analyse chargée pour ${baseName}`)
        } else {
          analysisData.value = null
          emit('analysis-loaded', null)
          console.log(`Pas d'analyse trouvée pour ${baseName}`)
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'analyse:", error)
        analysisData.value = null
        emit('analysis-loaded', null)
      }
    }

    // Charger le fichier sélectionné
    const loadSelectedFile = async (fileName) => {
      // Fermer la dialogue si elle est ouverte
      ruleDialogOpen.value = false
      // Réinitialiser la sélection d'erreur
      selectedErrorId.value = null

      const file = loadedFiles.value.find((f) => f.name === fileName)
      if (file) {
        currentText.value = file.content
        // Charger également les données d'analyse
        await loadAnalysisData(fileName)

        // Remonter le scroll à 0 après le rendu du contenu
        await nextTick()
        setTimeout(() => {
          const scrollContainer = document.querySelector('.document-container')
          if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'instant' })
          }
          // Aussi scroller la page au début
          const docPage = document.querySelector('.document-page')
          if (docPage) {
            docPage.scrollIntoView({ block: 'start', behavior: 'instant' })
          }
        }, 150)

        // Afficher une notification
        $q.notify({
          type: 'positive',
          message: `Document "${fileName.replace('.txt', '')}" chargé`,
          position: 'top',
          timeout: 2000,
        })
      } else {
        currentText.value = ''
        emit('analysis-loaded', null)
      }
    }

    // Fonction pour échapper les caractères spéciaux regex
    const escapeRegex = (str) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    // Fonction pour basculer l'état checked d'une erreur
    const toggleErrorChecked = (errorId) => {
      if (checkedErrors.value.has(errorId)) {
        checkedErrors.value.delete(errorId)
      } else {
        checkedErrors.value.add(errorId)
        // Retirer de rejected si on marque comme checked
        rejectedErrors.value.delete(errorId)
        rejectedErrors.value = new Set(rejectedErrors.value)
      }
      // Forcer la réactivité en créant un nouveau Set
      checkedErrors.value = new Set(checkedErrors.value)
    }

    // Vérifier si une erreur est checked
    const isErrorChecked = (errorId) => {
      return checkedErrors.value.has(errorId)
    }

    // Fonction pour basculer l'état rejected d'une erreur
    const toggleErrorRejected = (errorId) => {
      if (rejectedErrors.value.has(errorId)) {
        rejectedErrors.value.delete(errorId)
        // Supprimer la justification quand on retire le rejet
        delete errorJustifications.value[errorId]
        errorJustifications.value = { ...errorJustifications.value }
      } else {
        rejectedErrors.value.add(errorId)
        // Retirer de checked si on marque comme rejected
        checkedErrors.value.delete(errorId)
        checkedErrors.value = new Set(checkedErrors.value)
      }
      // Forcer la réactivité en créant un nouveau Set
      rejectedErrors.value = new Set(rejectedErrors.value)
    }

    // Vérifier si une erreur est rejected
    const isErrorRejected = (errorId) => {
      return rejectedErrors.value.has(errorId)
    }

    // Réinitialiser tous les états des erreurs (checked et rejected)
    const resetErrorStates = () => {
      checkedErrors.value = new Set()
      rejectedErrors.value = new Set()
      errorJustifications.value = {}
      selectedErrorId.value = null
      updateErrorClasses()
    }

    // Fonctions pour le popup de justification
    const showJustificationPopup = (errorIds, position, isBelow = false, errorType = '') => {
      // Charger la justification existante si elle existe (prendre la première erreur)
      const firstErrorId = errorIds.split(',')[0]
      justificationPopupText.value = errorJustifications.value[firstErrorId] || ''
      justificationPopupErrorId.value = errorIds
      justificationPopupPosition.value = position
      justificationPopupBelow.value = isBelow
      justificationPopupErrorType.value = errorType
      justificationPopupVisible.value = true
    }

    const hideJustificationPopup = () => {
      justificationPopupVisible.value = false
      justificationPopupErrorId.value = null
      justificationPopupText.value = ''
    }

    const saveJustification = () => {
      if (justificationPopupErrorId.value) {
        const errorIds = justificationPopupErrorId.value.split(',')
        // Sauvegarder la justification pour toutes les erreurs du span
        errorIds.forEach((errorId) => {
          if (justificationPopupText.value.trim()) {
            errorJustifications.value[errorId] = justificationPopupText.value.trim()
          } else {
            delete errorJustifications.value[errorId]
          }
        })
        // Forcer la réactivité
        errorJustifications.value = { ...errorJustifications.value }
      }
      hideJustificationPopup()
      // Passer à l'erreur suivante (avant clearHighlight pour garder la référence)
      navigateErrors('down')
    }

    const cancelJustification = () => {
      if (justificationPopupErrorId.value) {
        const errorIds = justificationPopupErrorId.value.split(',')
        // Annuler le rejet (retirer de rejectedErrors)
        errorIds.forEach((errorId) => {
          rejectedErrors.value.delete(errorId)
        })
        // Forcer la réactivité
        rejectedErrors.value = new Set(rejectedErrors.value)
        // Mettre à jour les classes sur les spans
        updateErrorClasses()
      }
      hideJustificationPopup()
      // Passer à l'erreur suivante (avant clearHighlight pour garder la référence)
      navigateErrors('down')
    }

    const getJustification = (errorId) => {
      return errorJustifications.value[errorId] || ''
    }

    // Mettre à jour les classes error-checked et error-rejected sur les spans (sans recréer le HTML)
    const updateErrorClasses = () => {
      const errorSpans = document.querySelectorAll('.error-highlight[data-error-ids]')
      errorSpans.forEach((span) => {
        const errorIds = span.getAttribute('data-error-ids')
        const ids = errorIds.split(',')
        const allChecked = ids.every((id) => checkedErrors.value.has(id))
        const allRejected = ids.every((id) => rejectedErrors.value.has(id))

        if (allChecked) {
          span.classList.add('error-checked')
        } else {
          span.classList.remove('error-checked')
        }

        if (allRejected) {
          span.classList.add('error-rejected')
        } else {
          span.classList.remove('error-rejected')
        }
      })
    }

    // Collecter toutes les erreurs avec leur type
    const allErrors = computed(() => {
      if (!analysisData.value?.result) return []
      const errors = []
      const c4 = analysisData.value.result.erreursCritere4 || []
      const c5 = analysisData.value.result.erreursCritere5 || []
      c4.forEach((err, idx) => {
        errors.push({ ...err, id: `c4-${idx}` })
      })
      c5.forEach((err, idx) => {
        errors.push({ ...err, id: `c5-${idx}` })
      })
      // Trier par longueur décroissante pour éviter les chevauchements
      return errors.sort((a, b) => b.text.length - a.text.length)
    })

    // Fonction pour trouver l'erreur en utilisant le contexte (wordBefore, wordAfter, paragraphIndex)
    const findErrorWithContext = (text, error, paragraphs) => {
      const { wordBefore, wordAfter, paragraphIndex } = error
      const errorText = error.text

      // Construire le pattern de recherche avec le contexte
      // On échappe les caractères spéciaux regex
      const escapedError = escapeRegex(errorText)
      const escapedBefore = wordBefore ? escapeRegex(wordBefore) : null
      const escapedAfter = wordAfter ? escapeRegex(wordAfter) : null

      // Si on a un paragraphIndex, calculer l'offset du début du paragraphe
      let searchStart = 0
      let searchEnd = text.length
      if (
        paragraphIndex !== undefined &&
        paragraphIndex !== null &&
        paragraphs &&
        paragraphs.length > paragraphIndex
      ) {
        // Trouver la position du paragraphe dans le texte
        let currentPos = 0
        for (let i = 0; i < paragraphIndex; i++) {
          const paraText = paragraphs[i]?.text || ''
          const paraIndex = text.indexOf(paraText, currentPos)
          if (paraIndex !== -1) {
            currentPos = paraIndex + paraText.length
          }
        }
        searchStart = currentPos
        // Trouver la fin du paragraphe courant
        const currentParaText = paragraphs[paragraphIndex]?.text || ''
        const paraStartIndex = text.indexOf(currentParaText, searchStart)
        if (paraStartIndex !== -1) {
          searchStart = paraStartIndex
          searchEnd = paraStartIndex + currentParaText.length
        }
      }

      // Construire le pattern avec contexte
      let pattern
      if (escapedBefore && escapedAfter) {
        // Contexte complet : wordBefore + erreur + wordAfter
        pattern = new RegExp(`${escapedBefore}\\s*${escapedError}\\s*${escapedAfter}`, 'g')
      } else if (escapedBefore) {
        // Seulement wordBefore
        pattern = new RegExp(`${escapedBefore}\\s*${escapedError}`, 'g')
      } else if (escapedAfter) {
        // Seulement wordAfter
        pattern = new RegExp(`${escapedError}\\s*${escapedAfter}`, 'g')
      } else {
        return null // Pas de contexte, utiliser la méthode classique
      }

      // Chercher dans la zone délimitée
      const searchText = text.substring(searchStart, searchEnd)
      const match = pattern.exec(searchText)

      if (match) {
        // Calculer la position exacte de l'erreur dans le match
        const fullMatch = match[0]
        let errorStartInMatch = 0
        if (escapedBefore) {
          // Trouver où commence l'erreur après wordBefore
          const beforeMatch = fullMatch.match(new RegExp(`^${escapedBefore}\\s*`))
          if (beforeMatch) {
            errorStartInMatch = beforeMatch[0].length
          }
        }
        const absoluteStart = searchStart + match.index + errorStartInMatch
        return {
          start: absoluteStart,
          end: absoluteStart + errorText.length,
        }
      }

      return null
    }

    // Formater le texte avec des paragraphes HTML et marquer les erreurs
    const formattedText = computed(() => {
      if (!currentText.value) return ''

      let text = currentText.value

      // Récupérer les paragraphes pour le positionnement contextuel
      const analysisParagraphs = analysisData.value?.result?.paragraphs || []

      // Marquer les erreurs dans le texte
      const errors = allErrors.value
      const markers = [] // { start, end, error }

      // Trouver toutes les occurrences de chaque erreur
      for (const error of errors) {
        const hasContextInfo =
          error.wordBefore !== undefined ||
          error.wordAfter !== undefined ||
          error.paragraphIndex !== undefined

        // Essayer d'abord avec le contexte si disponible
        if (hasContextInfo) {
          const contextMatch = findErrorWithContext(text, error, analysisParagraphs)
          if (contextMatch) {
            markers.push({
              start: contextMatch.start,
              end: contextMatch.end,
              error: error,
            })
            continue // Passer à l'erreur suivante
          }
        }

        // Fallback : méthode classique avec occurenceIndex
        const regex = new RegExp(escapeRegex(error.text), 'g')
        let match
        const occurenceIndex = error.occurenceIndex || 0

        // Si occurenceIndex est grand (> 10), c'est probablement une position dans le texte
        // Sinon, c'est l'index de l'occurrence (0, 1, 2...)
        if (occurenceIndex > 10) {
          // Utiliser comme position approximative dans le texte
          // Chercher l'occurrence la plus proche de cette position
          let bestMatch = null
          let bestDistance = Infinity
          while ((match = regex.exec(text)) !== null) {
            const distance = Math.abs(match.index - occurenceIndex)
            if (distance < bestDistance) {
              bestDistance = distance
              bestMatch = { index: match.index, length: error.text.length }
            }
          }
          if (bestMatch) {
            markers.push({
              start: bestMatch.index,
              end: bestMatch.index + bestMatch.length,
              error: error,
            })
          }
        } else {
          // Utiliser comme index d'occurrence (comportement original)
          let occurrenceCount = 0
          while ((match = regex.exec(text)) !== null) {
            if (occurrenceCount === occurenceIndex) {
              markers.push({
                start: match.index,
                end: match.index + error.text.length,
                error: error,
              })
              break
            }
            occurrenceCount++
          }
        }
      }

      // Trier par position (début) puis par longueur décroissante
      markers.sort((a, b) => a.start - b.start || b.end - a.end)

      // Fusionner les markers qui se chevauchent en gardant toutes les erreurs
      const mergedMarkers = []
      for (const marker of markers) {
        // Chercher un marker existant qui chevauche celui-ci
        const overlappingIndex = mergedMarkers.findIndex(
          (m) => !(marker.end <= m.start || marker.start >= m.end),
        )

        if (overlappingIndex === -1) {
          // Pas de chevauchement, ajouter comme nouveau marker avec un tableau d'erreurs
          mergedMarkers.push({
            start: marker.start,
            end: marker.end,
            errors: [marker.error],
          })
        } else {
          // Chevauchement trouvé, fusionner les erreurs et étendre la zone si nécessaire
          const existing = mergedMarkers[overlappingIndex]
          existing.errors.push(marker.error)
          // Étendre la zone pour couvrir les deux markers
          existing.start = Math.min(existing.start, marker.start)
          existing.end = Math.max(existing.end, marker.end)
        }
      }

      // Trier par position (fin vers début pour ne pas décaler les indices lors de l'insertion)
      mergedMarkers.sort((a, b) => b.start - a.start)

      // Appliquer les marqueurs
      for (const marker of mergedMarkers) {
        const before = text.slice(0, marker.start)
        const errorText = text.slice(marker.start, marker.end)
        const after = text.slice(marker.end)

        // Collecter tous les IDs et types d'erreurs (normalisés)
        const errorIds = marker.errors.map((e) => e.id).join(',')
        const errorTypes = [...new Set(marker.errors.map((e) => typeToCSS(e.type)))]
        const primaryType = errorTypes[0] // Type principal pour le style
        const errorCount = marker.errors.length

        // Badge si plusieurs erreurs
        const badge = errorCount > 1 ? `<span class="error-count-badge">${errorCount}</span>` : ''

        // Note: la classe error-checked est gérée dynamiquement via updateCheckedClasses()
        text =
          before +
          `<span class="error-highlight error-highlight-${primaryType}${errorTypes.length > 1 ? ' error-highlight-multi' : ''}" data-error-ids="${errorIds}" data-error-count="${errorCount}">${errorText}${badge}</span>` +
          after
      }

      // Convertir les retours à la ligne en paragraphes
      const paragraphs = text
        .split(/\n\n+/)
        .filter((p) => p.trim())
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('')

      return paragraphs
    })

    // Méthode pour highlighter une erreur (appelée depuis le parent)
    let blinkTimeout = null
    let popupScrollTimeout = null
    let popupFallbackTimeout = null
    let currentScrollEndHandler = null
    let currentScrollContainer = null

    const highlightError = (errorId, errorType, errorData = null) => {
      // Convertir le type en clé CSS valide
      const cssType = typeToCSS(errorType)

      // Annuler tout scintillement en cours
      if (blinkTimeout) {
        clearTimeout(blinkTimeout)
        blinkTimeout = null
      }

      // Annuler tout timeout de popup en cours (navigation rapide)
      if (popupScrollTimeout) {
        clearTimeout(popupScrollTimeout)
        popupScrollTimeout = null
      }
      if (popupFallbackTimeout) {
        clearTimeout(popupFallbackTimeout)
        popupFallbackTimeout = null
      }
      if (currentScrollEndHandler && currentScrollContainer) {
        currentScrollContainer.removeEventListener('scroll', currentScrollEndHandler)
        currentScrollEndHandler = null
        currentScrollContainer = null
      }

      // Supprimer tout popup existant
      const existingPopup = document.querySelector('.error-popup')
      if (existingPopup) {
        existingPopup.remove()
      }

      hoveredErrorId.value = errorId
      // Nettoyer les anciens highlights
      const allSpans = document.querySelectorAll('.error-highlight')
      allSpans.forEach((span) => {
        span.classList.remove(
          'error-active',
          'error-active-S',
          'error-active-P',
          'error-active-PC',
          'error-active-U',
          'error-active-G',
          'error-active-O',
          'error-active-NC',
        )
      })

      if (errorId) {
        // Chercher le span qui contient cet errorId (peut être dans data-error-ids avec d'autres)
        const span = document.querySelector(`[data-error-ids*="${errorId}"]`)
        if (span) {
          // Fonction pour créer et afficher le popup
          const showPopup = () => {
            if (errorData) {
              // Supprimer tout popup existant (au cas où)
              const existingPopup = document.querySelector('.error-popup')
              if (existingPopup) {
                existingPopup.remove()
              }

              const popup = document.createElement('div')
              popup.className = `error-popup error-popup-${cssType}`

              // Vérifier si l'erreur est checked ou rejected
              const isChecked = checkedErrors.value.has(errorData.id)
              const isRejected = rejectedErrors.value.has(errorData.id)
              const rejectedIcon = isRejected
                ? '<span class="error-popup-rejected"><span class="material-icons" style="color: #ef9a9a; font-size: 20px;">cancel</span></span>'
                : ''
              const checkIcon = isChecked
                ? '<span class="error-popup-check"><span class="material-icons" style="color: #4caf50; font-size: 20px;">check_circle</span></span>'
                : ''

              // Construire la ligne de règle si disponible
              const ruleName = getRuleName(errorData.ruleApplied)
              const ruleDescription = getRuleDescription(errorData.ruleApplied)
              const ruleInfo = errorData.ruleApplied
                ? `<div class="error-popup-rule">
                    <span class="error-popup-rule-id">${errorData.ruleApplied}</span>
                    <span class="error-popup-rule-name">${ruleName}</span>
                  </div>`
                : ''

              let popupContent = `
                ${ruleInfo}
                <div class="error-popup-header">
                  <span class="error-popup-type">${errorType}</span>
                  <span class="error-popup-label">${typeLabels[errorType] || errorType}</span>
                  ${rejectedIcon}${checkIcon}
                </div>
                <div class="error-popup-description">${errorData.description || ruleDescription}</div>
              `

              if (errorData.suggestions?.length) {
                popupContent += `
                  <div class="error-popup-suggestions">
                    <span class="error-popup-suggestion-label">Suggestion:</span>
                    ${errorData.suggestions.map((s) => `<span class="error-popup-suggestion">${s}</span>`).join('')}
                  </div>
                `
              }

              // Afficher la justification si elle existe et si l'erreur est rejetée
              const justification = errorJustifications.value[errorData.id]
              if (isRejected && justification) {
                popupContent += `
                  <div class="error-popup-justification">
                    <span class="material-icons" style="color: #ff9800; font-size: 16px; margin-right: 6px;">rate_review</span>
                    <span class="error-popup-justification-text">${justification}</span>
                  </div>
                `
              }

              popup.innerHTML = popupContent
              document.body.appendChild(popup)

              // Positionner le popup au-dessus du span
              const spanRect = span.getBoundingClientRect()
              const popupRect = popup.getBoundingClientRect()

              let left = spanRect.left + spanRect.width / 2 - popupRect.width / 2
              let top = spanRect.top - popupRect.height - 25

              // Ajuster si le popup dépasse à gauche
              if (left < 10) left = 10
              // Ajuster si le popup dépasse à droite
              if (left + popupRect.width > window.innerWidth - 10) {
                left = window.innerWidth - popupRect.width - 10
              }
              // Si pas assez de place en haut, afficher en bas
              if (top < 10) {
                top = spanRect.bottom + 10
                popup.classList.add('error-popup-below')
              }

              popup.style.left = `${left}px`
              popup.style.top = `${top}px`
              popup.style.opacity = '1'
            }
          }

          // Scroller vers l'erreur si pas visible dans le viewport
          const scrollContainer = document.querySelector('.document-container')

          console.log('=== DEBUG SCROLL ===')
          console.log('scrollContainer trouvé:', !!scrollContainer)

          if (scrollContainer) {
            const spanRect = span.getBoundingClientRect()
            const viewportHeight = window.innerHeight

            console.log('spanRect:', {
              top: spanRect.top,
              bottom: spanRect.bottom,
            })
            console.log('viewportHeight:', viewportHeight)

            // Vérifier si le span est visible dans le viewport (pas dans le conteneur)
            const margin = 100
            const isVisible = spanRect.top >= margin && spanRect.bottom <= viewportHeight - margin

            console.log('margin:', margin)
            console.log('isVisible:', isVisible)
            console.log(
              'spanRect.top >= margin:',
              spanRect.top,
              '>=',
              margin,
              '=',
              spanRect.top >= margin,
            )
            console.log(
              'spanRect.bottom <= viewportHeight - margin:',
              spanRect.bottom,
              '<=',
              viewportHeight - margin,
              '=',
              spanRect.bottom <= viewportHeight - margin,
            )

            if (!isVisible) {
              console.log('SCROLL NECESSAIRE - appel de scrollIntoView')

              // Utiliser scrollIntoView pour un scroll fiable
              span.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })

              // Attendre la fin du scroll puis afficher le popup
              // Stocker le container et le handler pour pouvoir les annuler
              currentScrollContainer = scrollContainer
              const onScrollEnd = () => {
                if (popupScrollTimeout) clearTimeout(popupScrollTimeout)
                popupScrollTimeout = setTimeout(() => {
                  if (currentScrollContainer) {
                    currentScrollContainer.removeEventListener('scroll', onScrollEnd)
                  }
                  currentScrollEndHandler = null
                  currentScrollContainer = null
                  console.log('Scroll terminé - affichage du popup')
                  showPopup()
                }, 150) // 150ms sans scroll = scroll terminé
              }
              currentScrollEndHandler = onScrollEnd

              scrollContainer.addEventListener('scroll', onScrollEnd)
              // Fallback si le scroll ne se déclenche pas (élément déjà proche)
              popupFallbackTimeout = setTimeout(() => {
                if (currentScrollContainer) {
                  currentScrollContainer.removeEventListener('scroll', onScrollEnd)
                }
                if (popupScrollTimeout) clearTimeout(popupScrollTimeout)
                popupScrollTimeout = null
                currentScrollEndHandler = null
                currentScrollContainer = null
                showPopup()
              }, 800)
            } else {
              console.log('PAS DE SCROLL - erreur déjà visible')
              showPopup()
            }
          }

          // Appliquer le highlight (sauf si checked)
          const isChecked = span.classList.contains('error-checked')
          if (!isChecked) {
            span.classList.add('error-active', `error-active-${cssType}`)
          }
        }
      }
    }

    const clearHighlight = () => {
      // Annuler tout scintillement en cours
      if (blinkTimeout) {
        clearTimeout(blinkTimeout)
        blinkTimeout = null
      }

      // Supprimer le popup
      const existingPopup = document.querySelector('.error-popup')
      if (existingPopup) {
        existingPopup.remove()
      }

      hoveredErrorId.value = null
      selectedErrorId.value = null
      const allSpans = document.querySelectorAll('.error-highlight')
      allSpans.forEach((span) => {
        span.classList.remove(
          'error-active',
          'error-active-S',
          'error-active-P',
          'error-active-PC',
          'error-active-U',
          'error-active-G',
          'error-active-O',
          'error-active-NC',
        )
      })
    }

    // Méthode pour highlighter plusieurs erreurs (depuis le texte)
    const highlightErrorMultiple = (errorIds, errors) => {
      // Si le popup affiche déjà ces erreurs, ne rien faire (éviter le blink)
      if (hoveredErrorId.value === errorIds) {
        const existingPopup = document.querySelector('.error-popup')
        if (existingPopup) {
          return // Le popup est déjà affiché pour ces erreurs
        }
      }

      // Annuler tout timeout en cours
      if (blinkTimeout) {
        clearTimeout(blinkTimeout)
        blinkTimeout = null
      }

      // Supprimer tout popup existant
      const existingPopup = document.querySelector('.error-popup')
      if (existingPopup) {
        existingPopup.remove()
      }

      hoveredErrorId.value = errorIds
      // Nettoyer les anciens highlights
      const allSpans = document.querySelectorAll('.error-highlight')
      allSpans.forEach((span) => {
        span.classList.remove(
          'error-active',
          'error-active-S',
          'error-active-P',
          'error-active-PC',
          'error-active-U',
          'error-active-G',
          'error-active-O',
          'error-active-NC',
        )
      })

      if (errors.length > 0) {
        const span = document.querySelector(`[data-error-ids="${errorIds}"]`)
        if (span) {
          const primaryType = typeToCSS(errors[0].type)

          // Fonction pour créer et afficher le popup avec toutes les erreurs
          const showPopup = () => {
            const existingPopup = document.querySelector('.error-popup')
            if (existingPopup) {
              existingPopup.remove()
            }

            const popup = document.createElement('div')
            // Utiliser error-popup-multi seulement s'il y a plusieurs erreurs
            popup.className =
              errors.length > 1
                ? 'error-popup error-popup-multi'
                : `error-popup error-popup-${primaryType}`

            let popupContent = ''
            const isMulti = errors.length > 1

            // Afficher chaque erreur
            errors.forEach((errorData, index) => {
              if (index > 0) {
                popupContent += '<div class="error-popup-separator"></div>'
              }

              // Utiliser error-popup-item seulement pour multi-erreurs
              const cssType = typeToCSS(errorData.type)
              const itemClass = isMulti ? `error-popup-item error-popup-${cssType}` : ''
              const openTag = isMulti ? `<div class="${itemClass}">` : ''
              const closeTag = isMulti ? '</div>' : ''

              // Vérifier si l'erreur est checked ou rejected
              const isChecked = checkedErrors.value.has(errorData.id)
              const isRejected = rejectedErrors.value.has(errorData.id)
              const rejectedIcon = isRejected
                ? '<span class="error-popup-rejected"><span class="material-icons" style="color: #ef9a9a; font-size: 20px;">cancel</span></span>'
                : ''
              const checkIcon = isChecked
                ? '<span class="error-popup-check"><span class="material-icons" style="color: #4caf50; font-size: 20px;">check_circle</span></span>'
                : ''

              // Construire la ligne de règle si disponible
              const ruleName = getRuleName(errorData.ruleApplied)
              const ruleDescription = getRuleDescription(errorData.ruleApplied)
              const ruleInfo = errorData.ruleApplied
                ? `<div class="error-popup-rule">
                    <span class="error-popup-rule-id">${errorData.ruleApplied}</span>
                    <span class="error-popup-rule-name">${ruleName}</span>
                  </div>`
                : ''

              popupContent += `
                ${openTag}
                  ${ruleInfo}
                  <div class="error-popup-header">
                    <span class="error-popup-type">${errorData.type}</span>
                    <span class="error-popup-label">${typeLabels[errorData.type] || errorData.type}</span>
                    ${rejectedIcon}${checkIcon}
                  </div>
                  <div class="error-popup-description">${errorData.description || ruleDescription}</div>
              `

              if (errorData.suggestions?.length) {
                popupContent += `
                  <div class="error-popup-suggestions">
                    <span class="error-popup-suggestion-label">Suggestion:</span>
                    ${errorData.suggestions.map((s) => `<span class="error-popup-suggestion">${s}</span>`).join('')}
                  </div>
                `
              }

              // Afficher la justification si elle existe et si l'erreur est rejetée
              const justification = errorJustifications.value[errorData.id]
              if (isRejected && justification) {
                popupContent += `
                  <div class="error-popup-justification">
                    <span class="material-icons" style="color: #ff9800; font-size: 16px; margin-right: 6px;">rate_review</span>
                    <span class="error-popup-justification-text">${justification}</span>
                  </div>
                `
              }

              popupContent += closeTag
            })

            popup.innerHTML = popupContent
            document.body.appendChild(popup)

            // Positionner le popup au-dessus du span
            const spanRect = span.getBoundingClientRect()
            const popupRect = popup.getBoundingClientRect()

            let left = spanRect.left + spanRect.width / 2 - popupRect.width / 2
            let top = spanRect.top - popupRect.height - 25

            if (left < 10) left = 10
            if (left + popupRect.width > window.innerWidth - 10) {
              left = window.innerWidth - popupRect.width - 10
            }
            if (top < 10) {
              top = spanRect.bottom + 10
              popup.classList.add('error-popup-below')
            }

            popup.style.left = `${left}px`
            popup.style.top = `${top}px`
            popup.style.opacity = '1'
          }

          showPopup()

          // Appliquer le highlight (sauf si checked)
          const isChecked = span.classList.contains('error-checked')
          if (!isChecked) {
            span.classList.add('error-active', `error-active-${primaryType}`)
          }
        }
      }
    }

    // Contrôles du zoom
    const zoomIn = () => {
      if (zoom.value < 200) {
        zoom.value += 10
      }
    }

    const zoomOut = () => {
      if (zoom.value > 50) {
        zoom.value -= 10
      }
    }

    const resetZoom = () => {
      zoom.value = 100
    }

    // Gestionnaire de clic pour les erreurs dans le panneau
    const onErrorClick = (erreur) => {
      // Fermer la dialogue de règle si elle est ouverte
      ruleDialogOpen.value = false

      // Si on clique sur l'erreur déjà sélectionnée, on la désélectionne
      if (selectedErrorId.value === erreur.id) {
        selectedErrorId.value = null
        clearHighlight()
      } else {
        // Sélectionner la nouvelle erreur
        selectedErrorId.value = erreur.id
        highlightError(erreur.id, erreur.type, erreur)
      }
    }

    // Fonction pour vérifier si une erreur est sélectionnée
    const isErrorSelected = (errorId) => {
      return selectedErrorId.value === errorId
    }

    // Gestionnaire des actions du tutoriel (clic sur spotlight)
    const handleTutorialAction = (action) => {
      if (action === 'selectFirstError') {
        // D'abord désélectionner toute erreur existante
        if (selectedErrorId.value) {
          selectedErrorId.value = null
          clearHighlight()
        }

        // Sélectionner la première erreur de la liste
        const errorsList =
          sortMode.value === 'position'
            ? filteredErreursByPosition.value
            : Object.values(filteredErreursByType.value).flat()

        if (errorsList.length > 0) {
          const firstError = errorsList[0]
          // Sélectionner directement (pas toggle)
          selectedErrorId.value = firstError.id
          highlightError(firstError.id, firstError.type, firstError)
        }
      } else if (action === 'deselectError') {
        // Désélectionner l'erreur courante
        if (selectedErrorId.value) {
          selectedErrorId.value = null
          clearHighlight()
        }
      }
    }

    // Fonction pour obtenir la liste plate des erreurs visibles (selon le mode de tri)
    const getVisibleErrorsList = () => {
      if (sortMode.value === 'position') {
        return filteredErreursByPosition.value
      } else {
        // Mode par type : aplatir la structure groupée
        const errors = []
        for (const [, erreurs] of Object.entries(filteredErreursByType.value)) {
          errors.push(...erreurs)
        }
        return errors
      }
    }

    // Navigation au clavier dans la liste des erreurs
    const navigateErrors = (direction) => {
      const errorsList = getVisibleErrorsList()
      if (errorsList.length === 0) return

      // Si aucune erreur sélectionnée, sélectionner la première (bas) ou la dernière (haut)
      if (!selectedErrorId.value) {
        const targetError = direction === 'down' ? errorsList[0] : errorsList[errorsList.length - 1]
        selectedErrorId.value = targetError.id
        highlightError(targetError.id, targetError.type, targetError)
        scrollToErrorCard()
        return
      }

      // Trouver l'index de l'erreur actuellement sélectionnée
      const currentIndex = errorsList.findIndex((err) => err.id === selectedErrorId.value)
      if (currentIndex === -1) {
        // L'erreur sélectionnée n'est plus dans la liste visible, sélectionner la première
        const targetError = errorsList[0]
        selectedErrorId.value = targetError.id
        highlightError(targetError.id, targetError.type, targetError)
        scrollToErrorCard()
        return
      }

      // Calculer le nouvel index
      let newIndex
      if (direction === 'down') {
        newIndex = currentIndex + 1
        if (newIndex >= errorsList.length) newIndex = 0 // Boucler au début
      } else {
        newIndex = currentIndex - 1
        if (newIndex < 0) newIndex = errorsList.length - 1 // Boucler à la fin
      }

      // Sélectionner la nouvelle erreur
      const targetError = errorsList[newIndex]
      selectedErrorId.value = targetError.id
      highlightError(targetError.id, targetError.type, targetError)
      scrollToErrorCard(direction)
    }

    // Fonction pour scroller vers la carte d'erreur dans le panneau
    const scrollToErrorCard = () => {
      nextTick(() => {
        const errorCard = document.querySelector('.error-card-selected')
        if (errorCard) {
          // Centrer la carte pour bien voir la sélection complète
          errorCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }

    // Fonction pour trouver plusieurs erreurs par leurs IDs
    const findErrorsByIds = (errorIds) => {
      const ids = errorIds.split(',')
      const allErrorsList = allErrors.value
      return ids.map((id) => allErrorsList.find((err) => err.id === id)).filter(Boolean)
    }

    // Attacher les listeners de hover aux erreurs dans le texte
    const attachTextErrorListeners = () => {
      const errorSpans = document.querySelectorAll('.error-highlight[data-error-ids]')
      errorSpans.forEach((span) => {
        const errorIds = span.getAttribute('data-error-ids')
        const errors = findErrorsByIds(errorIds)

        if (errors.length > 0) {
          span.addEventListener('mouseenter', () => {
            // Si le popup de justification est visible et qu'on survole une autre erreur, le fermer
            if (justificationPopupVisible.value && justificationPopupErrorId.value !== errorIds) {
              hideJustificationPopup()
            }
            highlightErrorMultiple(errorIds, errors)
          })
          span.addEventListener('mouseleave', () => {
            // Ne pas fermer le popup si le popup de justification est visible
            if (!justificationPopupVisible.value) {
              clearHighlight()
            }
          })
          // Left-click pour basculer l'état checked
          span.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()

            // Basculer l'état checked de toutes les erreurs de ce span
            errors.forEach((error) => {
              toggleErrorChecked(error.id)
            })

            // Mettre à jour les classes sur le span
            updateErrorClasses()

            // Fermer le popup de justification s'il est ouvert
            hideJustificationPopup()

            // Fermer le popup d'erreur
            clearHighlight()
          })
          // Right-click pour basculer l'état rejected et afficher le popup de justification
          span.addEventListener('contextmenu', (e) => {
            e.preventDefault()
            e.stopPropagation()

            // Basculer l'état rejected de toutes les erreurs de ce span
            errors.forEach((error) => {
              toggleErrorRejected(error.id)
            })

            // Mettre à jour les classes sur le span
            updateErrorClasses()

            // S'assurer que le popup d'erreur est affiché (le recréer s'il a été fermé)
            let popupForPosition = document.querySelector('.error-popup')
            if (!popupForPosition) {
              // Recréer le popup d'erreur
              highlightErrorMultiple(errorIds, errors)
              popupForPosition = document.querySelector('.error-popup')
            }

            // Vérifier si l'erreur est maintenant rejetée (après le toggle)
            const isNowRejected = errors.some((error) => rejectedErrors.value.has(error.id))

            // Afficher le popup de justification uniquement si on vient de rejeter (pas de dé-rejeter)
            if (isNowRejected) {
              // Obtenir le type d'erreur pour la couleur du header
              const errorType = errors[0]?.type || ''
              // Hauteur estimée du popup de justification (header + input + actions)
              const justificationPopupHeight = 120
              // Position du span (erreur)
              const spanRect = span.getBoundingClientRect()

              // Calculer la position du popup de justification (relatif au popup d'erreur existant)
              if (popupForPosition) {
                const popupRect = popupForPosition.getBoundingClientRect()
                const isPopupBelow = popupForPosition.classList.contains('error-popup-below')

                if (isPopupBelow) {
                  // Le popup d'erreur est en dessous de l'erreur, afficher la justification en dessous du popup
                  showJustificationPopup(
                    errorIds,
                    {
                      top: popupRect.bottom + 10,
                      left: popupRect.left + popupRect.width / 2,
                    },
                    true,
                    errorType,
                  )
                } else {
                  // Le popup d'erreur est au-dessus de l'erreur
                  // Vérifier s'il y a assez de place au-dessus pour la justification
                  const spaceAbove = popupRect.top - 10
                  if (spaceAbove < justificationPopupHeight) {
                    // Pas assez de place au-dessus, afficher en dessous de l'erreur (span)
                    showJustificationPopup(
                      errorIds,
                      {
                        top: spanRect.bottom + 10,
                        left: spanRect.left + spanRect.width / 2,
                      },
                      true,
                      errorType,
                    )
                  } else {
                    // Assez de place, afficher au-dessus du popup
                    showJustificationPopup(
                      errorIds,
                      {
                        top: popupRect.top - 10,
                        left: popupRect.left + popupRect.width / 2,
                      },
                      false,
                      errorType,
                    )
                  }
                }
              } else {
                // Fallback: positionner par rapport au span
                const spaceAbove = spanRect.top - 10
                if (spaceAbove < justificationPopupHeight) {
                  // Pas assez de place au-dessus, afficher en dessous de l'erreur
                  showJustificationPopup(
                    errorIds,
                    {
                      top: spanRect.bottom + 10,
                      left: spanRect.left + spanRect.width / 2,
                    },
                    true,
                    errorType,
                  )
                } else {
                  showJustificationPopup(
                    errorIds,
                    {
                      top: spanRect.top - 10,
                      left: spanRect.left + spanRect.width / 2,
                    },
                    false,
                    errorType,
                  )
                }
              }
            } else {
              // On vient de retirer l'état rejected, fermer les popups
              hideJustificationPopup()
              clearHighlight()
            }

            // Mettre à jour les icônes dans le popup existant (sans le recréer)
            const existingPopup = document.querySelector('.error-popup')
            if (existingPopup) {
              const headers = existingPopup.querySelectorAll('.error-popup-header')
              errors.forEach((error, index) => {
                const header = headers[index] || headers[0]
                if (header) {
                  // Supprimer les icônes existantes
                  const existingRejected = header.querySelector('.error-popup-rejected')
                  if (existingRejected) existingRejected.remove()
                  const existingCheck = header.querySelector('.error-popup-check')
                  if (existingCheck) existingCheck.remove()

                  // Ajouter l'icône rejected si applicable
                  if (rejectedErrors.value.has(error.id)) {
                    const rejectedSpan = document.createElement('span')
                    rejectedSpan.className = 'error-popup-rejected'
                    rejectedSpan.innerHTML =
                      '<span class="material-icons" style="color: #ef9a9a; font-size: 20px;">cancel</span>'
                    header.appendChild(rejectedSpan)
                  }

                  // Ajouter l'icône check si applicable
                  if (checkedErrors.value.has(error.id)) {
                    const checkSpan = document.createElement('span')
                    checkSpan.className = 'error-popup-check'
                    checkSpan.innerHTML =
                      '<span class="material-icons" style="color: #4caf50; font-size: 20px;">check_circle</span>'
                    header.appendChild(checkSpan)
                  }
                }

                // Mettre à jour la section justification dans le popup
                // Trouver l'élément parent de ce header (error-popup-item ou error-popup directement)
                const errorItem = header.closest('.error-popup-item') || existingPopup
                const justificationEl = errorItem.querySelector('.error-popup-justification')

                // Si l'erreur n'est plus rejetée, supprimer la section justification
                if (!rejectedErrors.value.has(error.id)) {
                  if (justificationEl) {
                    justificationEl.remove()
                  }
                } else {
                  // Si l'erreur est rejetée et qu'il y a une justification, l'afficher/mettre à jour
                  const justification = errorJustifications.value[error.id]
                  if (justification) {
                    if (justificationEl) {
                      // Mettre à jour le texte existant
                      const textEl = justificationEl.querySelector(
                        '.error-popup-justification-text',
                      )
                      if (textEl) textEl.textContent = justification
                    } else {
                      // Créer la section justification
                      const justDiv = document.createElement('div')
                      justDiv.className = 'error-popup-justification'
                      justDiv.innerHTML = `
                        <span class="material-icons" style="color: #ff9800; font-size: 16px; margin-right: 6px;">rate_review</span>
                        <span class="error-popup-justification-text">${justification}</span>
                      `
                      errorItem.appendChild(justDiv)
                    }
                  } else if (justificationEl) {
                    // Rejeté mais pas de justification - supprimer si elle existe
                    justificationEl.remove()
                  }
                }
              })
            }
          })
        }
      })
    }

    // Réattacher les listeners quand le texte formaté change
    watch(formattedText, () => {
      nextTick(() => {
        attachTextErrorListeners()
        updateErrorClasses()
      })
    })

    // Flag pour éviter de désélectionner l'erreur quand ESC ferme la dialogue
    let dialogJustClosed = false

    // Réafficher le popup d'erreur quand la dialogue de règle se ferme (si ouvert via F1)
    watch(ruleDialogOpen, (newVal, oldVal) => {
      if (oldVal === true && newVal === false) {
        // Marquer que la dialogue vient de se fermer pour ignorer le ESC
        dialogJustClosed = true
        setTimeout(() => {
          dialogJustClosed = false
        }, 100)

        if (errorToRestoreAfterDialog.value) {
          const errorInfo = errorToRestoreAfterDialog.value
          errorToRestoreAfterDialog.value = null
          // Réafficher le popup après un court délai pour laisser la dialogue se fermer
          nextTick(() => {
            highlightError(errorInfo.id, errorInfo.type, errorInfo.data)
          })
        }
      }
    })

    // Désactiver le menu contextuel du navigateur dans toute l'application
    // (le right-click sur les erreurs dans le texte est géré séparément)
    const disableContextMenu = (e) => {
      // Ne pas bloquer si c'est sur une erreur (géré par attachTextErrorListeners)
      if (!e.target.closest('.error-highlight')) {
        e.preventDefault()
      }
    }

    // Gestionnaire de clic global pour fermer le popup de justification
    const handleGlobalClick = (e) => {
      // Si le popup de justification est visible et qu'on clique en dehors
      if (justificationPopupVisible.value) {
        const justificationPopup = e.target.closest('.justification-popup')
        if (!justificationPopup) {
          // Clic en dehors du popup de justification - annuler et fermer
          cancelJustification()
        }
      }
    }

    // Gestionnaire de touches clavier (F1, flèches, Escape)
    const handleKeyDown = (e) => {
      // Ne pas interférer si on est dans un input ou textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Ne pas interférer si le tutoriel est actif (il a son propre gestionnaire)
      if (showTutorial.value) return

      if (e.key === 'F1') {
        e.preventDefault() // Toujours empêcher l'aide du navigateur

        // Ouvrir la dialogue uniquement si une erreur est survolée
        if (hoveredErrorId.value) {
          // Trouver les erreurs correspondant à l'ID survolé
          const errors = findErrorsByIds(hoveredErrorId.value)
          if (errors.length > 0) {
            const firstError = errors[0]
            // Sauvegarder l'erreur pour la réafficher après fermeture de la dialogue
            const currentSelectedId = selectedErrorId.value
            errorToRestoreAfterDialog.value = {
              id: hoveredErrorId.value,
              type: firstError.type,
              data: firstError,
            }
            // Fermer le popup d'erreur (mais pas la sélection)
            clearHighlight()
            // Restaurer immédiatement la sélection
            selectedErrorId.value = currentSelectedId
            // Ouvrir la dialogue de règle
            openRuleDialog(firstError)
          }
        }
      } else if (
        (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'Enter') &&
        analysisData.value?.result
      ) {
        // Navigation vers l'erreur suivante
        e.preventDefault()
        navigateErrors('down')
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && analysisData.value?.result) {
        // Navigation vers l'erreur précédente
        e.preventDefault()
        navigateErrors('up')
      } else if (
        e.key === 'Escape' &&
        selectedErrorId.value &&
        !ruleDialogOpen.value &&
        !dialogJustClosed
      ) {
        // Désélectionner l'erreur (seulement si la dialogue de règle n'est pas ouverte et ne vient pas de se fermer)
        e.preventDefault()
        selectedErrorId.value = null
        clearHighlight()
      } else if (
        (e.key === 'e' || e.key === 'E') &&
        selectedErrorId.value &&
        !justificationPopupVisible.value
      ) {
        // Confirmer l'erreur sélectionnée avec E (sans basculer si déjà confirmée)
        e.preventDefault()
        const errorId = selectedErrorId.value
        if (!checkedErrors.value.has(errorId)) {
          // Confirmer seulement si pas déjà confirmée
          checkedErrors.value.add(errorId)
          // Retirer de rejected si présent
          rejectedErrors.value.delete(errorId)
          rejectedErrors.value = new Set(rejectedErrors.value)
          checkedErrors.value = new Set(checkedErrors.value)
          updateErrorClasses()
        }
        // Passer à l'erreur suivante
        navigateErrors('down')
      } else if (
        (e.key === 'r' || e.key === 'R') &&
        selectedErrorId.value &&
        !justificationPopupVisible.value
      ) {
        // Rejeter l'erreur sélectionnée avec R (sans basculer si déjà rejetée)
        e.preventDefault()
        const errorId = selectedErrorId.value

        // Si déjà rejetée, juste passer à la suivante
        if (rejectedErrors.value.has(errorId)) {
          navigateErrors('down')
          return
        }

        // Rejeter l'erreur
        rejectedErrors.value.add(errorId)
        // Retirer de checked si présent
        checkedErrors.value.delete(errorId)
        checkedErrors.value = new Set(checkedErrors.value)
        rejectedErrors.value = new Set(rejectedErrors.value)
        updateErrorClasses()

        // Afficher le popup de justification
        const error = erreursByPosition.value.find((err) => err.id === errorId)
        const errorType = error?.type || ''

        // Positionner le popup près de la carte d'erreur sélectionnée
        const errorCard = document.querySelector('.error-card-selected')
        if (errorCard) {
          const cardRect = errorCard.getBoundingClientRect()
          const viewportHeight = window.innerHeight
          const popupHeight = 160 // Hauteur estimée du popup de justification
          const spaceBelow = viewportHeight - cardRect.bottom - 10
          const spaceAbove = cardRect.top - 10

          // Afficher en dessous si assez d'espace, sinon au-dessus
          const isBelow = spaceBelow >= popupHeight || spaceBelow > spaceAbove
          const top = isBelow ? cardRect.bottom + 10 : cardRect.top - 10

          showJustificationPopup(
            errorId,
            {
              top: top,
              left: cardRect.left + cardRect.width / 2,
            },
            isBelow,
            errorType,
          )
        }
      } else if ((e.key === 'z' || e.key === 'Z') && !justificationPopupVisible.value) {
        // Zoomer avec Z
        e.preventDefault()
        zoomIn()
      } else if ((e.key === 'a' || e.key === 'A') && !justificationPopupVisible.value) {
        // Dézoomer avec A
        e.preventDefault()
        zoomOut()
      }
    }

    // Enregistrer ce composant dans la ref partagée pour que MainLayout puisse y accéder
    onMounted(() => {
      if (textViewerRef) {
        textViewerRef.value = {
          highlightError,
          clearHighlight,
        }
      }

      // Désactiver le menu contextuel sur toute la page
      document.addEventListener('contextmenu', disableContextMenu)
      // Gestionnaire de clic global
      document.addEventListener('click', handleGlobalClick)
      // Gestionnaire de touche F1
      document.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      document.removeEventListener('mousemove', onDrag)
      document.removeEventListener('mouseup', stopDrag)
      document.removeEventListener('contextmenu', disableContextMenu)
      document.removeEventListener('click', handleGlobalClick)
      document.removeEventListener('keydown', handleKeyDown)
      // Nettoyer la ref partagée
      if (textViewerRef) {
        textViewerRef.value = null
      }
    })

    return {
      selectedFileName,
      fileOptions,
      currentText,
      wordCount,
      formattedText,
      zoom,
      filterFiles,
      loadSelectedFile,
      zoomIn,
      zoomOut,
      resetZoom,
      floatingToolbar,
      toolbarPosition,
      startDrag,
      highlightError,
      clearHighlight,
      // Nouvelles propriétés pour le panneau d'erreurs
      splitterModel,
      showHelpDialog,
      showTutorial,
      handleTutorialAction,
      sortMode,
      analysisData,
      typeLabels,
      typeToCSS,
      getTypeColor,
      erreursByType,
      erreursByPosition,
      filteredErreursByType,
      filteredErreursByPosition,
      filteredErrorsCount,
      errorsCountC4,
      errorsCountC5,
      scoresForDisplay,
      onErrorClick,
      // Filtre de recherche
      searchFilter,
      highlightSearchTerm,
      isErrorChecked,
      isErrorRejected,
      isErrorSelected,
      selectedErrorId,
      resetErrorStates,
      checkedErrors,
      rejectedErrors,
      // Dialog pour les règles
      ruleDialogOpen,
      selectedRuleId,
      selectedErrorText,
      selectedErrorDescription,
      selectedErrorSuggestions,
      selectedErrorType,
      openRuleDialog,
      // Popup de justification
      justificationPopupVisible,
      justificationPopupText,
      justificationPopupPosition,
      justificationPopupBelow,
      justificationPopupErrorType,
      hideJustificationPopup,
      saveJustification,
      cancelJustification,
      getJustification,
    }
  },
})
</script>

<style scoped>
.text-viewer-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  overflow: hidden;
  position: relative;
}

.splitter-container {
  flex: 1;
  height: 100%;
}

.errors-panel {
  height: 100%;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.errors-panel-header {
  flex-shrink: 0;
  background: #fafafa;
}

.errors-panel-list {
  flex: 1;
  min-height: 0;
}

.errors-list-content {
  padding: 8px 16px;
}

.keyboard-key {
  display: inline-block;
  padding: 8px 16px;
  font-size: 1.1rem;
  font-weight: bold;
  font-family: 'Consolas', 'Monaco', monospace;
  border-radius: 6px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2);
  min-width: 40px;
  text-align: center;
}

.rule-id-link {
  color: #1976d2;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(25, 118, 210, 0.08);
}

.rule-id-link:hover {
  background: rgba(25, 118, 210, 0.15);
  text-decoration: underline;
}

.floating-toolbar {
  position: fixed;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 12px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.1);
  color: #333;
  user-select: none;
}

.toolbar-drag-handle {
  cursor: grab;
  padding: 4px;
  display: flex;
  align-items: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.toolbar-drag-handle:hover {
  opacity: 1;
}

.toolbar-drag-handle:active {
  cursor: grabbing;
}

.zoom-display {
  min-width: 50px;
  font-weight: bold;
  font-size: 12px;
}

.document-container {
  flex: 1;
  overflow: auto;
  background-color: #525659;
}

.document-background {
  min-height: 100%;
  padding: 40px;
  display: flex;
  justify-content: center;
}

.document-page {
  width: 100%;
  max-width: 1200px;
  min-height: calc(100vh - 180px);
  background-color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 130px;
  transform-origin: top center;
  transition: transform 0.2s ease;
}

.placeholder-text {
  color: #999;
  font-size: 1.2rem;
  text-align: center;
  padding-top: 200px;
  font-style: italic;
}

.word-count-label {
  font-family: 'Aptos', 'Calibri', 'Segoe UI', sans-serif;
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.document-content {
  font-family: 'Aptos', 'Calibri', 'Segoe UI', sans-serif;
  font-size: 22px;
  line-height: 1.8;
  color: #333;
}

.document-content :deep(p) {
  margin-bottom: 1.5em;
  text-indent: 2em;
}

.document-content :deep(p:first-child) {
  text-indent: 0;
}

/* Responsive */
@media (max-width: 1400px) {
  .document-page {
    padding: 60px;
  }
}

@media (max-width: 900px) {
  .document-page {
    padding: 40px;
  }
}

@media (max-width: 600px) {
  .document-page {
    padding: 20px;
  }

  .document-content {
    font-size: 18px;
  }
}

/* Popup de justification */
.justification-popup {
  position: fixed;
  z-index: 10001;
  min-width: 400px;
  max-width: 500px;
  background: white;
  border-radius: 0;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateX(-50%) translateY(-100%);
  animation: justification-popup-enter 0.2s ease-out;
}

@keyframes justification-popup-enter {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-90%);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(-100%);
  }
}

/* Position en dessous du popup d'erreur */
.justification-popup.justification-popup-below {
  transform: translateX(-50%) translateY(0);
  animation: justification-popup-enter-below 0.2s ease-out;
}

@keyframes justification-popup-enter-below {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10%);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.justification-popup-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
  font-weight: 600;
  font-size: 14px;
  color: #e65100;
}

/* Couleurs du header selon le type d'erreur */
.justification-header-S {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom-color: #ffcc80;
  color: #e65100;
}

.justification-header-P {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-bottom-color: #a5d6a7;
  color: #2e7d32;
}

.justification-header-PC {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-bottom-color: #a5d6a7;
  color: #2e7d32;
}

.justification-header-U {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-bottom-color: #90caf9;
  color: #1565c0;
}

.justification-header-G {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-bottom-color: #ef9a9a;
  color: #c62828;
}

.justification-header-O {
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border-bottom-color: #80cbc4;
  color: #00695c;
}

.justification-header-NC {
  background: linear-gradient(135deg, #fafafa 0%, #eeeeee 100%);
  border-bottom-color: #bdbdbd;
  color: #616161;
}

.justification-close-btn {
  margin-left: auto;
}

.justification-popup-content {
  padding: 12px;
}

.justification-input {
  width: 100%;
}

.justification-popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid #eee;
}

/* Style pour l'affichage de la justification dans les cartes */
.justification-display {
  display: flex;
  align-items: flex-start;
  padding: 6px 8px;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border-radius: 4px;
  border-left: 3px solid #ff9800;
}

.justification-display span {
  line-height: 1.4;
}
</style>

<style>
/* Styles globaux pour le highlight des erreurs */
.error-highlight {
  border-radius: 2px;
  padding: 1px 2px;
  margin: -1px -2px;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;
  cursor: pointer;
}

/* Soulignement léger par défaut selon le type */
.error-highlight-S {
  text-decoration: underline wavy rgba(255, 152, 0, 0.6);
  text-underline-offset: 3px;
}

.error-highlight-P {
  text-decoration: underline wavy rgba(76, 175, 80, 0.6);
  text-underline-offset: 3px;
}

.error-highlight-PC {
  text-decoration: underline wavy rgba(139, 195, 74, 0.6);
  text-underline-offset: 3px;
}

.error-highlight-U {
  text-decoration: underline wavy rgba(33, 150, 243, 0.6);
  text-underline-offset: 3px;
}

.error-highlight-G {
  text-decoration: underline wavy rgba(244, 67, 54, 0.6);
  text-underline-offset: 3px;
}

.error-highlight-O {
  text-decoration: underline wavy rgba(0, 150, 136, 0.6);
  text-underline-offset: 3px;
}

.error-highlight-NC {
  text-decoration: underline wavy rgba(158, 158, 158, 0.6);
  text-underline-offset: 3px;
}

/* Style pour les erreurs vérifiées (checked) - override le soulignement */
.error-highlight.error-checked {
  text-decoration: underline solid #4caf50 !important;
  text-underline-offset: 3px;
  text-decoration-thickness: 2px;
}

/* Style pour les erreurs rejetées (rejected) - override le soulignement */
.error-highlight.error-rejected {
  text-decoration: underline solid #ef9a9a !important;
  text-underline-offset: 3px;
  text-decoration-thickness: 2px;
}

/* Highlight actif (apparition graduelle rapide via transition sur .error-highlight) */
.error-highlight.error-active.error-active-S {
  background-color: rgba(255, 152, 0, 0.35);
  box-shadow: 0 0 8px 2px rgba(255, 152, 0, 0.5);
}

.error-highlight.error-active.error-active-P {
  background-color: rgba(76, 175, 80, 0.35);
  box-shadow: 0 0 8px 2px rgba(76, 175, 80, 0.5);
}

.error-highlight.error-active.error-active-PC {
  background-color: rgba(139, 195, 74, 0.35);
  box-shadow: 0 0 8px 2px rgba(139, 195, 74, 0.5);
}

.error-highlight.error-active.error-active-U {
  background-color: rgba(33, 150, 243, 0.35);
  box-shadow: 0 0 8px 2px rgba(33, 150, 243, 0.5);
}

.error-highlight.error-active.error-active-G {
  background-color: rgba(244, 67, 54, 0.35);
  box-shadow: 0 0 8px 2px rgba(244, 67, 54, 0.5);
}

.error-highlight.error-active.error-active-O {
  background-color: rgba(0, 150, 136, 0.35);
  box-shadow: 0 0 8px 2px rgba(0, 150, 136, 0.5);
}

.error-highlight.error-active.error-active-NC {
  background-color: rgba(158, 158, 158, 0.35);
  box-shadow: 0 0 8px 2px rgba(158, 158, 158, 0.5);
}

/* Styles pour le popup d'erreur */
.error-popup {
  position: fixed;
  z-index: 10000;
  max-width: 400px;
  min-width: 250px;
  padding: 12px 16px;
  background: white;
  border-radius: 0;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.25),
    0 2px 8px rgba(0, 0, 0, 0.15);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  border-left: 4px solid #9e9e9e; /* Gris par défaut pour les types non reconnus */
}

.error-popup::before {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.error-popup.error-popup-below::before {
  bottom: auto;
  top: -8px;
  border-top: none;
  border-bottom: 8px solid white;
}

.error-popup-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.error-popup-rule-id {
  background: rgba(25, 118, 210, 0.08);
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
}

.error-popup-rule-name {
  color: #555;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.error-popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.error-popup-check {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.error-popup-rejected {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.error-popup-check + .error-popup-rejected,
.error-popup-rejected + .error-popup-check {
  margin-left: 4px;
}

.error-popup-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 12px;
  color: white;
  white-space: nowrap;
  background-color: #9e9e9e; /* Gris par défaut pour les types non reconnus */
}

.error-popup-S .error-popup-type {
  background-color: #ff9800;
}
.error-popup-P .error-popup-type {
  background-color: #4caf50;
}
.error-popup-PC .error-popup-type {
  background-color: #8bc34a;
}
.error-popup-U .error-popup-type {
  background-color: #2196f3;
}
.error-popup-G .error-popup-type {
  background-color: #f44336;
}
.error-popup-O .error-popup-type {
  background-color: #009688;
}
.error-popup-NC .error-popup-type {
  background-color: #9e9e9e;
}

.error-popup-label {
  font-weight: 700 !important;
  color: #333;
}

.error-popup-description {
  color: #2c2c2c;
  margin-bottom: 8px;
  font-size: 1.15rem;
}

.error-popup-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.error-popup-suggestion-label {
  color: #888;
  font-size: 12px;
}

.error-popup-suggestion {
  display: inline-block;
  padding: 2px 8px;
  background-color: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

/* Style pour la justification dans le popup */
.error-popup-justification {
  display: flex;
  align-items: flex-start;
  padding: 8px 10px;
  margin-top: 8px;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border-radius: 4px;
  border-left: 3px solid #ff9800;
}

.error-popup-justification-text {
  color: #e65100;
  font-size: 13px;
  font-style: italic;
  line-height: 1.4;
}

/* Bordure colorée selon le type */
.error-popup-S {
  border-left: 4px solid #ff9800;
}
.error-popup-P {
  border-left: 4px solid #4caf50;
}
.error-popup-PC {
  border-left: 4px solid #8bc34a;
}
.error-popup-U {
  border-left: 4px solid #2196f3;
}
.error-popup-G {
  border-left: 4px solid #f44336;
}
.error-popup-O {
  border-left: 4px solid #009688;
}
.error-popup-NC {
  border-left: 4px solid #9e9e9e;
}

/* Styles pour les cartes d'erreurs dans le panneau */
.error-card {
  transition:
    box-shadow 0.3s ease,
    transform 0.2s ease;
  cursor: pointer;
}

.error-card:not(.error-card-selected):hover {
  transform: translateY(-2px);
}

.error-card.error-card-S:not(.error-card-selected):hover {
  box-shadow: 0 0 12px 3px rgba(255, 152, 0, 0.6) !important;
}

.error-card.error-card-P:not(.error-card-selected):hover {
  box-shadow: 0 0 12px 3px rgba(76, 175, 80, 0.6) !important;
}

.error-card.error-card-PC:not(.error-card-selected):hover {
  box-shadow: 0 0 12px 3px rgba(139, 195, 74, 0.6) !important;
}

.error-card.error-card-U:not(.error-card-selected):hover {
  box-shadow: 0 0 12px 3px rgba(33, 150, 243, 0.6) !important;
}

.error-card.error-card-G:not(.error-card-selected):hover {
  box-shadow: 0 0 12px 3px rgba(244, 67, 54, 0.6) !important;
}

.error-card.error-card-O:not(.error-card-selected):hover {
  box-shadow: 0 0 12px 3px rgba(0, 150, 136, 0.6) !important;
}

.error-card.error-card-NC:not(.error-card-selected):hover {
  box-shadow: 0 0 12px 3px rgba(158, 158, 158, 0.6) !important;
}

/* Styles pour les erreurs sélectionnées dans le panneau */
.error-card.error-card-selected {
  transform: translateY(-2px) !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.error-card.error-card-selected.error-card-selected-S,
.error-card.error-card-selected.error-card-selected-S:hover {
  box-shadow: 0 0 20px 6px rgba(255, 152, 0, 0.9) !important;
  border-color: #ff9800 !important;
  background-color: rgba(255, 152, 0, 0.08) !important;
}

.error-card.error-card-selected.error-card-selected-P,
.error-card.error-card-selected.error-card-selected-P:hover {
  box-shadow: 0 0 20px 6px rgba(76, 175, 80, 0.9) !important;
  border-color: #4caf50 !important;
  background-color: rgba(76, 175, 80, 0.08) !important;
}

.error-card.error-card-selected.error-card-selected-PC,
.error-card.error-card-selected.error-card-selected-PC:hover {
  box-shadow: 0 0 20px 6px rgba(139, 195, 74, 0.9) !important;
  border-color: #8bc34a !important;
  background-color: rgba(139, 195, 74, 0.08) !important;
}

.error-card.error-card-selected.error-card-selected-U,
.error-card.error-card-selected.error-card-selected-U:hover {
  box-shadow: 0 0 20px 6px rgba(33, 150, 243, 0.9) !important;
  border-color: #2196f3 !important;
  background-color: rgba(33, 150, 243, 0.08) !important;
}

.error-card.error-card-selected.error-card-selected-G,
.error-card.error-card-selected.error-card-selected-G:hover {
  box-shadow: 0 0 20px 6px rgba(244, 67, 54, 0.9) !important;
  border-color: #f44336 !important;
  background-color: rgba(244, 67, 54, 0.08) !important;
}

.error-card.error-card-selected.error-card-selected-O,
.error-card.error-card-selected.error-card-selected-O:hover {
  box-shadow: 0 0 20px 6px rgba(0, 150, 136, 0.9) !important;
  border-color: #009688 !important;
  background-color: rgba(0, 150, 136, 0.08) !important;
}

.error-card.error-card-selected.error-card-selected-NC,
.error-card.error-card-selected.error-card-selected-NC:hover {
  box-shadow: 0 0 20px 6px rgba(158, 158, 158, 0.9) !important;
  border-color: #9e9e9e !important;
  background-color: rgba(158, 158, 158, 0.08) !important;
}

/* Badge pour erreurs multiples sur un même mot */
.error-count-badge {
  position: relative;
  top: -8px;
  margin-left: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: bold;
  color: white;
  background-color: #e91e63;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Style pour les spans avec plusieurs types d'erreurs */
.error-highlight-multi {
  text-decoration: underline wavy rgba(128, 128, 128, 0.8);
  background: linear-gradient(
    135deg,
    rgba(255, 152, 0, 0.15) 0%,
    rgba(244, 67, 54, 0.15) 50%,
    rgba(76, 175, 80, 0.15) 100%
  );
}

/* Popup multi-erreurs */
.error-popup-multi {
  border-left: none;
}

.error-popup-multi::before {
  display: none;
}

/* Styles pour les items seulement dans le popup multi-erreurs */
.error-popup-multi .error-popup-item {
  padding: 8px 0;
  border-left: 3px solid transparent;
  padding-left: 8px;
  margin-left: -12px;
}

.error-popup-multi .error-popup-item:first-child {
  padding-top: 0;
}

.error-popup-multi .error-popup-item:last-child {
  padding-bottom: 0;
}

.error-popup-multi .error-popup-item.error-popup-S {
  border-left-color: #ff9800;
}

.error-popup-multi .error-popup-item.error-popup-P {
  border-left-color: #4caf50;
}

.error-popup-multi .error-popup-item.error-popup-PC {
  border-left-color: #8bc34a;
}

.error-popup-multi .error-popup-item.error-popup-U {
  border-left-color: #2196f3;
}

.error-popup-multi .error-popup-item.error-popup-G {
  border-left-color: #f44336;
}

.error-popup-multi .error-popup-item.error-popup-O {
  border-left-color: #009688;
}

.error-popup-multi .error-popup-item.error-popup-NC {
  border-left-color: #9e9e9e;
}

.error-popup-separator {
  height: 1px;
  background: linear-gradient(to right, transparent, #ddd, transparent);
  margin: 4px 0;
}
</style>

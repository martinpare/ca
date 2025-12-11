<template>
  <q-dialog
    v-model="isOpen"
    seamless
    position="top"
    transition-show="slide-down"
    transition-hide="slide-up"
    @click="close"
  >
    <q-card class="rule-dialog-card" @click.stop>
      <!-- Header avec titre et bouton de fermeture -->
      <q-card-section class="rule-dialog-title bg-grey-9 text-white">
        <span>Explication de la règle appliquée</span>
        <q-btn flat round dense icon="close" color="white" class="close-btn" @click="close" />
      </q-card-section>
      <q-card-section class="rule-dialog-header q-pb-none">
        <div class="rule-breadcrumb">
          <template v-for="(item, index) in originalPath" :key="'breadcrumb-' + item.id">
            <span
              class="breadcrumb-item"
              :class="{
                'breadcrumb-criteria': index === 0,
                'breadcrumb-current': item.id === rule?.id,
                'breadcrumb-clickable': index > 0 && item.id !== rule?.id,
              }"
              @click="index > 0 && item.id !== rule?.id && navigateToRule(item.id)"
            >
              <span class="breadcrumb-id">{{ index === 0 ? 'Critère ' + item.id : item.id }}</span>
              <span v-if="index < originalPath.length - 1" class="breadcrumb-separator">›</span>
            </span>
          </template>
        </div>
      </q-card-section>

      <!-- Hiérarchie complète (parents et enfants) - sans le premier niveau (critère) -->
      <q-card-section class="rule-hierarchy q-pt-sm q-pb-none" v-if="originalPath.length > 2">
        <div
          v-for="(item, index) in originalPath.slice(1)"
          :key="'hierarchy-' + item.id"
          class="hierarchy-level"
          :class="{
            'hierarchy-clickable': item.id !== rule?.id,
            'hierarchy-current': item.id === rule?.id,
          }"
          :style="{ paddingLeft: index * 12 + 'px' }"
          @click="item.id !== rule?.id && navigateToRule(item.id)"
        >
          <div class="hierarchy-connector" v-if="index > 0">
            <div class="connector-line"></div>
          </div>
          <div class="hierarchy-content">
            <span class="hierarchy-id">{{ item.id }}</span>
            <span class="hierarchy-nom">{{ item.nom }}</span>
          </div>
        </div>
      </q-card-section>

      <!-- Règle principale avec détails complets -->
      <q-card-section class="rule-main q-pt-md" v-if="rule">
        <div class="rule-header">
          <q-badge :color="getRuleColor()" class="rule-id-badge">
            {{ rule.id }}
          </q-badge>
          <span class="rule-nom">{{ rule.nom }}</span>
        </div>

        <div class="rule-description" v-if="rule.description">
          {{ rule.description }}
        </div>

        <!-- Exemples -->
        <div class="rule-examples" v-if="rule.exemples && rule.exemples.length > 0">
          <div class="examples-title">Exemples</div>
          <div v-for="(exemple, idx) in rule.exemples.slice(0, 3)" :key="idx" class="example-item">
            <div class="example-error" v-if="exemple.erreur">
              <q-icon name="close" color="red-4" size="xs" class="q-mr-xs" />
              <span v-html="formatExample(exemple.erreur)"></span>
            </div>
            <div class="example-correction" v-if="exemple.correction">
              <q-icon name="check" color="green-5" size="xs" class="q-mr-xs" />
              <span>{{ exemple.correction }}</span>
            </div>
            <div class="example-explanation" v-if="exemple.explication">
              <q-icon name="info" color="blue-4" size="xs" class="q-mr-xs" />
              <span>{{ exemple.explication }}</span>
            </div>
          </div>
        </div>

        <!-- Tolérances -->
        <div class="rule-tolerances" v-if="rule.tolerances && rule.tolerances.length > 0">
          <div class="tolerances-title">Tolérances</div>
          <ul class="tolerances-list">
            <li v-for="(tolerance, idx) in rule.tolerances" :key="idx">
              {{ tolerance }}
            </li>
          </ul>
        </div>

        <!-- Exceptions -->
        <div class="rule-exceptions" v-if="rule.exceptions && rule.exceptions.length > 0">
          <div class="exceptions-title">Exceptions</div>
          <ul class="exceptions-list">
            <li v-for="(exception, idx) in rule.exceptions" :key="idx">
              {{ exception.condition || exception }}
            </li>
          </ul>
        </div>
      </q-card-section>

      <!-- Erreur spécifique rencontrée -->
      <q-card-section class="error-context q-pt-none" v-if="errorText">
        <div class="error-context-title">Erreur rencontrée dans le texte</div>
        <div class="error-context-content">
          <div class="error-context-text">
            <q-icon name="error_outline" color="red-5" size="sm" class="q-mr-sm" />
            <span class="error-text-value">"{{ errorText }}"</span>
          </div>
          <div class="error-context-description" v-if="errorDescription">
            {{ errorDescription }}
          </div>
          <div
            class="error-context-suggestions"
            v-if="errorSuggestions && errorSuggestions.length > 0"
          >
            <span class="suggestion-label">Suggestion :</span>
            <q-chip
              v-for="(sug, idx) in errorSuggestions"
              :key="idx"
              size="md"
              color="green-2"
              text-color="green-10"
              dense
              class="suggestion-chip"
            >
              {{ sug }}
            </q-chip>
          </div>
        </div>
      </q-card-section>

      <!-- Note si règle parente affichée -->
      <q-card-section class="rule-note q-pt-none" v-if="note">
        <q-banner dense class="bg-amber-1 text-amber-10">
          <template v-slot:avatar>
            <q-icon name="info" color="amber" />
          </template>
          {{ note }}
        </q-banner>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { findRuleById } from '../services/rulesService'

export default defineComponent({
  name: 'RuleDetailDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    ruleId: {
      type: String,
      default: '',
    },
    // Informations sur l'erreur spécifique
    errorText: {
      type: String,
      default: '',
    },
    errorDescription: {
      type: String,
      default: '',
    },
    errorSuggestions: {
      type: Array,
      default: () => [],
    },
    errorType: {
      type: String,
      default: '',
    },
  },

  emits: ['update:modelValue', 'navigate'],

  setup(props, { emit }) {
    const rule = ref(null)
    const hierarchy = ref([])
    const note = ref('')
    // Règle actuellement affichée (peut différer de props.ruleId lors de la navigation)
    const currentRuleId = ref('')
    // Chemin complet original (conservé pour permettre la navigation vers les enfants)
    const originalPath = ref([])

    const isOpen = computed({
      get: () => props.modelValue,
      set: (val) => emit('update:modelValue', val),
    })

    const close = () => {
      isOpen.value = false
    }

    const navigateToRule = (ruleId) => {
      currentRuleId.value = ruleId
      loadRuleData(ruleId)
    }

    const loadRuleData = (ruleId) => {
      if (!ruleId) {
        rule.value = null
        hierarchy.value = []
        note.value = ''
        return
      }

      const result = findRuleById(ruleId)
      if (result) {
        rule.value = result.rule
        // Construire la hiérarchie à partir du chemin original
        // Trouver l'index de la règle courante dans le chemin original
        const currentIndex = originalPath.value.findIndex((r) => r.id === ruleId)
        if (currentIndex >= 0) {
          // La règle fait partie du chemin original, afficher uniquement les parents
          hierarchy.value = originalPath.value.slice(0, currentIndex)
        } else {
          // Fallback : utiliser la hiérarchie retournée par findRuleById
          hierarchy.value = result.hierarchy
        }
        note.value = result.note || ''
      } else {
        rule.value = null
        hierarchy.value = []
        note.value = `Règle "${ruleId}" non trouvée dans le guide.`
      }
    }

    const loadRule = () => {
      currentRuleId.value = props.ruleId
      if (!props.ruleId) {
        rule.value = null
        hierarchy.value = []
        originalPath.value = []
        note.value = ''
        return
      }

      const result = findRuleById(props.ruleId)
      if (result) {
        rule.value = result.rule
        hierarchy.value = result.hierarchy
        // Sauvegarder le chemin complet original (hiérarchie + règle courante)
        originalPath.value = [...result.hierarchy, { id: result.rule.id, nom: result.rule.nom }]
        note.value = result.note || ''
      } else {
        rule.value = null
        hierarchy.value = []
        originalPath.value = []
        note.value = `Règle "${props.ruleId}" non trouvée dans le guide.`
      }
    }

    const getRuleColor = () => {
      if (!props.ruleId) return 'grey'
      return 'blue'
    }

    const formatExample = (text) => {
      // Mettre en évidence les symboles d'erreur
      return text
        .replace(/⭕/g, '<span class="error-marker">⭕</span>')
        .replace(/\[([^\]]+)\]/g, '<span class="correction-marker">[$1]</span>')
    }

    watch(
      () => props.ruleId,
      () => {
        loadRule()
      },
      { immediate: true },
    )

    watch(
      () => props.modelValue,
      (val) => {
        if (val) {
          loadRule()
        }
      },
    )

    // Gestionnaire de touche Escape pour fermer la dialogue
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen.value) {
        e.preventDefault()
        close()
      }
    }

    onMounted(() => {
      document.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown)
    })

    return {
      isOpen,
      rule,
      hierarchy,
      originalPath,
      note,
      close,
      navigateToRule,
      getRuleColor,
      formatExample,
    }
  },
})
</script>

<style scoped>
.rule-dialog-card {
  width: 100%;
  max-width: 650px;
  margin-top: 50px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 4px 16px rgba(0, 0, 0, 0.1);
  background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
}

.rule-dialog-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.rule-dialog-title .close-btn {
  margin: -8px -8px -8px 0;
}

.rule-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.rule-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
}

.breadcrumb-id {
  font-weight: 500;
  color: #888;
}

.breadcrumb-criteria .breadcrumb-id {
  background: #e3f2fd;
  color: #1565c0;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.breadcrumb-separator {
  margin: 0 2px;
  color: #bbb;
  font-size: 16px;
}

.breadcrumb-current .breadcrumb-id {
  background: rgba(25, 118, 210, 0.08);
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.breadcrumb-clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.breadcrumb-clickable:hover .breadcrumb-id {
  background: #1976d2;
  color: white;
}

.breadcrumb-clickable.breadcrumb-criteria:hover .breadcrumb-id {
  background: #1565c0;
  color: white;
}

/* Hiérarchie */
.rule-hierarchy {
  background: #f8f9fa;
  border-radius: 8px;
  margin: 0 16px;
  padding: 12px 16px !important;
  position: relative;
}

.hierarchy-level {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  position: relative;
  min-height: 24px;
}

.hierarchy-level:last-child {
  margin-bottom: 0;
}

.hierarchy-connector {
  position: absolute;
  left: 0;
  top: -14px;
  width: 12px;
  height: 14px;
  border-left: 2px solid #ccc;
  border-bottom: 2px solid #ccc;
  border-bottom-left-radius: 4px;
}

.connector-line {
  display: none;
}

.hierarchy-content {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.4;
}

.hierarchy-id {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 11px;
  color: #999;
  min-width: fit-content;
}

.hierarchy-nom {
  font-size: 13px;
  color: #555;
}

.hierarchy-level .hierarchy-content {
  border-radius: 4px;
  padding: 2px 6px;
  transition: background-color 0.2s ease;
}

.hierarchy-clickable {
  cursor: pointer;
}

.hierarchy-clickable .hierarchy-content:hover {
  background-color: rgba(25, 118, 210, 0.1);
}

.hierarchy-clickable:hover .hierarchy-id {
  color: #1976d2;
}

.hierarchy-clickable:hover .hierarchy-nom {
  color: #1976d2;
}

.hierarchy-current .hierarchy-content {
  background-color: rgba(25, 118, 210, 0.12);
}

.hierarchy-current .hierarchy-id {
  color: #1976d2;
  font-weight: 600;
}

.hierarchy-current .hierarchy-nom {
  color: #1976d2;
  font-weight: 500;
}

/* Règle principale */
.rule-main {
  padding-top: 16px;
}

.rule-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rule-id-badge {
  font-size: 14px;
  font-weight: 600;
  padding: 6px 12px;
}

.rule-nom {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
}

.rule-description {
  font-size: 15px;
  color: #444;
  line-height: 1.6;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-left: 3px solid #1976d2;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Exemples */
.rule-examples {
  margin-bottom: 0;
}

.examples-title,
.tolerances-title,
.exceptions-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 8px;
}

.example-item {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.example-item:last-child {
  margin-bottom: 0;
}

.example-error,
.example-correction,
.example-explanation {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 4px;
}

.example-error:last-child,
.example-correction:last-child,
.example-explanation:last-child {
  margin-bottom: 0;
}

.example-error {
  color: #c62828;
}

.example-correction {
  color: #2e7d32;
}

.example-explanation {
  color: #1565c0;
  font-style: italic;
  font-size: 13px;
}

:deep(.error-marker) {
  color: #f44336;
  font-weight: bold;
}

:deep(.correction-marker) {
  color: #4caf50;
  font-weight: 500;
}

/* Tolérances et Exceptions */
.tolerances-list,
.exceptions-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}

.tolerances-list li,
.exceptions-list li {
  margin-bottom: 4px;
}

.rule-tolerances {
  background: #e8f5e9;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.rule-tolerances .tolerances-title {
  color: #2e7d32;
}

.rule-exceptions {
  background: #fff3e0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.rule-exceptions .exceptions-title {
  color: #e65100;
}

.rule-note {
  padding-top: 0;
}

/* Erreur rencontrée */
.error-context {
  padding-top: 0px;
}

.error-context-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.error-context-content {
  background: linear-gradient(135deg, #ffebee 0%, #fce4ec 100%);
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  padding: 12px 16px;
}

.error-context-text {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
}

.error-text-value {
  font-size: 15px;
  font-weight: 600;
  color: #c62828;
  font-style: italic;
}

.error-context-description {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  margin-bottom: 8px;
  padding-left: 28px;
}

.error-context-suggestions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 13px;
  padding-left: 28px;
}

.suggestion-label {
  color: #666;
  margin-right: 8px;
  font-size: 15px;
  font-weight: 500;
}

.suggestion-chip {
  margin: 4px 4px 4px 0;
  font-size: 18px;
  padding: 8px 16px;
  font-weight: 600;
}
</style>

<template>
  <q-card :class="cardClass" flat square bordered>
    <q-card-section>
      <div class="row items-start q-gutter-md">
        <!-- Icône du verdict -->
        <div class="col-auto">
          <q-avatar :color="verdictColor" text-color="white" size="48px">
            <q-icon :name="verdictIcon" size="28px" />
          </q-avatar>
        </div>

        <!-- Contenu principal -->
        <div class="col">
          <!-- En-tête avec ID et verdict -->
          <div class="row items-center q-mb-sm">
            <q-badge color="blue-grey" class="q-mr-sm">
              {{ erreur.id }}
            </q-badge>
            <q-badge :color="typeColor" class="q-mr-sm">
              {{ typeLabel }}
            </q-badge>
            <q-chip
              :color="verdictColor"
              text-color="white"
              dense
              :icon="verdictIcon"
              :label="verdictLabel"
            />
            <q-space />
            <q-chip
              v-if="erreur.confidence"
              :color="confidenceColor"
              text-color="white"
              dense
              size="sm"
            >
              Confiance: {{ erreur.confidence }}
            </q-chip>
          </div>

          <!-- Texte incriminé -->
          <div class="text-subtitle1 q-mb-sm">
            <q-icon name="format_quote" color="grey" class="q-mr-xs" />
            <span class="text-weight-medium bg-yellow-2 q-pa-xs rounded-borders">
              « {{ erreur.text }} »
            </span>
          </div>

          <!-- Description de l'erreur -->
          <div class="q-mb-md">
            <div class="text-caption text-grey-7 text-uppercase q-mb-xs">Description</div>
            <div class="text-body2">{{ erreur.description }}</div>
          </div>

          <!-- Suggestions -->
          <div v-if="erreur.suggestions && erreur.suggestions.length > 0" class="q-mb-md">
            <div class="text-caption text-grey-7 text-uppercase q-mb-xs">Suggestions</div>
            <div class="row q-gutter-sm">
              <q-chip
                v-for="(suggestion, idx) in erreur.suggestions"
                :key="idx"
                color="light-blue-1"
                text-color="primary"
                icon="lightbulb"
                dense
              >
                {{ suggestion }}
              </q-chip>
            </div>
          </div>

          <!-- Règle appliquée -->
          <div v-if="erreur.ruleApplied" class="q-mb-md">
            <q-chip color="deep-purple-1" text-color="deep-purple" dense icon="gavel">
              Règle: {{ erreur.ruleApplied }}
            </q-chip>
            <div v-if="ruleDescription" class="text-body2 q-mt-sm q-pl-sm">
              {{ ruleDescription }}
            </div>
          </div>

          <!-- Verdict du réviseur -->
          <q-expansion-item
            v-if="erreur.verdict !== 'ERREUR' || erreur.counterArgument"
            icon="rate_review"
            label="Analyse du réviseur"
            header-class="text-primary"
            default-opened
          >
            <q-card class="bg-grey-1" flat square bordered>
              <q-card-section>
                <!-- Raison de la confiance -->
                <div v-if="erreur.confidenceReason" class="q-mb-md">
                  <div class="text-caption text-grey-7 text-uppercase q-mb-xs">
                    <q-icon name="psychology" class="q-mr-xs" />
                    Justification du verdict
                  </div>
                  <div class="text-body2">{{ erreur.confidenceReason }}</div>
                </div>

                <!-- Contre-argument (pour faux positifs et discutables) -->
                <div v-if="erreur.counterArgument" class="q-mt-md">
                  <div class="text-caption text-uppercase q-mb-xs" :class="counterArgumentHeaderClass">
                    <q-icon :name="counterArgumentIcon" class="q-mr-xs" />
                    {{ counterArgumentTitle }}
                  </div>
                  <q-card :class="counterArgumentCardClass" flat square bordered>
                    <q-card-section>
                      <div class="text-body2" style="white-space: pre-wrap;">{{ erreur.counterArgument }}</div>
                    </q-card-section>
                  </q-card>
                </div>
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { defineComponent, computed } from 'vue';
import { findRuleById } from '../services/rulesService';

export default defineComponent({
  name: 'ErreurCard',

  props: {
    erreur: {
      type: Object,
      required: true
    }
  },

  setup(props) {
    // Classe de la carte selon le verdict (bordure colorée)
    const cardClass = computed(() => {
      switch (props.erreur.verdict) {
        case 'ERREUR':
          return 'erreur-card-erreur';
        case 'DISCUTABLE':
          return 'erreur-card-discutable';
        case 'FAUX_POSITIF':
          return 'erreur-card-faux-positif';
        default:
          return 'erreur-card-default';
      }
    });

    // Couleur du verdict
    const verdictColor = computed(() => {
      switch (props.erreur.verdict) {
        case 'ERREUR':
          return 'negative';
        case 'DISCUTABLE':
          return 'warning';
        case 'FAUX_POSITIF':
          return 'positive';
        default:
          return 'grey';
      }
    });

    // Icône du verdict
    const verdictIcon = computed(() => {
      switch (props.erreur.verdict) {
        case 'ERREUR':
          return 'error';
        case 'DISCUTABLE':
          return 'help';
        case 'FAUX_POSITIF':
          return 'check_circle';
        default:
          return 'info';
      }
    });

    // Label du verdict
    const verdictLabel = computed(() => {
      switch (props.erreur.verdict) {
        case 'ERREUR':
          return 'Erreur confirmée';
        case 'DISCUTABLE':
          return 'Discutable';
        case 'FAUX_POSITIF':
          return 'Faux positif (rejeté)';
        default:
          return props.erreur.verdict;
      }
    });

    // Type d'erreur (S = Syntaxe, U = Usage)
    const typeColor = computed(() => {
      return props.erreur.type === 'S' ? 'indigo' : 'teal';
    });

    const typeLabel = computed(() => {
      return props.erreur.type === 'S' ? 'Syntaxe' : 'Usage';
    });

    // Couleur de la confiance
    const confidenceColor = computed(() => {
      switch (props.erreur.confidence) {
        case 'HIGH':
          return 'positive';
        case 'MEDIUM':
          return 'warning';
        case 'LOW':
          return 'negative';
        default:
          return 'grey';
      }
    });

    // Contre-argument styling
    const counterArgumentHeaderClass = computed(() => {
      if (props.erreur.verdict === 'FAUX_POSITIF') {
        return 'text-positive';
      } else if (props.erreur.verdict === 'DISCUTABLE') {
        return 'text-warning';
      }
      return 'text-grey-7';
    });

    const counterArgumentIcon = computed(() => {
      if (props.erreur.verdict === 'FAUX_POSITIF') {
        return 'thumb_up';
      } else if (props.erreur.verdict === 'DISCUTABLE') {
        return 'balance';
      }
      return 'comment';
    });

    const counterArgumentTitle = computed(() => {
      if (props.erreur.verdict === 'FAUX_POSITIF') {
        return 'Raison du rejet (forme acceptée)';
      } else if (props.erreur.verdict === 'DISCUTABLE') {
        return 'Argument en faveur de la forme originale';
      }
      return 'Commentaire';
    });

    const counterArgumentCardClass = computed(() => {
      if (props.erreur.verdict === 'FAUX_POSITIF') {
        return 'bg-green-1';
      } else if (props.erreur.verdict === 'DISCUTABLE') {
        return 'bg-orange-1';
      }
      return 'bg-grey-2';
    });

    // Description de la règle
    const ruleDescription = computed(() => {
      if (!props.erreur.ruleApplied) return null;
      const result = findRuleById(props.erreur.ruleApplied);
      return result?.rule?.description || null;
    });

    return {
      cardClass,
      verdictColor,
      verdictIcon,
      verdictLabel,
      typeColor,
      typeLabel,
      confidenceColor,
      counterArgumentHeaderClass,
      counterArgumentIcon,
      counterArgumentTitle,
      counterArgumentCardClass,
      ruleDescription
    };
  }
});
</script>

<style scoped>
.rounded-borders {
  border-radius: 4px;
}

.erreur-card-erreur {
  border-left: 8px solid #c10015;
}

.erreur-card-discutable {
  border-left: 8px solid #f2c037;
}

.erreur-card-faux-positif {
  border-left: 8px solid #21ba45;
}

.erreur-card-default {
  border-left: 8px solid #9e9e9e;
}
</style>

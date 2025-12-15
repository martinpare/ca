<template>
  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div v-if="modelValue" class="tutorial-overlay" @click.self="handleOverlayClick">
        <!-- Spotlight (zone éclairée) -->
        <div
          v-if="currentStepData.target"
          class="tutorial-spotlight"
          :class="{ 'spotlight-clickable': currentStepData.clickAction }"
          :style="spotlightStyle"
          @click="handleSpotlightClick"
        ></div>

        <!-- Spotlight secondaire (deuxième élément à mettre en évidence) -->
        <div
          v-if="currentStepData.secondaryTarget && secondaryTargetRect"
          class="tutorial-spotlight-secondary"
          :style="secondarySpotlightStyle"
        ></div>

        <!-- Annotation manuscrite avec flèche -->
        <div
          v-if="currentStepData.target"
          class="tutorial-annotation"
          :class="[`annotation-${currentStepData.position || 'top'}`]"
          :style="annotationStyle"
        >
          <svg class="annotation-arrow" viewBox="0 0 100 60" preserveAspectRatio="none">
            <path
              :d="getArrowPath()"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div class="annotation-text">{{ currentStepData.annotation }}</div>
        </div>

        <!-- Panneau principal du tutoriel -->
        <div class="tutorial-panel" :class="{ 'panel-centered': !currentStepData.target }">
          <!-- Header -->
          <div class="tutorial-header">
            <div class="tutorial-step-indicator">
              <span class="step-current">{{ currentStep + 1 }}</span>
              <span class="step-separator">/</span>
              <span class="step-total">{{ steps.length }}</span>
            </div>
            <div class="tutorial-title">{{ currentStepData.title }}</div>
            <button class="tutorial-close" @click="close" title="Fermer (Échap)">
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Contenu -->
          <div class="tutorial-content">
            <p class="tutorial-description">{{ currentStepData.description }}</p>

            <!-- Affichage des touches clavier si présentes -->
            <div v-if="currentStepData.keys && currentStepData.keys.length" class="tutorial-keys">
              <div class="keys-label">Touches à utiliser :</div>
              <div class="keys-container">
                <div v-for="(key, index) in currentStepData.keys" :key="index" class="key-item">
                  <kbd :class="['keyboard-key', key.color ? `key-${key.color}` : '']">
                    {{ key.key }}
                  </kbd>
                  <span class="key-description">{{ key.description }}</span>
                </div>
              </div>
            </div>

            <!-- Actions spéciales (clic, etc.) -->
            <div v-if="currentStepData.action" class="tutorial-action">
              <span class="material-icons action-icon">{{
                currentStepData.actionIcon || 'touch_app'
              }}</span>
              <span class="action-text">{{ currentStepData.action }}</span>
            </div>

            <!-- Astuce -->
            <div v-if="currentStepData.tip" class="tutorial-tip">
              <span class="material-icons tip-icon">lightbulb</span>
              <span class="tip-text">{{ currentStepData.tip }}</span>
            </div>

            <!-- Rappel de cliquer sur l'élément -->
            <Transition name="reminder-fade">
              <div v-if="showClickReminder" class="tutorial-click-reminder">
                <span class="material-icons reminder-icon">ads_click</span>
                <span class="reminder-text"
                  >Cliquez sur la zone en surbrillance pour sélectionner une erreur avant de
                  continuer.</span
                >
              </div>
            </Transition>
          </div>

          <!-- Footer avec navigation -->
          <div class="tutorial-footer">
            <button
              class="tutorial-btn btn-secondary"
              @click="previousStep"
              :disabled="currentStep === 0"
            >
              <span class="material-icons">arrow_back</span>
              Précédent
            </button>

            <div class="tutorial-progress">
              <div
                v-for="(_, index) in steps"
                :key="index"
                class="progress-dot"
                :class="{ active: index === currentStep, completed: index < currentStep }"
                @click="goToStep(index)"
              ></div>
            </div>

            <button
              v-if="currentStep < steps.length - 1"
              class="tutorial-btn btn-primary"
              @click="nextStep"
            >
              Suivant
              <span class="material-icons">arrow_forward</span>
            </button>
            <button v-else class="tutorial-btn btn-success" @click="close">
              Terminer
              <span class="material-icons">check</span>
            </button>
          </div>

          <!-- Séparateur et indication clavier -->
          <q-separator class="q-mt-sm" />
          <div class="tutorial-keyboard-hint">
            <kbd>←</kbd> <kbd>→</kbd> pour naviguer · <kbd>Échap</kbd> pour fermer
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export default defineComponent({
  name: 'InteractiveTutorial',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    isErrorSelected: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue', 'spotlight-click', 'step-enter'],

  setup(props, { emit }) {
    const currentStep = ref(0)
    const targetRect = ref(null)
    const secondaryTargetRect = ref(null)
    const showClickReminder = ref(false)

    // Définition des étapes du tutoriel
    const steps = [
      {
        title: 'Bienvenue dans le Guide de Validation',
        description:
          'Ce tutoriel interactif va vous montrer comment valider efficacement les erreurs linguistiques détectées dans vos textes. Suivez les étapes pour devenir un expert de la validation !',
        annotation: null,
        target: null,
        tip: 'Utilisez les flèches du clavier pour naviguer rapidement entre les étapes.',
      },
      {
        title: 'Sélection du fichier',
        description:
          'Commencez par sélectionner un fichier texte à analyser. Le menu déroulant vous permet de rechercher et choisir parmi tous les documents disponibles.',
        annotation: 'Sélectionnez votre texte ici !',
        target: '.floating-toolbar .q-select',
        position: 'bottom',
        offset: 60,
        action: 'Cliquez sur le menu déroulant pour voir la liste des fichiers',
        actionIcon: 'ads_click',
      },
      {
        title: 'Le document analysé',
        description:
          "Votre texte s'affiche dans cette zone avec toutes les erreurs surlignées en couleur. Chaque couleur correspond à un type d'erreur différent.",
        annotation: 'Votre texte apparaît ici',
        target: '.document-page',
        position: 'right',
        tip: 'Les erreurs sont colorées selon leur type : orange (Syntaxe), vert (Ponctuation), bleu (Usage), rouge (Grammaire), turquoise (Orthographe).',
      },
      {
        title: 'Zoom du document',
        description:
          'Ajustez la taille du texte pour un confort de lecture optimal. Utilisez les raccourcis clavier pour zoomer rapidement sans quitter le clavier.',
        annotation: 'Zoomez ici !',
        target: '.q-btn-group',
        position: 'bottom',
        offset: 60,
        keys: [
          { key: 'A', description: 'Agrandir le texte', color: 'blue' },
          { key: 'Z', description: 'Réduire le texte', color: 'blue' },
        ],
        tip: "Vous pouvez aussi utiliser les boutons + et - dans la barre d'outils.",
      },
      {
        title: 'Le panneau des erreurs',
        description:
          "Toutes les erreurs détectées sont listées dans ce panneau. Vous pouvez les trier par position dans le texte ou par type d'erreur.",
        annotation: 'Liste des erreurs à valider',
        target: '.errors-panel',
        position: 'left',
        offsetX: -100,
        action: 'Cliquez sur une erreur pour la sélectionner',
        actionIcon: 'touch_app',
      },
      {
        title: 'Navigation au clavier',
        description:
          "Naviguez rapidement entre les erreurs sans utiliser la souris ! Les flèches vous permettent de passer d'une erreur à l'autre instantanément.",
        annotation: 'Navigation ultra-rapide !',
        target: '.errors-panel',
        position: 'left',
        offsetX: -100,
        offsetY: -200,
        keys: [
          { key: '↑', description: 'Erreur précédente', color: 'grey' },
          { key: '↓', description: 'Erreur suivante', color: 'grey' },
          { key: '←', description: 'Erreur précédente', color: 'grey' },
          { key: '→', description: 'Erreur suivante', color: 'grey' },
        ],
        tip: 'Les flèches gauche/droite et haut/bas fonctionnent de la même manière.',
      },
      {
        title: 'Sélectionner une erreur',
        description:
          "Cliquez sur une erreur dans la liste pour la sélectionner. L'erreur sera mise en évidence dans le texte et un popup apparaîtra avec les détails.",
        annotation: 'Cliquez ici !',
        target: '.error-card',
        position: 'left',
        offsetX: -80,
        action: "Cliquez sur une carte d'erreur pour la sélectionner",
        actionIcon: 'touch_app',
        onEnter: 'deselectError',
        clickAction: 'selectFirstError',
        tip: "L'erreur sélectionnée est surlignée en couleur dans le panneau et dans le texte.",
      },
      {
        title: "Le popup d'erreur",
        description:
          "Quand une erreur est sélectionnée, un popup apparaît au-dessus du texte avec tous les détails : type d'erreur, description, et suggestions de correction.",
        annotation: "Détails de l'erreur",
        target: '.error-popup',
        secondaryTarget: '.error-card-selected',
        position: 'top',
        offset: 40,
        tip: "Le popup affiche le type d'erreur, sa description et les suggestions de correction si disponibles.",
      },
      {
        title: 'Confirmer une erreur',
        description:
          "Quand une erreur est réellement une faute à corriger, confirmez-la avec la touche E. L'erreur sera marquée d'un coche vert ✓",
        annotation: 'Touche magique !',
        target: '.document-page',
        position: 'top',
        keys: [{ key: 'E', description: "Confirmer l'erreur sélectionnée", color: 'green' }],
        action: "Appuyez sur E pour valider l'erreur comme correcte",
        actionIcon: 'check_circle',
      },
      {
        title: 'Rejeter un faux positif',
        description:
          "Si l'erreur détectée n'en est pas vraiment une (faux positif), rejetez-la avec la touche R. Vous pourrez ajouter une justification optionnelle.",
        annotation: 'Pour les faux positifs',
        target: '.document-page',
        position: 'top',
        keys: [{ key: 'R', description: "Rejeter l'erreur (faux positif)", color: 'red' }],
        action: "Appuyez sur R pour marquer l'erreur comme faux positif",
        actionIcon: 'cancel',
      },
      {
        title: 'Validation au clic',
        description:
          'Vous pouvez aussi valider les erreurs directement dans le texte ! Clic gauche pour confirmer, clic droit pour rejeter.',
        annotation: 'Cliquez sur les erreurs !',
        target: '.document-content',
        position: 'top',
        action: 'Clic gauche = Confirmer · Clic droit = Rejeter',
        actionIcon: 'mouse',
        tip: 'Le clic droit ouvre également un champ pour saisir une justification.',
      },
      {
        title: "Consulter les détails d'une règle",
        description:
          "Chaque erreur est liée à une règle linguistique. Cliquez sur l'identifiant de la règle pour voir ses détails complets.",
        annotation: "Plus d'infos ici",
        target: '.rule-id-link',
        position: 'bottom',
        offset: 60,
        keys: [{ key: 'F1', description: 'Ouvrir les détails de la règle', color: 'blue' }],
        action: 'Cliquez sur le code de la règle ou appuyez sur F1',
      },
      {
        title: 'Réinitialiser les validations',
        description:
          'Besoin de recommencer ? Ce bouton efface toutes vos validations (confirmations et rejets) pour le document en cours.',
        annotation: 'Recommencer !',
        target: '[data-tutorial="reset-btn"]',
        position: 'bottom',
        offset: 60,
        action: 'Cliquez pour effacer toutes les validations',
      },
      {
        title: 'Vous êtes prêt !',
        description:
          'Vous connaissez maintenant toutes les fonctionnalités pour valider efficacement les erreurs. Utilisez le clavier pour un flux de travail optimal !',
        annotation: null,
        target: null,
        keys: [
          { key: 'E', description: 'Confirmer', color: 'green' },
          { key: 'R', description: 'Rejeter', color: 'red' },
          { key: '← ↑', description: 'Erreur précédente', color: 'grey' },
          { key: '→ ↓', description: 'Erreur suivante', color: 'grey' },
          { key: 'Échap', description: 'Désélectionner', color: 'grey' },
        ],
        tip: 'Relancez ce tutoriel à tout moment via le bouton "?" dans la barre d\'outils !',
      },
    ]

    const currentStepData = computed(() => steps[currentStep.value] || {})

    // Calcul du style du spotlight
    const spotlightStyle = computed(() => {
      if (!targetRect.value) return {}

      const padding = 12
      return {
        top: `${targetRect.value.top - padding}px`,
        left: `${targetRect.value.left - padding}px`,
        width: `${targetRect.value.width + padding * 2}px`,
        height: `${targetRect.value.height + padding * 2}px`,
      }
    })

    // Calcul du style du spotlight secondaire
    const secondarySpotlightStyle = computed(() => {
      if (!secondaryTargetRect.value) return {}

      const padding = 8
      return {
        top: `${secondaryTargetRect.value.top - padding}px`,
        left: `${secondaryTargetRect.value.left - padding}px`,
        width: `${secondaryTargetRect.value.width + padding * 2}px`,
        height: `${secondaryTargetRect.value.height + padding * 2}px`,
      }
    })

    // Calcul du style de l'annotation
    const annotationStyle = computed(() => {
      if (!targetRect.value || !currentStepData.value.annotation) return { display: 'none' }

      const pos = currentStepData.value.position || 'top'
      const rect = targetRect.value
      const offset = currentStepData.value.offset || 20
      const offsetX = currentStepData.value.offsetX || 0
      const offsetY = currentStepData.value.offsetY || 0

      let style = {}

      switch (pos) {
        case 'top':
          style = {
            left: `${rect.left + rect.width / 2 + offsetX}px`,
            top: `${rect.top - offset + offsetY}px`,
            transform: 'translate(-50%, -100%)',
          }
          break
        case 'bottom':
          style = {
            left: `${rect.left + rect.width / 2 + offsetX}px`,
            top: `${rect.bottom + offset + offsetY}px`,
            transform: 'translate(-50%, 0)',
          }
          break
        case 'left':
          style = {
            left: `${rect.left - offset + offsetX}px`,
            top: `${rect.top + rect.height / 2 + offsetY}px`,
            transform: 'translate(-100%, -50%)',
          }
          break
        case 'right':
          style = {
            left: `${rect.right + offset + offsetX}px`,
            top: `${rect.top + rect.height / 2 + offsetY}px`,
            transform: 'translate(0, -50%)',
          }
          break
      }

      return style
    })

    // Obtenir le path SVG de la flèche selon la position
    const getArrowPath = () => {
      const pos = currentStepData.value.position || 'top'
      switch (pos) {
        case 'top':
          return 'M50,0 Q60,30 50,55 M45,45 L50,55 L55,45'
        case 'bottom':
          return 'M50,60 Q40,30 50,5 M45,15 L50,5 L55,15'
        case 'left':
          return 'M0,30 Q40,25 95,30 M85,25 L95,30 L85,35'
        case 'right':
          return 'M100,30 Q60,35 5,30 M15,25 L5,30 L15,35'
        default:
          return 'M50,0 Q60,30 50,55 M45,45 L50,55 L55,45'
      }
    }

    // Mise à jour de la position de l'élément ciblé
    const updateTargetRect = async () => {
      await nextTick()

      if (!currentStepData.value.target) {
        targetRect.value = null
        secondaryTargetRect.value = null
        return
      }

      const el = document.querySelector(currentStepData.value.target)
      if (el) {
        targetRect.value = el.getBoundingClientRect()

        // Scroller vers l'élément si nécessaire
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      } else {
        targetRect.value = null
      }

      // Mise à jour du spotlight secondaire
      if (currentStepData.value.secondaryTarget) {
        const secondaryEl = document.querySelector(currentStepData.value.secondaryTarget)
        if (secondaryEl) {
          secondaryTargetRect.value = secondaryEl.getBoundingClientRect()
        } else {
          secondaryTargetRect.value = null
        }
      } else {
        secondaryTargetRect.value = null
      }
    }

    // Navigation
    const nextStep = () => {
      if (currentStep.value < steps.length - 1) {
        // Vérifier si l'étape actuelle requiert une sélection d'erreur avant d'avancer
        if (currentStepData.value.clickAction === 'selectFirstError' && !props.isErrorSelected) {
          // Afficher le rappel de cliquer
          showClickReminder.value = true
          setTimeout(() => {
            showClickReminder.value = false
          }, 3000)
          return
        }
        showClickReminder.value = false
        currentStep.value++
      }
    }

    const previousStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--
      }
    }

    const goToStep = (index) => {
      currentStep.value = index
    }

    const close = () => {
      emit('update:modelValue', false)
      currentStep.value = 0
    }

    const handleOverlayClick = () => {
      // Ne pas fermer en cliquant sur l'overlay
    }

    // Gestion du clic sur le spotlight (zone éclairée)
    const handleSpotlightClick = () => {
      if (currentStepData.value.clickAction) {
        emit('spotlight-click', currentStepData.value.clickAction)
        // Avancer automatiquement à l'étape suivante après le clic
        // Délai de 600ms pour laisser le temps au popup de s'afficher
        setTimeout(() => {
          nextStep()
        }, 600)
      }
    }

    // Gestion du clavier
    const handleKeyDown = (e) => {
      if (!props.modelValue) return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          previousStep()
          break
        case 'Escape':
          e.preventDefault()
          close()
          break
        case 'Enter':
          e.preventDefault()
          if (currentStep.value < steps.length - 1) {
            nextStep()
          } else {
            close()
          }
          break
      }
    }

    // Watchers
    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal) {
          // Désélectionner toute erreur au lancement du tutoriel
          emit('step-enter', 'deselectError')
          currentStep.value = 0
          nextTick(() => updateTargetRect())
        }
      },
    )

    watch(currentStep, () => {
      updateTargetRect()
      // Émettre l'événement onEnter si l'étape en a un
      if (currentStepData.value.onEnter) {
        emit('step-enter', currentStepData.value.onEnter)
      }
    })

    // Lifecycle
    onMounted(() => {
      document.addEventListener('keydown', handleKeyDown)
      window.addEventListener('resize', updateTargetRect)
      window.addEventListener('scroll', updateTargetRect, true)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    })

    return {
      currentStep,
      steps,
      currentStepData,
      spotlightStyle,
      secondarySpotlightStyle,
      secondaryTargetRect,
      annotationStyle,
      getArrowPath,
      nextStep,
      previousStep,
      goToStep,
      close,
      handleOverlayClick,
      handleSpotlightClick,
      showClickReminder,
    }
  },
})
</script>

<style>
/* Import de la police manuscrite */
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap');
</style>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.5);
}

/* Transition d'entrée/sortie */
.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.3s ease;
}

.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}

/* Spotlight - zone éclairée */
.tutorial-spotlight {
  position: fixed;
  border-radius: 8px;
  box-shadow:
    0 0 0 9999px rgba(0, 0, 0, 0.75),
    0 0 30px 5px rgba(66, 165, 245, 0.5);
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100000;
}

/* Spotlight cliquable */
.tutorial-spotlight.spotlight-clickable {
  pointer-events: auto;
  cursor: pointer;
}

.tutorial-spotlight.spotlight-clickable:hover {
  box-shadow:
    0 0 0 9999px rgba(0, 0, 0, 0.75),
    0 0 40px 10px rgba(66, 165, 245, 0.8);
}

/* Spotlight secondaire - pour mettre en évidence un deuxième élément */
.tutorial-spotlight-secondary {
  position: fixed;
  border-radius: 8px;
  box-shadow:
    0 0 0 4px rgba(255, 235, 59, 0.8),
    0 0 20px 8px rgba(255, 235, 59, 0.5);
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100001;
  animation: secondary-pulse 1.5s ease-in-out infinite;
}

@keyframes secondary-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 4px rgba(255, 235, 59, 0.8),
      0 0 20px 8px rgba(255, 235, 59, 0.5);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(255, 235, 59, 1),
      0 0 30px 12px rgba(255, 235, 59, 0.7);
  }
}

/* Annotation manuscrite */
.tutorial-annotation {
  position: fixed;
  z-index: 100001;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.annotation-text {
  font-family: 'Caveat', cursive;
  font-size: 28px;
  font-weight: 600;
  color: #ffeb3b;
  text-shadow:
    2px 2px 4px rgba(0, 0, 0, 0.8),
    -1px -1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%);
  border-radius: 8px;
  border: 2px dashed rgba(255, 235, 59, 0.6);
  transform: rotate(-3deg);
  animation: annotation-bounce 2s ease-in-out infinite;
}

.annotation-arrow {
  position: absolute;
  width: 80px;
  height: 50px;
  color: #ffeb3b;
  filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.5));
}

/* Position des flèches selon l'orientation */
.annotation-top .annotation-arrow {
  bottom: -45px;
  left: 50%;
  transform: translateX(-50%);
}

.annotation-bottom .annotation-arrow {
  top: -45px;
  left: 50%;
  transform: translateX(-50%) rotate(180deg);
}

.annotation-left .annotation-arrow {
  right: -75px;
  top: 50%;
  transform: translateY(-50%);
}

.annotation-right .annotation-arrow {
  left: -75px;
  top: 50%;
  transform: translateY(-50%);
}

@keyframes annotation-bounce {
  0%,
  100% {
    transform: rotate(-3deg) translateY(0);
  }
  50% {
    transform: rotate(-3deg) translateY(-5px);
  }
}

/* Panneau principal */
.tutorial-panel {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
  border-radius: 0;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  z-index: 100002;
  overflow: hidden;
  animation: panel-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tutorial-panel.panel-centered {
  bottom: auto;
  top: 50%;
  transform: translate(-50%, -50%);
}

@keyframes panel-slide-up {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Header */
.tutorial-header {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  background: #212121;
  color: white;
}

.tutorial-step-indicator {
  display: flex;
  align-items: baseline;
  margin-right: 16px;
  font-family: 'Caveat', cursive;
}

.step-current {
  font-size: 32px;
  font-weight: 700;
  color: #ffeb3b;
}

.step-separator {
  font-size: 20px;
  margin: 0 4px;
  opacity: 0.7;
}

.step-total {
  font-size: 20px;
  opacity: 0.7;
}

.tutorial-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
}

.tutorial-close {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.tutorial-close:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

/* Contenu */
.tutorial-content {
  padding: 24px;
}

.tutorial-description {
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  margin: 0 0 20px 0;
}

/* Touches clavier */
.tutorial-keys {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.keys-label {
  font-size: 13px;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.keys-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.keyboard-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 40px;
  padding: 0 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%);
  border: 1px solid #bdbdbd;
  border-radius: 8px;
  box-shadow:
    0 3px 0 #9e9e9e,
    0 4px 8px rgba(0, 0, 0, 0.15);
  color: #424242;
}

.keyboard-key.key-green {
  background: linear-gradient(180deg, #66bb6a 0%, #43a047 100%);
  border-color: #388e3c;
  box-shadow:
    0 3px 0 #2e7d32,
    0 4px 8px rgba(0, 0, 0, 0.15);
  color: white;
}

.keyboard-key.key-red {
  background: linear-gradient(180deg, #ef5350 0%, #e53935 100%);
  border-color: #d32f2f;
  box-shadow:
    0 3px 0 #c62828,
    0 4px 8px rgba(0, 0, 0, 0.15);
  color: white;
}

.keyboard-key.key-blue {
  background: linear-gradient(180deg, #42a5f5 0%, #1e88e5 100%);
  border-color: #1976d2;
  box-shadow:
    0 3px 0 #1565c0,
    0 4px 8px rgba(0, 0, 0, 0.15);
  color: white;
}

.keyboard-key.key-grey {
  background: linear-gradient(180deg, #78909c 0%, #546e7a 100%);
  border-color: #455a64;
  box-shadow:
    0 3px 0 #37474f,
    0 4px 8px rgba(0, 0, 0, 0.15);
  color: white;
}

.key-description {
  font-size: 14px;
  color: #546e7a;
}

/* Action */
.tutorial-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-radius: 12px;
  border-left: 4px solid #ff9800;
  margin-bottom: 16px;
}

.action-icon {
  color: #e65100;
  font-size: 24px;
}

.action-text {
  font-size: 14px;
  font-weight: 500;
  color: #e65100;
}

/* Astuce */
.tutorial-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 12px;
  border-left: 4px solid #4caf50;
}

.tip-icon {
  color: #388e3c;
  font-size: 22px;
}

.tip-text {
  font-size: 14px;
  color: #2e7d32;
  line-height: 1.5;
}

/* Rappel de cliquer */
.tutorial-click-reminder {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%);
  border-radius: 12px;
  border-left: 4px solid #ff9800;
  margin-top: 16px;
  animation: reminder-shake 0.5s ease-in-out;
}

.reminder-icon {
  color: #e65100;
  font-size: 24px;
  animation: reminder-pulse 1s ease-in-out infinite;
}

.reminder-text {
  font-size: 14px;
  font-weight: 500;
  color: #e65100;
  line-height: 1.4;
}

@keyframes reminder-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-5px);
  }
  40% {
    transform: translateX(5px);
  }
  60% {
    transform: translateX(-5px);
  }
  80% {
    transform: translateX(5px);
  }
}

@keyframes reminder-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.reminder-fade-enter-active,
.reminder-fade-leave-active {
  transition: all 0.3s ease;
}

.reminder-fade-enter-from,
.reminder-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Footer */
.tutorial-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

.tutorial-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.tutorial-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #616161;
  border: 1px solid #e0e0e0;
}

.btn-secondary:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #bdbdbd;
}

.btn-primary {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #1e88e5 0%, #1976d2 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #43a047 0%, #388e3c 100%);
  color: white;
}

.btn-success:hover {
  background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(67, 160, 71, 0.4);
}

.tutorial-btn .material-icons {
  font-size: 18px;
}

/* Progress dots */
.tutorial-progress {
  display: flex;
  gap: 8px;
}

.progress-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.progress-dot:hover {
  background: #bdbdbd;
  transform: scale(1.2);
}

.progress-dot.completed {
  background: #66bb6a;
}

.progress-dot.active {
  background: #1976d2;
  transform: scale(1.3);
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.3);
}

/* Keyboard hint */
.tutorial-keyboard-hint {
  text-align: center;
  padding: 12px 24px;
  font-size: 12px;
  color: #757575;
  background: #f5f5f5;
}

.tutorial-keyboard-hint kbd {
  display: inline-block;
  padding: 2px 6px;
  font-family: 'Consolas', monospace;
  font-size: 11px;
  background: #e0e0e0;
  border: 1px solid #bdbdbd;
  border-radius: 3px;
  margin: 0 2px;
  color: #424242;
}

/* Responsive */
@media (max-width: 600px) {
  .tutorial-panel {
    width: 95%;
    bottom: 20px;
    border-radius: 16px;
  }

  .tutorial-header {
    padding: 16px 20px;
  }

  .tutorial-title {
    font-size: 16px;
  }

  .tutorial-content {
    padding: 20px;
  }

  .tutorial-description {
    font-size: 15px;
  }

  .annotation-text {
    font-size: 22px;
    padding: 6px 12px;
  }

  .keys-container {
    flex-direction: column;
  }

  .tutorial-footer {
    flex-wrap: wrap;
    gap: 12px;
  }

  .tutorial-progress {
    order: -1;
    width: 100%;
    justify-content: center;
  }
}
</style>

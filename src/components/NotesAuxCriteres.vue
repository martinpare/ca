<template>
  <div class="row justify-center q-gutter-md">
    <div class="text-center">
      <div class="text-caption">Critère 4</div>
      <q-badge
        :color="getNoteColor(scores.critere4.note)"
        class="text-h5 q-pa-sm"
        style="min-width: 50px; display: flex; justify-content: center; align-items: center;"
      >
        {{ scores.critere4.note }}
      </q-badge>
      <div class="text-caption" :class="pointsClass">-{{ scores.critere4.points }} pts</div>
      <div class="text-caption text-grey">({{ scores.critere4.erreurs }} erreurs)</div>
    </div>
    <div class="text-center">
      <div class="text-caption">Critère 5</div>
      <q-badge
        :color="getNoteColor(scores.critere5.note)"
        class="text-h5 q-pa-sm"
        style="min-width: 50px; display: flex; justify-content: center; align-items: center;"
      >
        {{ scores.critere5.note }}
      </q-badge>
      <div class="text-caption" :class="pointsClass">-{{ scores.critere5.points }} pts</div>
      <div class="text-caption text-grey">({{ scores.critere5.erreurs }} erreurs)</div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'NotesAuxCriteres',

  props: {
    scores: {
      type: Object,
      required: true,
    },
    type: {
      type: String,
      default: 'avant',
      validator: (value) => ['avant', 'apres'].includes(value),
    },
  },

  setup(props) {
    const pointsClass = computed(() => {
      return props.type === 'avant' ? 'text-negative' : 'text-positive'
    })

    const getNoteColor = (note) => {
      if (!note) return 'grey'
      if (note === 'A') return 'positive'
      if (note === 'B') return 'info'
      if (note === 'C') return 'warning'
      return 'negative'
    }

    return {
      pointsClass,
      getNoteColor,
    }
  },
})
</script>

<style scoped>
.q-badge {
  font-size: 1rem;
}
</style>

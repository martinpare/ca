<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          v-production
        />

        <q-toolbar-title> Correction assistée </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered v-production>
      <q-list>
        <q-item-label header> Pages </q-item-label>

        <q-item clickable to="/" exact>
          <q-item-section avatar>
            <q-icon name="play_circle" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Traitement en Lot</q-item-label>
            <q-item-label caption>Correction de textes</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/viewer">
          <q-item-section avatar>
            <q-icon name="description" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Visualisation des textes</q-item-label>
            <q-item-label caption>Lire les textes corrigés</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/comparaison">
          <q-item-section avatar>
            <q-icon name="rate_review" color="deep-purple" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Comparaison des révisions</q-item-label>
            <q-item-label caption>Analyser les verdicts du réviseur</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MainLayout',

  data() {
    return {
      leftDrawerOpen: false,
    }
  },

  methods: {
    toggleLeftDrawer() {
      this.leftDrawerOpen = !this.leftDrawerOpen
    },
  },
})
</script>

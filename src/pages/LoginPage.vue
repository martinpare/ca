<template>
  <div class="login-container">
    <!-- Login card -->
    <div class="login-card">
      <!-- Logo / Brand -->
      <div class="brand-section">
        <div class="">
          <q-img src="/images/CorrectionStudio.png" width="250px"></q-img>
        </div>
        <h1 class="brand-title">Module de correction assisté</h1>
        <p class="brand-description">
          Cette preuve de concept vise à
          <strong>évaluer la performance de l'intelligence artificielle</strong> dans le cadre d'une
          expérimentation rigoureuse pour la correction de l'épreuve ministérielle de français,
          langue d'enseignement (5e secondaire). Le projet consiste en une
          <strong>comparaison méthodologique rigoureuse</strong> entre les résultats de la
          correction humaine et la correction automatisée par l'IA au sein de la plateforme
          <strong>Correction Studio</strong>.
        </p>
      </div>

      <!-- Form -->
      <q-form @submit.prevent="onSubmit" class="login-form">
        <!-- Password field -->
        <div class="input-group">
          <q-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Mot de passe"
            :rules="[(val) => !!val || 'Mot de passe requis']"
            lazy-rules
            class=""
          >
            <template v-slot:prepend>
              <q-icon name="lock" color="primary" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>
        </div>

        <!-- Submit button -->
        <div class="text-center">
          <q-btn
            type="submit"
            label="Se connecter"
            color="primary"
            :loading="loading"
            style="width: 200px"
          >
            <template v-slot:loading>
              <q-spinner-dots />
            </template>
          </q-btn>
        </div>
      </q-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()

const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

const HARDCODED_PASSWORD = 'correction2025'

const onSubmit = async () => {
  loading.value = true

  // Simulation d'authentification
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (password.value !== HARDCODED_PASSWORD) {
    loading.value = false
    $q.notify({
      type: 'negative',
      message: 'Mot de passe incorrect',
      position: 'top',
      timeout: 2000,
    })
    return
  }

  loading.value = false

  $q.notify({
    type: 'positive',
    message: 'Connexion réussie !',
    position: 'top',
    timeout: 2000,
  })

  // Redirection après connexion
  router.push('/home')
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    #8fcd9a 0%,
    #b5d488 25%,
    #e0c878 50%,
    #e8b68a 75%,
    #e8a0a0 100%
  );
  position: relative;
  overflow: hidden;
  padding: 20px;
}

// Login card with glassmorphism
.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 48px 40px;
  width: 100%;
  max-width: 620px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 10;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Brand section
.brand-section {
  text-align: center;
  margin-bottom: 36px;
}

.logo-container {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
  animation: pulse 2s infinite ease-in-out;

  .logo-icon {
    font-size: 40px;
    color: white;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
  }
}

.brand-title {
  font-size: 28px;
  font-weight: 500;
  color: #1a1a2e;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.brand-description {
  font-size: 14px;
  color: #3c3c3c;
  margin: 0;
  line-height: 1.6;
}

// Form styles
.login-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group {
  margin-bottom: 8px;
}

.custom-input {
  :deep(.q-field__control) {
    border-radius: 12px;
    background: #f8fafc;
    transition: all 0.3s ease;

    &:hover {
      background: #f1f5f9;
    }
  }

  :deep(.q-field--focused .q-field__control) {
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  }

  :deep(.q-field__label) {
    font-weight: 500;
  }
}

// Form options
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 20px;

  :deep(.q-checkbox__label) {
    font-size: 14px;
    color: #4b5563;
  }
}

.forgot-link {
  font-size: 14px;
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;

  &:hover {
    color: #764ba2;
    text-decoration: underline;
  }
}

// Submit button
.submit-btn {
  width: 100%;
  height: 52px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: all 0.3s ease;
  margin-top: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

// Divider
.divider {
  display: flex;
  align-items: center;
  margin: 28px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  span {
    padding: 0 16px;
    font-size: 13px;
    color: #9ca3af;
    white-space: nowrap;
  }
}

// Social buttons
.social-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.social-btn {
  width: 56px;
  height: 56px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
    transform: translateY(-3px);
  }

  &.github {
    color: #333;
  }

  &.apple {
    color: #000;
  }
}

// Sign up text
.signup-text {
  text-align: center;
  margin-top: 28px;
  font-size: 14px;
  color: #6b7280;
}

.signup-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
  transition: color 0.2s;

  &:hover {
    color: #764ba2;
    text-decoration: underline;
  }
}

// Responsive
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
    border-radius: 20px;
  }

  .brand-title {
    font-size: 24px;
  }

  .logo-container {
    width: 64px;
    height: 64px;

    .logo-icon {
      font-size: 32px;
    }
  }

  .social-btn {
    width: 48px;
    height: 48px;
  }
}
</style>

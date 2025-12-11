import { boot } from 'quasar/wrappers'

const isLocalhost = () => {
  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export default boot(({ app }) => {
  // Directive v-localhost : affiche l'élément uniquement en mode local
  app.directive('localhost', {
    mounted(el, binding) {
      const showOnLocalhost = binding.value !== false
      const shouldShow = showOnLocalhost ? isLocalhost() : !isLocalhost()

      if (!shouldShow) {
        el.style.display = 'none'
      }
    },
    updated(el, binding) {
      const showOnLocalhost = binding.value !== false
      const shouldShow = showOnLocalhost ? isLocalhost() : !isLocalhost()

      if (!shouldShow) {
        el.style.display = 'none'
      } else {
        el.style.display = ''
      }
    }
  })

  // Directive v-production : affiche l'élément uniquement en production
  app.directive('production', {
    mounted(el, binding) {
      const showOnProduction = binding.value !== false
      const shouldShow = showOnProduction ? !isLocalhost() : isLocalhost()

      if (!shouldShow) {
        el.style.display = 'none'
      }
    },
    updated(el, binding) {
      const showOnProduction = binding.value !== false
      const shouldShow = showOnProduction ? !isLocalhost() : isLocalhost()

      if (!shouldShow) {
        el.style.display = 'none'
      } else {
        el.style.display = ''
      }
    }
  })
})

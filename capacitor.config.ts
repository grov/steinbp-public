import type { CapacitorConfig } from '@capacitor/cli'

// L'APK Android ouvre directement le site de prod : chaque déploiement met
// donc l'app à jour, sans réinstaller. Une nouvelle APK n'est nécessaire que
// pour changer l'icône, le nom ou une permission.
const config: CapacitorConfig = {
  appId: 'com.steinlab.steinbp',
  appName: 'SteinBP',
  webDir: 'dist',
  backgroundColor: '#09090b',
  server: {
    url: 'https://steinbp.fr',
  },
  android: {
    allowMixedContent: false,
  },
}

export default config

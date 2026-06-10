import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.bolt.app',
  appName: 'Bolt.diy',
  webDir: 'www',
  server: {
    // Allow cleartext and mixed content for development
    cleartext: true,
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#1C1C1C',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1C1C1C',
      showSpinner: true,
      spinnerColor: '#208AEF',
    },
  },
};

export default config;

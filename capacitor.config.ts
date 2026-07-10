import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solarflow.management',
  appName: 'Meseret Mare Solar',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

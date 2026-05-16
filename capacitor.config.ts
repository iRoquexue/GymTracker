import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymtracker.app',
  appName: 'GymTracker',
  webDir: 'dist/mobile',

  android: {
    webContentsDebuggingEnabled: true,
  }
};

export default config;

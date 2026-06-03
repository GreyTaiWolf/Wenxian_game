import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xiuxian.textrpg',
  appName: '问仙文字RPG',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

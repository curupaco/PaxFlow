import { defineConfig, loadEnv, Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function generateVersionPlugin(buildTimestamp: number): Plugin {
  return {
    name: 'generate-version-plugin',
    buildStart() {
      const versionData = {
        version: `1.0.0-${buildTimestamp}`,
        buildTime: buildTimestamp,
        timestamp: new Date(buildTimestamp).toISOString(),
      };
      const publicDir = resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(
        resolve(publicDir, 'version.json'),
        JSON.stringify(versionData, null, 2)
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildTime = Date.now();
  return {
    plugins: [generateVersionPlugin(buildTime)],
    define: {
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET),
      '__PAXFLOW_BUILD_TIME__': JSON.stringify(buildTime),
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          todo: resolve(__dirname, 'todo.html'),
        },
      },
    },
  };
});



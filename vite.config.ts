import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  plugins: [
    angular(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript']
    })
  ]
});

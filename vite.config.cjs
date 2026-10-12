const { defineConfig } = require('vite');

module.exports = defineConfig({
  server: {
    proxy: {
      '/characters': 'http://localhost:3000',
      '/supportcards': 'http://localhost:3000',
      '/builds': 'http://localhost:3000',
    },
  },
});

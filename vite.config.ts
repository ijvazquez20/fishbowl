import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  // Served from https://ijvazquez20.github.io/fishbowl/
  base: '/fishbowl/',
  plugins: [preact()],
});

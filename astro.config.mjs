import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Inyectamos React para la interactividad del carrito
  integrations: [react()],

  // Configuramos Tailwind a través del nuevo ecosistema Vite 7
  vite: {
    plugins: [tailwindcss()],
  },

  // 1. BLINDAJE DE SEGURIDAD (CSP)
  // Genera hashes automáticamente para scripts/estilos dinámicos
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        // Permitimos imágenes desde Supabase u otros CDNs
        "img-src 'self' data: https:", 
        // Permitimos conexiones a la API de Supabase
        "connect-src 'self' https://*.supabase.co" 
      ],
    },
  },

  // 2. RENDIMIENTO DE HARDWARE (RK3288)
  experimental: {
    queuedRendering: {
      enabled: true, // Optimiza el uso de RAM al renderizar
    },
  },

  // 3. TIPOGRAFÍAS OFFLINE-FIRST
  // Astro descargará la fuente y la servirá localmente
  fonts: [
    {
      name: 'Roboto',
      cssVariable: '--font-roboto',
      provider: fontProviders.fontsource(),
    },
  ],
});
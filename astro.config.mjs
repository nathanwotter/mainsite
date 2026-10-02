import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import sanity from '@sanity/astro';
import { sanityConfig } from './src/utils/sanity-client';

// https://astro.build/config
export default defineConfig({
    site: 'https://otteradventures.org',
    image: {
        domains: ['cdn.sanity.io']
    },
    integrations: [
        sanity(sanityConfig),
        sitemap({
            filter: (page) => !page.includes('/coaching/') && !page.includes('/recxr/diagnostics/')
        })
    ],
    vite: {
        plugins: [tailwindcss()],
        server: {
            hmr: { path: '/vite-hmr/' },
            allowedHosts: ['.netlify.app']
        }
    },
    server: {
        port: 3000
    }
});

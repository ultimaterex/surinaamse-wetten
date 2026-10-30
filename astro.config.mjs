import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://ultimaterex.github.io',
  base: '/surinaamse-wetten',
  integrations: [
    starlight({
      title: 'Surinaamse Wetten',
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'Nederlands',
          lang: 'nl',
        },
      },
      pagefind: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { label: 'Overzicht', link: '/over' },
        {
          label: 'Burgerlijk- & Procesrecht',
          autogenerate: { directory: 'wetten/burgerlijk-procesrecht' },
        },
        {
          label: 'Arbeids- & Sociaal Recht',
          autogenerate: { directory: 'wetten/arbeid-sociaal' },
        },
        {
          label: 'Grond, Milieu & Grondstoffen',
          autogenerate: { directory: 'wetten/grond-milieu' },
        },
        {
          label: 'Bestuur, Justitie & Beroep',
          autogenerate: { directory: 'wetten/bestuur-organisatie' },
        },
        {
          label: 'Handels- & Financieel Recht',
          autogenerate: { directory: 'wetten/handels-financieel' },
        },
      ],
    }),
  ],
});

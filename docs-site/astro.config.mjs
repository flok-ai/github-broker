import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi'

export default defineConfig({
  site: 'https://flok-ai.github.io',
  base: '/github-broker',
  server: { port: 4000 },
  integrations: [
    starlight({
      title: 'GitHub token broker',
      plugins: [
        starlightOpenAPI([
          {
            base: 'http-api',
            schema: './openapi.json',
            sidebar: {
              label: 'HTTP API',
              collapsed: false,
            },
          },
        ]),
      ],
      sidebar: [
        { slug: 'index' },
        { slug: 'github-issuer' },
        { slug: 'kubernetes-adapters' },
        ...openAPISidebarGroups,
      ],
    }),
  ],
})

import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Posted - AI Content Creation Platform',
    short_name: 'Posted',
    description: 'Create viral TikTok carousels, videos, and strategies with AI.',
    start_url: '/',
    display: 'standalone',
    background_color: '#171717',
    theme_color: '#ddfc7b',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}

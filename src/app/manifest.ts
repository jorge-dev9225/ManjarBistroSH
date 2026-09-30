import type { MetadataRoute } from 'next'

// Permite "Agregar a pantalla de inicio" en el celular (cliente y dueño)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Manjar Bistro Sushi',
    short_name: 'Manjar',
    description: 'Pedí sushi online',
    start_url: '/',
    display: 'standalone',
    background_color: '#120a06',
    theme_color: '#120a06',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png' }],
  }
}

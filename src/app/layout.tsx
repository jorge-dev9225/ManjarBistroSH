import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'sonner'
import { siteUrl } from '@/lib/site'
import './globals.css'

const display = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-display' })
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'Manjar Bistro Sushi — Pedidos online', template: '%s · Manjar Bistro Sushi' },
  description:
    'Pedí sushi online: rolls, nigiri, temakis y ensaladas. Pagá con Mercado Pago o en efectivo y seguí tu pedido en tiempo real.',
  openGraph: {
    title: 'Manjar Bistro Sushi',
    description: 'Disfrutá la mejor experiencia en sushi. Pedí online.',
    locale: 'es_AR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#120a06',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans text-crema antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </body>
    </html>
  )
}

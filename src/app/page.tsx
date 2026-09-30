import { CartDrawer, MobileCartBar } from '@/components/CartDrawer'
import { Footer, Hero } from '@/components/Hero'
import { MenuView } from '@/components/MenuView'
import { SiteHeader } from '@/components/SiteHeader'
import { getPublicMenu } from '@/lib/menu'

// El menú se regenera cada 60 s y al instante cuando el dueño edita desde el panel
export const revalidate = 60

export default async function HomePage() {
  const { categories, products, settings } = await getPublicMenu()

  return (
    <>
      <SiteHeader />
      <main>
        <Hero settings={settings} />
        <MenuView categories={categories} products={products} abierto={settings.abierto} />
      </main>
      <Footer settings={settings} />
      <CartDrawer abierto={settings.abierto} pedidoMinimo={settings.pedido_minimo} />
      <MobileCartBar />
    </>
  )
}

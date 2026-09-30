import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/CheckoutForm'
import { SiteHeader } from '@/components/SiteHeader'
import { getPublicSettings } from '@/lib/menu'

export const metadata: Metadata = { title: 'Finalizar pedido', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const settings = await getPublicSettings()
  return (
    <>
      <SiteHeader showCart={false} />
      <main className="mx-auto max-w-5xl px-4 py-8 pb-20">
        <h1 className="mb-6 font-display text-3xl italic md:text-4xl">Finalizar pedido</h1>
        <CheckoutForm settings={settings} />
      </main>
    </>
  )
}

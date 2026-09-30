import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-6xl">🍣</p>
        <h1 className="mt-4 font-display text-3xl italic">No encontramos esta página</h1>
        <Link href="/" className="btn-primary mt-6">Volver al menú</Link>
      </div>
    </main>
  )
}

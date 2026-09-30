/** Marca simple del local (círculo rojo con vincha). Reemplazable por el logo oficial en /public/logo.png */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#c8102e" />
      <path d="M4 17c10-4 30-4 40 0v6c-10-3-30-3-40 0z" fill="#f3e4c7" />
      <path d="M8 27h32c-1 8-8 13-16 13S9 35 8 27z" fill="#120a06" opacity=".22" />
      <ellipse cx="17.5" cy="29" rx="5" ry="3.4" fill="#f3e4c7" />
      <ellipse cx="30.5" cy="29" rx="5" ry="3.4" fill="#f3e4c7" />
      <circle cx="18.5" cy="29.3" r="1.7" fill="#120a06" />
      <circle cx="29.5" cy="29.3" r="1.7" fill="#120a06" />
    </svg>
  )
}

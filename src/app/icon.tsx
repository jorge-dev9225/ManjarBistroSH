import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#120a06' }}>
        <div style={{ width: 440, height: 440, borderRadius: 9999, background: '#c8102e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3e4c7', fontSize: 280, fontWeight: 700, fontStyle: 'italic' }}>
          M
        </div>
      </div>
    ),
    size,
  )
}

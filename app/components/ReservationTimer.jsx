'use client'

import { useCart, fmtTimeRemaining } from '../context/CartContext'

const ORANGE = '#fd7e0d'
const DARK = '#0e1e32'

export default function ReservationTimer() {
  const { checkoutReservation, timeLeft } = useCart()

  if (!checkoutReservation) return null

  return (
    <div
        style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',

        zIndex: 2147483000,

        background: '#0e1e32',
        color: '#ffffff',

        padding: '14px 24px',
        borderRadius: 14,

        border: '2px solid #fd7e0d',
        boxShadow: '0 10px 30px rgba(253,126,13,0.35)',

        display: 'flex',
        alignItems: 'center',
        gap: 12,

        fontSize: 17,
        fontWeight: 800,
        letterSpacing: '0.3px',
        }}
    >
      <span>⏱ Reservation:</span>

    <span
    style={{
        color: '#ff9d2b',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 20,
        fontWeight: 900,
        textShadow: '0 0 10px rgba(253,126,13,0.6)',
    }}
    >
    {fmtTimeRemaining(timeLeft)}
    </span>
    </div>
  )
}
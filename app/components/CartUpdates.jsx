'use client'

export default function CartUpdates({ messages, onClose }) {
  if (!messages.length) return null

  return (
    <div
      style={{
        background: '#fff8e6',
        border: '1px solid #ffd66b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        position: 'relative'
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 18,
          color: '#555'
        }}
      >
        ✕
      </button>

      <div
        style={{
          fontWeight: 700,
          marginBottom: 10,
          color: '#8a5a00'
        }}
      >
        ⚠️ Your cart has been updated
      </div>

      <ul
        style={{
          margin: 0,
          paddingLeft: 18
        }}
      >
        {messages.map((msg, i) => (
          <li
            key={i}
            style={{
              marginBottom: 8,
              color: '#5b4a00'
            }}
          >
            {msg}
          </li>
        ))}
      </ul>
    </div>
  )
}
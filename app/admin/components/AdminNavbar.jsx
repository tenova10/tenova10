'use client'

const ORANGE = '#fd7e0d'
const DARK = '#0e1e32'

export default function AdminNavbar({
  tab,
  setTab,
  logout,
}) {
  return (
    <nav style={{ background: DARK, padding: '0 24px' }}>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 58,
        }}
      >
        <span
          style={{
            color: 'white',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          tenova
          <span style={{ color: ORANGE }}>10</span>

          <span
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontWeight: 400,
              fontSize: 13,
              marginLeft: 8,
            }}
          >
            Admin
          </span>
        </span>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          {['products', 'orders'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background:
                  tab === t
                    ? ORANGE
                    : 'rgba(255,255,255,0.08)',

                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '7px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}

          <a
            href="/"
            target="_blank"
            style={{
              padding: '7px 14px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 12,
              textDecoration: 'none',
            }}
          >
            View Store ↗
          </a>

          <button
            onClick={logout}
            style={{
              padding: '7px 14px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              background: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
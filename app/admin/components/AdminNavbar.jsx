'use client'

const ORANGE = '#fd7e0d'
const DARK = '#0e1e32'

export default function AdminNavbar({
  tab,
  setTab,
  logout,
  role,
}) {
  const tabs = role === 'owner' ? ['products', 'categories', 'orders', 'staff', 'banner'] : ['products', 'orders']
  const tabLabels = { products: 'Products', categories: 'Categories', orders: 'Orders', staff: 'Staff', banner: 'Hero Banner' }

  return (
    <nav style={{ background: DARK, padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="admin-navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
            tenova<span style={{ color: ORANGE }}>10</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
              Admin
            </span>
          </span>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <a
              href="/"
              target="_blank"
              style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              View Store (opens in new tab)
            </a>
            <button
              onClick={logout}
              style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, background: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="admin-navbar-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? ORANGE : 'rgba(255,255,255,0.08)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '7px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'inherit',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {tabLabels[t] || t}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
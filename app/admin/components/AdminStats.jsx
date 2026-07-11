'use client'

const DARK = '#0e1e32'

export default function AdminStats({ stats, products, fmt, adminProfile }) {
  const isOwner = adminProfile?.role === 'owner'
  const canViewStats = isOwner || adminProfile?.can_view_stats

  if (!canViewStats && !isOwner) {
    return null
  }

  const items = [
    ['📦', 'Total Orders',    stats.total],
    ['✅', 'Paid Orders',     stats.paid],
    ...(isOwner ? [['💰', 'Total Revenue', fmt(stats.revenue)]] : []),
    ['⚠️', 'Low Stock Items', stats.lowStock],
    ['🛍️', 'Total Products',  products.length],
  ]

  return (
    <div style={{background:'white',padding:'14px 24px',borderBottom:'1px solid #eef0f5'}}>
      <div style={{maxWidth:1200,margin:'0 auto',display:'flex',gap:32,flexWrap:'wrap'}}>
        {items.map(([icon, label, val]) => (
          <div key={label}>
            <div style={{fontSize:11,color:'#8892a0',fontWeight:600,marginBottom:2}}>
              {icon} {label}
            </div>
            <div style={{fontSize:20,fontWeight:800,color:DARK}}>
              {val}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
'use client'
import { useSearchParams } from 'next/navigation'

const ORANGE = '#fd7e0d'
const DARK   = '#0e1e32'

export default function SuccessContent() {
  const params = useSearchParams()
  const ref    = params.get('ref')

  return (
    <div style={{minHeight:'100vh',background:'#f7f8fc',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      {/* Confetti dots */}
      <div style={{position:'fixed',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
        {['#fd7e0d','#0e1e32','#fbbf24','#3b82f6','#10b981'].flatMap((color,ci) =>
          [...Array(8)].map((_,i) => (
            <div key={`${ci}-${i}`} style={{
              position:'absolute',
              width: 8 + (i % 3) * 4,
              height: 8 + (i % 3) * 4,
              background: color,
              borderRadius: i % 2 === 0 ? '50%' : '2px',
              left: `${(ci * 20 + i * 13) % 100}%`,
              top:  `${(i * 17 + ci * 11) % 100}%`,
              opacity: 0.15,
              transform: `rotate(${i * 45}deg)`,
            }}/>
          ))
        )}
      </div>

      <div style={{background:'white',borderRadius:20,padding:'40px 36px',maxWidth:460,width:'100%',textAlign:'center',boxShadow:'0 12px 48px rgba(14,30,50,0.1)',position:'relative',zIndex:1}}>
        {/* Success icon */}
        <div style={{width:80,height:80,background:'#f0fdf4',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:40}}>
          🎉
        </div>

        <h1 style={{fontSize:24,fontWeight:800,color:DARK,marginBottom:8}}>
          Order Confirmed!
        </h1>
        <p style={{color:'#8892a0',fontSize:15,marginBottom:4,lineHeight:1.6}}>
          Thank you for shopping with{' '}
          <strong style={{color:DARK}}>
            tenova<span style={{color:ORANGE}}>10</span>
          </strong>
        </p>

        {ref && (
          <div style={{background:'#f7f8fc',borderRadius:10,padding:'10px 16px',margin:'14px 0',display:'inline-block'}}>
            <div style={{fontSize:11,color:'#8892a0',fontWeight:600,marginBottom:2}}>PAYMENT REFERENCE</div>
            <div style={{fontSize:13,fontWeight:700,color:DARK,fontFamily:'monospace'}}>{ref}</div>
          </div>
        )}

        <p style={{color:'#8892a0',fontSize:14,marginBottom:28,lineHeight:1.65}}>
          Your payment was successful and your order is being processed.
          We'll reach out with delivery updates shortly.
        </p>

        {/* Steps */}
        <div style={{background:'#f7f8fc',borderRadius:12,padding:'16px 20px',marginBottom:28,textAlign:'left'}}>
          {[
            ['✅', 'Payment confirmed'],
            ['📦', 'Order being prepared'],
            ['🚚', 'Out for delivery'],
            ['🏠', 'Delivered to you'],
          ].map(([icon, step], i) => (
            <div key={step} style={{display:'flex',alignItems:'center',gap:10,marginBottom: i<3?10:0}}>
              <span style={{fontSize:16}}>{icon}</span>
              <span style={{fontSize:13,color: i===0?DARK:'#8892a0',fontWeight: i===0?600:400}}>{step}</span>
            </div>
          ))}
        </div>

        <a href="/"
          style={{display:'inline-block',background:ORANGE,color:'white',borderRadius:12,padding:'13px 28px',fontWeight:700,fontSize:15,textDecoration:'none'}}>
          Continue Shopping →
        </a>
      </div>
    </div>
  )
}

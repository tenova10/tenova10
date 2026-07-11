'use client'

import { useState } from 'react'

const ORANGE = '#fd7e0d'
const DARK = '#0e1e32'

export default function LoginForm({
  email, setEmail,
  password, setPassword,
  loginWithEmail,
  loginWithMasterPassword,
  toast,
}) {
  const [mode, setMode] = useState('email') // 'email' | 'legacy'

  return (
    <div style={{minHeight:'100vh',background:DARK,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'white',borderRadius:18,padding:36,width:'100%',maxWidth:360,textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{fontWeight:800,fontSize:24,color:DARK,marginBottom:4}}>
          tenova<span style={{color:ORANGE}}>10</span>
        </div>
        <div style={{fontSize:14,color:'#8892a0',marginBottom:28}}>Admin Dashboard</div>

        {mode === 'email' ? (
          <form onSubmit={loginWithEmail}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              style={{width:'100%',border:'1px solid #e0e3ea',borderRadius:10,padding:'12px 14px',fontSize:14,fontFamily:'inherit',marginBottom:10,color:DARK}}
              autoFocus
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              style={{width:'100%',border:'1px solid #e0e3ea',borderRadius:10,padding:'12px 14px',fontSize:14,fontFamily:'inherit',marginBottom:14,color:DARK}}
            />
            <button type="submit" style={{width:'100%',background:ORANGE,color:'white',border:'none',borderRadius:11,padding:'13px',fontWeight:700,fontSize:15,cursor:'pointer',fontFamily:'inherit'}}>
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('legacy')}
              style={{marginTop:14,background:'none',border:'none',color:'#8892a0',fontSize:12,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}
            >
              Use master password instead
            </button>
          </form>
        ) : (
          <form onSubmit={loginWithMasterPassword}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter master password"
              style={{width:'100%',border:'1px solid #e0e3ea',borderRadius:10,padding:'12px 14px',fontSize:14,fontFamily:'inherit',marginBottom:14,color:DARK}}
              autoFocus
            />
            <button type="submit" style={{width:'100%',background:ORANGE,color:'white',border:'none',borderRadius:11,padding:'13px',fontWeight:700,fontSize:15,cursor:'pointer',fontFamily:'inherit'}}>
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              style={{marginTop:14,background:'none',border:'none',color:'#8892a0',fontSize:12,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}
            >
              ← Back to email login
            </button>
          </form>
        )}

        {toast && <div style={{marginTop:14,color: toast.type==='error' ? '#e53e3e' : DARK,fontSize:13,fontWeight:500}}>{toast.msg}</div>}
      </div>
    </div>
  )
}
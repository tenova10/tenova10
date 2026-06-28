'use client'

import { ORANGE, DARK, EMOJI } from '../utils/constants'
import { fmt } from '../utils/helpers'

export default function ProductList({
  products,
  toggleActive,
  startEdit,
  deleteProduct,
}) {

  return (

    <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <h2 style={{fontSize:16,fontWeight:700,color:DARK}}>All Products ({products.length})</h2>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {products.map(p => (
                      <div key={p.id} style={{background:'white',borderRadius:13,padding:'14px 16px',border:'0.5px solid #eef0f5',display:'flex',gap:14,alignItems:'center'}}>
                        {/* Thumb */}
                        <div style={{width:54,height:54,borderRadius:9,overflow:'hidden',flexShrink:0,background:'#f0f2f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            : EMOJI[p.category]}
                        </div>
                        {/* Info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:14,color:DARK,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                          <div style={{display:'flex',gap:12,marginTop:4,fontSize:12,color:'#8892a0',flexWrap:'wrap'}}>
                            <span style={{color:ORANGE,fontWeight:700}}>{fmt(p.price)}</span>
                            <span>
                                Available:{' '}
                                <strong
                                    style={{
                                        color:
                                            (p.stock - (p.reserved_stock || 0)) <= 0
                                                ? '#e53e3e'
                                                : (p.stock - (p.reserved_stock || 0)) <= 5
                                                ? '#c05000'
                                                : DARK
                                    }}
                                >
                                    {p.stock - (p.reserved_stock || 0)}
                                </strong>

                                {' / '}

                                Total: {p.stock}
                            </span>
                            
                            <span style={{textTransform:'capitalize'}}>{p.category==='kitchen'?'Kitchenware':p.category}</span>
                            {p.old_price && <span style={{textDecoration:'line-through'}}>{fmt(p.old_price)}</span>}
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
    
                            <span
                              style={{
                                padding:'5px 10px',
                                borderRadius:999,
                                background:p.is_active ? '#dcfce7' : '#fee2e2',
                                color:p.is_active ? '#166534' : '#991b1b',
                                fontSize:11,
                                fontWeight:700,
                                minWidth:62,
                                textAlign:'center'
                              }}
                            >
                              {p.is_active ? '🟢 Live' : '🔴 Hidden'}
                            </span>
    
                            <button
                              onClick={()=>toggleActive(p.id,p.is_active)}
                              style={{
                                padding:'5px 12px',
                                borderRadius:6,
                                border:'1px solid #e0e3ea',
                                background:'white',
                                cursor:'pointer',
                                fontSize:11,
                                fontWeight:600,
                                fontFamily:'inherit'
                              }}
                            >
                              {p.is_active ? 'Hide' : 'Make Live'}
                            </button>
    
                            <button
                              onClick={()=>startEdit(p)}
                              style={{
                                padding:'5px 12px',
                                borderRadius:6,
                                border:'1px solid #e0e3ea',
                                background:'white',
                                cursor:'pointer',
                                fontSize:11,
                                fontWeight:600,
                                fontFamily:'inherit'
                              }}
                            >
                              Edit
                            </button>
    
                            <button
                              onClick={()=>deleteProduct(p.id,p.name)}
                              style={{
                                padding:'5px 10px',
                                borderRadius:6,
                                border:'none',
                                background:'#fee2e2',
                                color:'#991b1b',
                                cursor:'pointer',
                                fontSize:11,
                                fontWeight:600,
                                fontFamily:'inherit'
                              }}
                            >
                              Delete
                            </button>
    
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && (
                      <div style={{textAlign:'center',padding:'48px 0',color:'#8892a0',fontSize:14}}>
                        No products yet. Add your first product using the form.
                      </div>
                    )}
                  </div>
                </div>

        )
}
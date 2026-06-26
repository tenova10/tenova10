import { Suspense } from 'react'
import SuccessContent from './SuccessContent'

export const metadata = {
  title: 'Order Confirmed — tenova10',
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f8fc'}}>
        <div style={{fontSize:14,color:'#8892a0'}}>Loading...</div>
      </div>
    }>
      <SuccessContent/>
    </Suspense>
  )
}

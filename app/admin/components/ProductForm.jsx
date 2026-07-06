'use client'

const ORANGE = '#fd7e0d'
const DARK = '#0e1e32'

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: DARK,
}

export default function ProductForm({
  editId,
  handleSubmit,
  form,
  setForm,
  fileRef,
  handleFileChange,
  imagePreview,
  uploading,
  saving,
  resetForm,
  setImageFile,
  setImagePreview,
}) {

    return (
            <div style={{background:'white',borderRadius:16,padding:24,border:'0.5px solid #eef0f5',position:'sticky',top:20}}>
              <h2 style={{fontSize:16,fontWeight:700,color:DARK,marginBottom:20}}>
                {editId ? '✏️ Edit Product' : '➕ Add New Product'}
              </h2>
              <form onSubmit={handleSubmit}>

                {/* Product Name */}
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Product Name *</label>
                  <input className="form-input" required value={form.name}
                    onChange={e => setForm(f=>({...f,name:e.target.value}))}
                    placeholder="e.g. Ankara Wrap Dress"/>
                </div>

                {/* Category */}
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Category *</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                    style={{width:'100%',border:'1px solid #e0e3ea',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'inherit',background:'white',color:DARK}}>
                    <option value="fashion">👗 Fashion</option>
                    <option value="kitchen">🍳 Kitchenware</option>
                    <option value="household">🏠 Household</option>
                  </select>
                </div>

                {/* Price row */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <div>
                    <label style={labelStyle}>Price (₦) *</label>
                    <input className="form-input" type="number" min="0" step="0.01" required
                      value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}
                      placeholder="e.g. 12500"/>
                  </div>
                  <div>
                    <label style={labelStyle}>Old Price (₦)</label>
                    <input className="form-input" type="number" min="0" step="0.01"
                      value={form.old_price} onChange={e=>setForm(f=>({...f,old_price:e.target.value}))}
                      placeholder="Optional"/>
                  </div>
                </div>

                {/* Stock */}
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Stock Quantity *</label>
                  <input className="form-input" type="number" min="0" required
                    value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}
                    placeholder="e.g. 25"/>
                </div>

                {/* Description */}
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Description</label>
                  <textarea className="form-input" rows={3} style={{resize:'vertical'}}
                    value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                    placeholder="Short product description..."/>
                </div>

                {/* Featured */}
                <div style={{marginBottom:20}}>
  <label
    style={{
      display:'flex',
      alignItems:'center',
      gap:10,
      cursor:'pointer',
      fontSize:14,
      fontWeight:600,
      color:DARK
    }}
  >
    <input
      type="checkbox"
      checked={form.featured || false}
      onChange={e =>
        setForm(f => ({
          ...f,
          featured: e.target.checked
        }))
      }
    />
    ⭐ Feature this product on the homepage
  </label>
</div>

                {/* Image Upload */}
                <div style={{marginBottom:20}}>
                  <label style={labelStyle}>Product Image</label>
                  <input type="file" ref={fileRef} accept="image/*" onChange={handleFileChange} style={{display:'none'}}/>
                  <button type="button" onClick={()=>fileRef.current.click()}
                    style={{width:'100%',border:'1.5px dashed #d0d3db',borderRadius:10,padding:'14px',background:'#f7f8fc',cursor:'pointer',fontSize:13,color:'#8892a0',fontFamily:'inherit',textAlign:'center'}}>
                    {imagePreview
                      ? <img src={imagePreview} alt="preview" style={{width:'100%',maxHeight:120,objectFit:'cover',borderRadius:8}}/>
                      : uploading ? '⏳ Uploading...' : '📷 Click to upload image'}
                  </button>
                  {imagePreview && (
                    <button type="button" onClick={()=>{setImageFile(null);setImagePreview(null);setForm(f=>({...f,image_url:''}))}}
                      style={{marginTop:6,fontSize:12,color:'#e53e3e',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      ✕ Remove image
                    </button>
                  )}
                </div>

                <div style={{display:'flex',gap:10}}>
                  <button type="submit" disabled={saving||uploading}
                    style={{flex:1,background:ORANGE,color:'white',border:'none',borderRadius:11,padding:'12px',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit',opacity:(saving||uploading)?0.65:1}}>
                    {saving ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
                  </button>
                  {editId && (
                    <button type="button" onClick={resetForm}
                      style={{padding:'12px 16px',border:'1px solid #e0e3ea',borderRadius:11,background:'white',cursor:'pointer',fontFamily:'inherit',fontSize:14,color:'#8892a0'}}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
        )
}
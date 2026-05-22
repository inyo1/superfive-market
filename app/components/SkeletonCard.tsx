export default function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e8f0f8', overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: '120px', width: '100%', borderRadius: 0 }} />
      <div style={{ padding: '10px' }}>
        <div className="skeleton" style={{ height: '11px', marginBottom: '7px', width: '78%' }} />
        <div className="skeleton" style={{ height: '11px', marginBottom: '10px', width: '55%' }} />
        <div className="skeleton" style={{ height: '14px', marginBottom: '10px', width: '52%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className="skeleton" style={{ height: '10px', width: '32%' }} />
          <div className="skeleton" style={{ height: '10px', width: '28%' }} />
        </div>
        <div className="skeleton" style={{ height: '18px', width: '40%' }} />
      </div>
      <div className="skeleton" style={{ height: '34px', width: '100%', borderRadius: 0 }} />
    </div>
  )
}

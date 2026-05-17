export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#f0f5fb',
      fontFamily: 'sans-serif'
    }}>
      <nav style={{
        background: '#0C447C',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{color: '#fff', fontSize: '18px', fontWeight: '500'}}>
          Superfive Market
        </div>
        <div style={{color: '#B5D4F4', fontSize: '11px', letterSpacing: '1px'}}>
          ALUMNI SMPN 5 BANDUNG
        </div>
      </nav>

      <div style={{padding: '20px'}}>
        <div style={{
          background: '#0C447C',
          borderRadius: '10px',
          padding: '20px',
          color: '#fff',
          marginBottom: '16px'
        }}>
          <h2 style={{fontSize: '18px', marginBottom: '6px'}}>
            Ekosistem Bisnis Superfive
          </h2>
          <p style={{fontSize: '13px', color: '#B5D4F4'}}>
            Dari, oleh, dan untuk alumni SMPN 5 Bandung
          </p>
        </div>

        <p style={{color: '#0C447C', fontWeight: '500', fontSize: '14px'}}>
          Superfive Market berhasil dijalankan!
        </p>
      </div>
    </main>
  )
}
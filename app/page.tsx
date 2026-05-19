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
        <img
          src="/LOGO.jpeg"
          alt="Superfive Logo"
          style={{width:'40px', height:'40px', objectFit:'contain'}}
        />
        <div>
          <div style={{color: '#fff', fontSize: '16px', fontWeight: '500'}}>
            Superfive Market
          </div>
          <div style={{color: '#B5D4F4', fontSize: '10px', letterSpacing: '1px'}}>
            ALUMNI SMPN 5 BANDUNG
          </div>
        </div>
      </nav>

      <div style={{padding: '20px'}}>
        <div style={{
          background: '#0C447C',
          borderRadius: '10px',
          padding: '20px',
          color: '#fff',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <img
            src="/LOGO.jpeg"
            alt="Superfive Logo"
            style={{width:'72px', height:'72px', objectFit:'contain'}}
          />
          <div>
            <h2 style={{fontSize: '18px', marginBottom: '6px'}}>
              Ekosistem Bisnis Superfive
            </h2>
            <p style={{fontSize: '13px', color: '#B5D4F4'}}>
              Dari, oleh, dan untuk alumni SMPN 5 Bandung
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

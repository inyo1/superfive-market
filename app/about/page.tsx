import Navbar from '../components/Navbar'

export default function AboutPage() {
  const nilai = [
    { icon: '🤝', judul: 'Kebersamaan', deskripsi: 'Membangun ekosistem bisnis yang saling mendukung antar alumni.' },
    { icon: '🚀', judul: 'Inovasi', deskripsi: 'Mendorong alumni untuk terus berinovasi dan berkembang.' },
    { icon: '💼', judul: 'Profesional', deskripsi: 'Menjaga standar bisnis yang profesional dan terpercaya.' },
    { icon: '🏫', judul: 'Kebanggaan', deskripsi: 'Membawa nama baik SMPN 5 Bandung ke level berikutnya.' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#f0f5fb', fontFamily: 'sans-serif' }}>
      <Navbar />

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Hero */}
        <div style={{
          background: '#0C447C',
          borderRadius: '14px',
          padding: '28px 24px',
          color: '#fff',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '24px',
        }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: '160px', height: '160px', objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <h1 style={{
              fontSize: '26px', fontWeight: '800', marginBottom: '12px', margin: '0 0 12px',
              textTransform: 'uppercase', letterSpacing: '1px',
            }}>
              TENTANG KAMI
            </h1>
            <p style={{ fontSize: '15px', color: '#B5D4F4', lineHeight: '1.7', margin: 0 }}>
              Superfive Market adalah platform marketplace eksklusif untuk alumni SMPN 5 Bandung —
              tempat para alumni saling bertransaksi, berkolaborasi, dan berkembang bersama.
            </p>
          </div>
        </div>

        {/* Visi & Misi */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '28px 24px', border: '0.5px solid #c5d9ef', marginBottom: '16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0C447C', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Visi &amp; Misi</h2>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Visi</div>
            <p style={{ fontSize: '16px', color: '#5a7da0', lineHeight: '1.8', margin: 0 }}>
              Menjadi ekosistem bisnis alumni SMPN 5 Bandung yang terpercaya dan berdampak nyata.
            </p>
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#333', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Misi</div>
            <ul style={{ fontSize: '16px', color: '#5a7da0', lineHeight: '2', margin: 0, paddingLeft: '0', listStyle: 'none' }}>
              <li>Membangun jaringan bisnis yang kuat antar angkatan</li>
              <li>Mendorong pertumbuhan UMKM alumni Superfive</li>
            </ul>
          </div>
        </div>

        {/* Nilai */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '22px', border: '0.5px solid #c5d9ef', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0C447C', marginBottom: '16px', margin: '0 0 16px' }}>💡 Nilai Kami</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {nilai.map((n, i) => (
              <div key={i} style={{ background: '#E6F1FB', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{n.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0C447C', marginBottom: '6px' }}>{n.judul}</div>
                <div style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.6' }}>{n.deskripsi}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Kontak */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '22px', border: '0.5px solid #c5d9ef', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0C447C', marginBottom: '14px', margin: '0 0 14px' }}>📬 Hubungi Kami</h2>
          <div style={{ fontSize: '15px', color: '#5a7da0', lineHeight: '2.2' }}>
            <div>🏫 SMPN 5 Bandung Alumni Angkatan 1988</div>
            <div>📧 superfivemarket@gmail.com</div>
            <div>📍 Bandung, Jawa Barat</div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: '20px' }}>
          <a href="/produk" style={{
            background: '#0C447C', color: '#fff',
            padding: '13px 32px', borderRadius: '9px',
            fontSize: '15px', fontWeight: '600', textDecoration: 'none', textAlign: 'center',
          }}>
            Lihat Produk
          </a>
          <a href="/auth" style={{
            background: '#fff', color: '#0C447C',
            padding: '13px 32px', borderRadius: '9px',
            fontSize: '15px', fontWeight: '600', textDecoration: 'none',
            border: '1.5px solid #0C447C', textAlign: 'center',
          }}>
            Bergabung
          </a>
        </div>
      </div>
    </main>
  )
}

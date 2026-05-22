import Navbar from '../components/Navbar'

export default function AboutPage() {
  const anggota = [
    { nama: 'Tim Superfive', peran: 'Founder & Developer', angkatan: '1988' },
  ]

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
          borderRadius: '12px',
          padding: '28px 20px',
          color: '#fff',
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Tentang Kami</h1>
          <p style={{ fontSize: '13px', color: '#B5D4F4', lineHeight: '1.6' }}>
            Superfive Market adalah platform marketplace eksklusif untuk alumni SMPN 5 Bandung —
            tempat para alumni saling bertransaksi, berkolaborasi, dan berkembang bersama.
          </p>
        </div>

        {/* Visi & Misi */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0C447C', marginBottom: '12px' }}>🎯 Visi & Misi</h2>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Visi</div>
            <p style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.6', margin: 0 }}>
              Menjadi ekosistem bisnis alumni SMPN 5 Bandung yang terpercaya dan berdampak nyata.
            </p>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>Misi</div>
            <ul style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '1.8', margin: 0, paddingLeft: '18px' }}>
              <li>Memfasilitasi alumni untuk memasarkan produk dan jasa</li>
              <li>Membangun jaringan bisnis yang kuat antar angkatan</li>
              <li>Mendorong pertumbuhan UMKM alumni Superfive</li>
            </ul>
          </div>
        </div>

        {/* Nilai */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0C447C', marginBottom: '14px' }}>💡 Nilai Kami</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {nilai.map((n, i) => (
              <div key={i} style={{ background: '#E6F1FB', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{n.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0C447C', marginBottom: '4px' }}>{n.judul}</div>
                <div style={{ fontSize: '11px', color: '#5a7da0', lineHeight: '1.5' }}>{n.deskripsi}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Kontak */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '18px', border: '0.5px solid #c5d9ef', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0C447C', marginBottom: '12px' }}>📬 Hubungi Kami</h2>
          <div style={{ fontSize: '13px', color: '#5a7da0', lineHeight: '2' }}>
            <div>🏫 SMPN 5 Bandung Alumni Angkatan 1988</div>
            <div>📧 superfivemarket@gmail.com</div>
            <div>📍 Bandung, Jawa Barat</div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: '20px' }}>
          <a href="/produk" style={{
            background: '#0C447C',
            color: '#fff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontSize: '13px',
            textDecoration: 'none',
            textAlign: 'center',
          }}>
            Lihat Produk
          </a>
          <a href="/auth" style={{
            background: '#fff',
            color: '#0C447C',
            padding: '12px 28px',
            borderRadius: '8px',
            fontSize: '13px',
            textDecoration: 'none',
            border: '1px solid #0C447C',
            textAlign: 'center',
          }}>
            Bergabung
          </a>
        </div>
      </div>
    </main>
  )
}

// Kotak abu berdenyut yang bentuknya menyerupai konten aslinya, dipakai
// menggantikan tulisan "Memuat...". Animasinya sapuan gradien halus lewat
// kelas .skeleton di globals.css — sengaja bukan kedipan opacity yang keras.

type BaseProps = {
  lebar?: string | number
  tinggi?: string | number
  radius?: string | number
  style?: React.CSSProperties
}

export default function Skeleton({ lebar = '100%', tinggi = 12, radius = 6, style }: BaseProps) {
  return (
    <div
      className="skeleton"
      style={{
        width: typeof lebar === 'number' ? `${lebar}px` : lebar,
        height: typeof tinggi === 'number' ? `${tinggi}px` : tinggi,
        borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
        ...style,
      }}
    />
  )
}

const KARTU: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  border: '0.5px solid #e8f0f8',
}

/** Kartu di grid produk */
export function SkeletonKartuProduk() {
  return (
    <div style={{ ...KARTU, borderRadius: '10px', overflow: 'hidden' }}>
      <Skeleton tinggi={120} radius={0} />
      <div style={{ padding: '10px' }}>
        <Skeleton tinggi={11} lebar="78%" style={{ marginBottom: '7px' }} />
        <Skeleton tinggi={11} lebar="55%" style={{ marginBottom: '10px' }} />
        <Skeleton tinggi={14} lebar="52%" style={{ marginBottom: '10px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Skeleton tinggi={10} lebar="32%" />
          <Skeleton tinggi={10} lebar="28%" />
        </div>
        <Skeleton tinggi={18} lebar="40%" />
      </div>
      <Skeleton tinggi={34} radius={0} />
    </div>
  )
}

export function GridSkeletonProduk({ jumlah = 6 }: { jumlah?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
      {Array.from({ length: jumlah }, (_, i) => <SkeletonKartuProduk key={i} />)}
    </div>
  )
}

/** Kartu pesanan — meniru header, dua baris item, dan baris total */
export function SkeletonPesanan() {
  return (
    <div style={{ ...KARTU, marginBottom: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #e8f0f8', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <Skeleton tinggi={11} lebar="45%" style={{ marginBottom: '6px' }} />
          <Skeleton tinggi={10} lebar="30%" />
        </div>
        <Skeleton tinggi={20} lebar={86} radius={20} />
      </div>
      <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #e8f0f8' }}>
        {[0, 1].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Skeleton tinggi={44} lebar={44} radius={8} />
            <div style={{ flex: 1 }}>
              <Skeleton tinggi={11} lebar="70%" style={{ marginBottom: '5px' }} />
              <Skeleton tinggi={10} lebar="40%" />
            </div>
            <Skeleton tinggi={11} lebar={58} />
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton tinggi={10} lebar="35%" />
        <Skeleton tinggi={16} lebar={90} />
      </div>
    </div>
  )
}

export function DaftarSkeletonPesanan({ jumlah = 3 }: { jumlah?: number }) {
  return <>{Array.from({ length: jumlah }, (_, i) => <SkeletonPesanan key={i} />)}</>
}

/** Baris percakapan di daftar chat */
export function SkeletonChat() {
  return (
    <div style={{ ...KARTU, padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Skeleton tinggi={48} lebar={48} radius="50%" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '7px' }}>
          <Skeleton tinggi={12} lebar="42%" />
          <Skeleton tinggi={10} lebar={38} />
        </div>
        <Skeleton tinggi={11} lebar="72%" />
      </div>
    </div>
  )
}

export function DaftarSkeletonChat({ jumlah = 4 }: { jumlah?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {Array.from({ length: jumlah }, (_, i) => <SkeletonChat key={i} />)}
    </div>
  )
}

/** Kartu alumni — avatar bulat di tengah, nama, angkatan, lencana */
export function SkeletonAlumni() {
  return (
    <div style={{ ...KARTU, padding: '16px 12px', textAlign: 'center' }}>
      <Skeleton tinggi={52} lebar={52} radius="50%" style={{ margin: '0 auto 10px' }} />
      <Skeleton tinggi={12} lebar="70%" style={{ margin: '0 auto 6px' }} />
      <Skeleton tinggi={10} lebar="50%" style={{ margin: '0 auto 10px' }} />
      <Skeleton tinggi={18} lebar="60%" radius={20} style={{ margin: '0 auto' }} />
    </div>
  )
}

export function GridSkeletonAlumni({ jumlah = 8 }: { jumlah?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
      {Array.from({ length: jumlah }, (_, i) => <SkeletonAlumni key={i} />)}
    </div>
  )
}

/** Panel umum untuk halaman yang isinya form atau detail */
export function SkeletonPanel({ baris = 4 }: { baris?: number }) {
  return (
    <div style={{ ...KARTU, padding: '18px', marginBottom: '12px' }}>
      <Skeleton tinggi={13} lebar="35%" style={{ marginBottom: '14px' }} />
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} style={{ marginBottom: '12px' }}>
          <Skeleton tinggi={10} lebar="28%" style={{ marginBottom: '6px' }} />
          <Skeleton tinggi={36} radius={8} />
        </div>
      ))}
    </div>
  )
}

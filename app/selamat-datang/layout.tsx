import type { Metadata } from 'next'

// Halaman pribadi setelah login pertama — tidak untuk mesin pencari
export const metadata: Metadata = {
  title: 'Selamat Datang',   // template di root layout menambahkan "· Superfive Market"
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

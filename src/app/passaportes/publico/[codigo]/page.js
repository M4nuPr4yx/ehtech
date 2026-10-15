import PublicPassport from './public-passport'

export const metadata = { title: 'Passaporte digital | EHtech', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function PublicPassportPage({ params }) {
  const { codigo } = await params
  return <PublicPassport code={codigo} />
}

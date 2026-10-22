import { notFound } from 'next/navigation'
import { publicProduct } from '../../../lib/public-products'
import { productMetadata } from '../../../lib/seo.mjs'
import ProductDetails from './ProductDetails'
export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }) {
  const { id } = await params
  const product = await publicProduct(id)
  if (!product) notFound()
  return productMetadata(product)
}
export default async function ProductPage({ params }) {
  const { id } = await params
  const product = await publicProduct(id)
  if (!product) notFound()
  return <ProductDetails key={product.id_produto} initialProduct={product} />
}

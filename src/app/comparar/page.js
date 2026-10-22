'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '../../lib/api-request'
import { comparisonIds, COMPARISON_KEY } from '../../lib/comparison.mjs'
import { trustButton } from '../complements/TrustControls'

export default function ComparePage() {
  const [ids, setIds] = useState([]), [products, setProducts] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    let values = []
    let storageError = ''
    try { values = comparisonIds(localStorage.getItem(COMPARISON_KEY)) } catch { storageError = 'Armazenamento do navegador indisponível.' }
    Promise.all(values.map(async id => { try { return await apiRequest(`/produtos/${id}`, { signal: controller.signal }) } catch (error) { return { id_produto: id, nome: `Anúncio #${id}`, indisponivel: true, mensagem: error.message } } })).then(items => { if (!controller.signal.aborted) { setIds(values); setError(storageError); setProducts(items); setLoading(false) } })
    return () => controller.abort()
  }, [])
  function remove(id) {
    const next = ids.filter(value => value !== id)
    try { localStorage.setItem(COMPARISON_KEY, JSON.stringify(next)); setIds(next); setProducts(products.filter(item => Number(item.id_produto) !== id)); window.dispatchEvent(new Event('comparison-change')) }
    catch { setError('Não foi possível atualizar a comparação.') }
  }
  const fields = [['Preço', p => Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })], ['Categoria', p => p.categoria], ['Descrição e especificações informadas', p => p.descricao || 'Não informadas'], ['Disponibilidade', p => Number(p.estoque) > 0 ? `${p.estoque} em estoque` : 'Esgotado'], ['Vendedor', p => p.vendedor], ['Localização', p => p.origem_uf ? `${p.origem_cidade}/${p.origem_uf}` : 'Não informada']]
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-10"><h1 className="text-3xl font-bold">Comparar anúncios</h1><p>Adicione até quatro anúncios pelos botões na página de cada produto. Dados ausentes não são estimados.</p><Link href="/produtos">Escolher produtos</Link>{loading && <p role="status">Carregando comparação…</p>}{error && <p role="alert">{error}</p>}{!loading && !ids.length && <p>Nenhum anúncio na comparação.</p>}{products.length > 0 && <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><caption className="sr-only">Comparação de até quatro anúncios</caption><thead><tr><th className="border border-line p-4" scope="col">Característica</th>{products.map(p => <th className="min-w-52 border border-line p-4" scope="col" key={p.id_produto}><Link href={`/produtos/${p.id_produto}`}>{p.nome}</Link><div><button className={trustButton} aria-label={`Remover ${p.nome} da comparação`} onClick={() => remove(Number(p.id_produto))}>Remover</button></div></th>)}</tr></thead><tbody>{fields.map(([name, read]) => <tr key={name}><th scope="row" className="border border-line p-4">{name}</th>{products.map(p => <td className="whitespace-pre-wrap border border-line p-4" key={p.id_produto}>{p.indisponivel ? 'Anúncio indisponível. Tente abrir o anúncio novamente.' : read(p)}</td>)}</tr>)}</tbody></table></div>}</div>
}

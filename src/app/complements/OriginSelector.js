'use client';
import { useState } from 'react';
import AddressBook, { AddressDetails } from './AddressBook';
import { accountRequest } from '../../lib/address-api';

export default function OriginSelector({ value, onChange, requiresShipping, onShippingChange, currentRegion }) {
  const [choosing, setChoosing] = useState(false);
  async function confirm(address) {
    const confirmed = await accountRequest(`/enderecos/${address.id}/confirmar`, { method: 'POST', body: { versao: address.versao } });
    onChange(confirmed); setChoosing(false);
  }
  return <section className="mb-6 space-y-4 rounded-2xl border border-line bg-surface-raised p-5" aria-label="Origem do anúncio">
    <h2 className="text-lg font-bold text-foreground">Origem do envio</h2>
    <label className="flex items-center gap-3 text-sm text-foreground"><input type="checkbox" checked={requiresShipping} onChange={event => { onShippingChange(event.target.checked); onChange(null); }} />Este produto exige entrega física</label>
    {requiresShipping ? <><p className="text-sm text-muted">Escolha onde o produto será despachado. Use os mesmos endereços salvos em sua conta para anunciar e comprar. Somente cidade e UF aparecem no anúncio público.</p>
      {value ? <AddressDetails address={value} /> : currentRegion?.origem_uf ? <p className="text-sm text-foreground">Origem atual do anúncio: {currentRegion.origem_cidade}/{currentRegion.origem_uf}. Ela será mantida se você não selecionar outra.</p> : <p className="text-sm text-danger">Selecione e confirme uma origem antes de enviar o anúncio.</p>}
      <p className="text-xs text-muted">O anúncio guarda uma cópia da origem confirmada. Editar ou excluir um endereço da agenda não altera anúncios existentes: selecione a nova origem aqui para atualizá-los.</p>
      <button type="button" className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-accent" onClick={() => setChoosing(current => !current)}>{choosing ? 'Fechar endereços' : value || currentRegion?.origem_uf ? 'Selecionar outro endereço salvo' : 'Selecionar ou cadastrar endereço'}</button>
      {choosing && <AddressBook purpose="origin" onConfirm={confirm} />}
    </> : <p className="text-sm text-muted">Use esta opção apenas para itens que realmente dispensam envio físico. Não há frete nem origem para esses itens.</p>}
  </section>;
}

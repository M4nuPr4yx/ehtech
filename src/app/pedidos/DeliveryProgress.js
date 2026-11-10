import { deliveryGuidance } from '../../lib/order-guidance.mjs'

export default function DeliveryProgress({ delivery, role }) {
  const guidance = deliveryGuidance(delivery, role)
  return <div className="space-y-4">
    <ol aria-label="Etapas desta entrega" className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      {guidance.stages.map((label, index) => <li key={index} aria-current={guidance.step === index ? 'step' : undefined} className={`rounded-lg border p-3 ${guidance.step === index ? 'border-accent bg-accent-soft font-bold text-accent' : 'border-line text-muted'}`}>
        <span className="mb-1 block" aria-hidden="true">{guidance.step !== null && index < guidance.step ? '✓' : index + 1}</span>
        {label}{guidance.step !== null && index < guidance.step && <span className="sr-only"> — etapa concluída</span>}
      </li>)}
    </ol>
    <div className="rounded-xl bg-info-soft p-4 text-info"><h3 className="font-bold">{guidance.title}</h3><p className="mt-1 text-sm">{guidance.detail}</p></div>
  </div>
}

import Image from 'next/image';
import ehtechLogo from '../../public/ehtech-logo.png';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_center,_rgba(171,219,37,0.22),_transparent_32%),linear-gradient(145deg,_#030404,_#0b100c)] px-6 text-foreground flex items-center justify-center">
      <div className="relative flex flex-col items-center text-center">
        <div className="absolute h-64 w-64 rounded-full border border-accent animate-ping" />
        <div className="relative grid h-44 w-44 place-items-center rounded-full border border-accent bg-black/30 shadow-[0_0_60px_rgba(171,219,37,0.15)]">
        <Image
          src={ehtechLogo}
          alt="EHtech"
          sizes="153px"
          quality={50}
          priority
          className="h-32 w-auto object-contain animate-pulse"
        />
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.28em] text-accent">EHtech marketplace</p>
        <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-surface-raised"><div className="h-full w-2/3 animate-pulse rounded-full bg-accent-fill" /></div>
        <p className="mt-4 text-sm font-medium text-muted">Preparando as melhores ofertas para você...</p>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-[70vh] bg-[radial-gradient(circle_at_center,_rgba(171,219,37,0.22),_transparent_32%),linear-gradient(145deg,_#030404,_#0b100c)] px-6 text-white flex items-center justify-center">
      <div className="relative flex flex-col items-center text-center">
        <div className="absolute h-64 w-64 rounded-full border border-[#abdb25]/10 animate-ping" />
        <div className="relative grid h-44 w-44 place-items-center rounded-full border border-[#abdb25]/20 bg-black/30 shadow-[0_0_60px_rgba(171,219,37,0.15)]">
        <img
          src="/ehtech-logo.png"
          alt="EHtech"
          className="h-32 w-auto object-contain animate-pulse"
        />
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.28em] text-[#abdb25]">EHtech marketplace</p>
        <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#ABDB25]" /></div>
        <p className="mt-4 text-sm font-medium text-gray-400">Preparando as melhores ofertas para você...</p>
      </div>
    </div>
  );
}

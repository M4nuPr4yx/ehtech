import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111] via-black to-[#ABDB25]/30 text-white pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-[#ABDB25]/90 to-[#ABDB25] bg-clip-text text-transparent drop-shadow-2xl">
            EHtech
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto opacity-90 leading-relaxed">
            A plataforma para compra, venda e troca de produtos de tecnologia.
          </p>
        </div>
        <Link 
          href="/sobre" 
          className="inline-flex items-center px-8 py-4 bg-[#ABDB25] hover:bg-white hover:text-black font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl hover:-translate-y-2 transition-all duration-300"
        >
          Descubra mais →
        </Link>
      </div>
    </div>
  );
}

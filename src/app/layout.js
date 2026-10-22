import "./globals.css";
import "../styles/motion.css";
import localFont from 'next/font/local';
import { siteOrigin } from '../lib/seo.mjs';

const manrope = localFont({
  src: '../../public/fonts/Manrope-Variable.ttf',
  variable: '--font-manrope',
  weight: '200 800',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "EHtech",
  description: "Marketplace para comprar produtos de tecnologia e contratar serviços especializados de TI",
  icons: {
    icon: "/icon.png?v=3",
  },
};

import Header from "./complements/Header";
import Footer from "./complements/Footer";
import { themeBootstrap } from "../lib/theme";
import MotionEnhancements from './complements/MotionEnhancements';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className={`${manrope.variable} antialiased`}>
        <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
        <Header />
        <main id="conteudo" tabIndex={-1}>{children}</main>
        <MotionEnhancements />
        <Footer />
      </body>
    </html>
  );
}

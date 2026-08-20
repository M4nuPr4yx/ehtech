import "./globals.css";

export const metadata = {
  title: "EHtech",
  description: "Plataforma de compra, venda e troca de produtos de tecnologia",
  icons: {
    icon: "/icon.png",
  },
};

import Header from "./complements/Header";
import Footer from "./complements/Footer";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-black text-white">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

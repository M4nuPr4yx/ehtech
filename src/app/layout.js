import "./globals.css";

export const metadata = {
  title: "EHtech",
  description: "Marketplace para comprar produtos de tecnologia e contratar serviços especializados de TI",
  icons: {
    icon: "/icon.png",
  },
};

import Header from "./complements/Header";
import Footer from "./complements/Footer";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased text-white">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

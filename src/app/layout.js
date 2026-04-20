import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata = {
  title: "ENGAJAÍ — Títulos, hashtags e roteiros virais em segundos",
  description:
    "Gere títulos, descrições, hashtags e estilos de edição virais para YouTube, TikTok e Instagram Reels — grátis, em segundos.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  keywords: [
    "hashtags virais",
    "título viral",
    "YouTube Shorts",
    "TikTok",
    "Instagram Reels",
    "criador de conteúdo",
    "marketing digital",
  ],
  openGraph: {
    title: "ENGAJAÍ — Títulos e hashtags virais grátis",
    description:
      "Transforme qualquer tema em título, descrição, hashtags e roteiro de edição viral. Grátis.",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ENGAJAÍ — Títulos e hashtags virais grátis",
    description:
      "Transforme qualquer tema em título, descrição, hashtags e roteiro de edição viral. Grátis.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00A86B",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}

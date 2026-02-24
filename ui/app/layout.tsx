import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "OCR Universe — Trích xuất văn bản từ ảnh",
  description:
    "Công cụ OCR miễn phí trích xuất văn bản từ ảnh. Hỗ trợ tiếng Anh, tiếng Việt và 10+ ngôn ngữ. JPG, PNG, WEBP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-bg-primary text-text-primary`}>
        <Providers>
          <Header />
          <main className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          <Footer />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0f1629",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e5e7eb",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}


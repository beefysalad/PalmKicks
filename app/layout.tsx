import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { CartProvider } from "./components/shared/CartProvider";
import ConditionalLayout from "./components/shared/ConditionalLayout";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palm Kicks",
  description: "Your go-to online store for stylish and comfortable footwear.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <CartProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
          </CartProvider>
          <Toaster position='bottom-right' richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}

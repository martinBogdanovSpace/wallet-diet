import type { Metadata, Viewport } from "next";
import { Literata, Onest } from "next/font/google";
import { LOCALES } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import "./globals.css";

// Onest for everything you read and tap; Literata for titles and big amounts.
const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "cyrillic"],
  axes: ["opsz"],
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.meta.title,
    description: t.meta.description,
    applicationName: t.meta.title,
    appleWebApp: {
      capable: true,
      title: t.meta.title,
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f3ea",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${onest.variable} ${literata.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream font-sans text-ink">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Noto_Sans_TC, Outfit } from "next/font/google";
import "./globals.css";

// Define Fonts
// Fonts are loaded via next/font because Next.js will download and package the font files into the build output, so that the fonts can be used offline and without relying on external services.
const notoSansTC = Noto_Sans_TC({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    variable: "--font-noto-sans-tc",
    display: "swap",
});

const outfit = Outfit({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-outfit",
    display: "swap",
});

const siteName = "鳳山高中專車登記系統";
const description = "鳳山高中放學專車線上登記系統，選路線、選座位，提供快速的線上登記服務。";

// Next.js will automatically generate metadata for each page
export const metadata: Metadata = {
    metadataBase: new URL("https://bus.fssh.khc.edu.tw"),
    title: siteName,
    description: description,
    applicationName: siteName,
    keywords: [
        "鳳山高中",
        "專車",
        "線上登記",
        "座位登記",
    ],
    openGraph: {
        type: "website",
        locale: "zh_TW",
        siteName: siteName,
        title: siteName,
        description: description,
        images: [{ url: "/fssh-badge.png", width: 423, height: 408, alt: "鳳山高中校徽" }],
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-Hant" className={`h-full antialiased ${notoSansTC.variable} ${outfit.variable}`}>
            <body className="min-h-full flex flex-col"> {children} </body>
        </html>
    );
}

import type { Metadata } from "next";
import { Noto_Sans_TC, Outfit } from "next/font/google";
import "./globals.css";

// Define Fonts
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

export const metadata: Metadata = {
    title: "鳳山高中專車登記系統",
    description: "鳳山高中專車線上登記系統",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="zh-Hant"
            className={`h-full antialiased ${notoSansTC.variable} ${outfit.variable}`}
        >
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}

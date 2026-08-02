import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    variable: "--font-noto-sans-tc",
    display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-ibm-plex-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "鳳山高中專車登記系統",
    description: "鳳山高中放學專車線上登記系統",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="zh-Hant"
            className={`h-full antialiased ${notoSansTC.variable} ${ibmPlexMono.variable}`}
        >
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}

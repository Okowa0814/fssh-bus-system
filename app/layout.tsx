import type { Metadata } from "next";
import { Noto_Sans_TC, Outfit } from "next/font/google";
import "./globals.css";

// Define Fonts
// Font write b.c. Next.js wiil downlaod and package the font files into the build output, so that the fonts can be used offline and without relying on external services.
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

// Next.js will automatically generate metadata for each page
export const metadata: Metadata = {
    title: "鳳山高中專車登記系統",
    description:
        "鳳山高中放學專車線上登記系統：使用學校 Google 帳號登入，於開放時間內選擇路線、上車站點與座位，登記成功即產生電子車票；路線額滿可加入候補並自動遞補，亦可隨時查看路線、停靠站與發車時間。",
    keywords: [
        "鳳山高中",
        "專車",
        "放學專車",
        "線上登記",
        "座位登記",
    ],
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

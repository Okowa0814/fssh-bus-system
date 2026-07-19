import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "鳳山高中專車登記系統",
    description: "鳳山高中放學專車線上登記系統",
};

// 進頁面前先套用主題，避免深色模式閃爍
const themeScript = `(
    function(){
        try{
            var t = localStorage.getItem("fssh_bus_theme");
            
            if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){
                document.documentElement.dataset.theme="dark"
            }
        } catch(e) {}
    }
)();`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-Hant" className="h-full antialiased">
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}

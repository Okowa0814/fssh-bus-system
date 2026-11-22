export const guideSteps = [
    { n: "01", t: "登入系統", d: "使用學校發放的 Google 帳號（@fssh.khc.edu.tw）一鍵登入，無需另外註冊。" },
    { n: "02", t: "選擇路線", d: "於「登記」頁選擇要搭乘的放學路線，可先於「路線」頁查看各路線停靠站與時間。" },
    { n: "03", t: "挑選座位", d: "在座位圖上點選想坐的位置；灰色為已被登記的座位，先登記先得。" },
    { n: "04", t: "確認結果", d: "送出後立即顯示成功或失敗。成功後回到首頁就能看到你的電子票。" },
    { n: "05", t: "取消或改選", d: "開放時間內可於「登記」頁取消登記，取消後即可重新選位。" },
];

// 標題 + 操作步驟，供「說明」頁與登入頁的說明彈窗共用
export function HelpGuide() {
    return (
        <div className="flex flex-col gap-7">
            <h1 className="mt-2 text-[clamp(32px,4vw,48px)] leading-tight font-bold tracking-tight">
                第一次登記？
                <br />
                一分鐘就搞定。
            </h1>

            <div className="flex flex-col">
                {guideSteps.map((step) => (
                    <div key={step.n} className="flex gap-4.5 border-t border-line py-5">
                        <span className="w-6 shrink-0 pt-0.5 font-mono text-lg text-accent">{step.n}</span>
                        <div>
                            <p className="text-xl font-bold tracking-tight">{step.t}</p>
                            <p className="mt-1.5  leading-relaxed text-muted">{step.d}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** 頁面載入中的置中轉圈，換頁與頁面抓資料時共用，避免兩段載入畫面不一致 */
export function PageLoader() {
    return (
        <div role="status" className="flex flex-col items-center gap-3 py-24 text-muted">
            <span
                aria-hidden="true"
                className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent motion-reduce:animate-none"
            />
            <span className="text-sm">載入中…</span>
        </div>
    );
}

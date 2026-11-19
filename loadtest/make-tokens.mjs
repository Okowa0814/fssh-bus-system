// 為 1000 個壓測學生簽發 JWT，輸出到 loadtest/tokens.json
//
// 用法（在專案根目錄執行；--env-file 會載入 .env 的 JWT_SECRET，本腳本不會印出密鑰）：
//   node --env-file=.env loadtest/make-tokens.mjs
//
// 簽發格式必須與 server/auth.ts 的 signToken 完全一致（sub=學號，claims 含 name/email/enrollmentYear/isAdmin）。
// 效期拉長到 2 小時，避免壓測中途 token 過期（正式環境是 30 分鐘）。
import { SignJWT } from "jose";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const COUNT = 1000;
const ENROLLMENT_YEAR = "98";

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error("缺少 JWT_SECRET：請用 `node --env-file=.env loadtest/make-tokens.mjs` 執行");
    process.exit(1);
}
const key = new TextEncoder().encode(secret);

const tokens = [];
for (let n = 1; n <= COUNT; n++) {
    const suffix = String(n).padStart(4, "0");
    const token = await new SignJWT({
        name: `壓測學生${suffix}`,
        email: `load${suffix}@fssh.khc.edu.tw`,
        enrollmentYear: ENROLLMENT_YEAR,
        isAdmin: false,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(`LOAD${suffix}`)
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(key);
    tokens.push(token);
}

const outFile = join(dirname(fileURLToPath(import.meta.url)), "tokens.json");
writeFileSync(outFile, JSON.stringify(tokens));
console.log(`已簽發 ${tokens.length} 個 token → ${outFile}`);

export function formatPrice(price: number): string {
    return `NT$${price}`;
}

/** 站點的月金額換算成年繳金額（管理員登記總覽顯示用） */
export function annualPrice(monthlyPrice: number): number {
    return monthlyPrice * 12;
}

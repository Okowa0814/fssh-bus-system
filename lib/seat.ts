// 遊覽車座位佈局
// 5 欄：左側兩座｜走道｜右側兩座；車頭第一排右側為車長座與前門

export type SeatCell =
    | { type: "seat"; number: number }
    | { type: "aisle" }
    | { type: "driver" }
    | { type: "door" }
    | { type: "exit" }
    | { type: "empty" };

const s = (number: number): SeatCell => ({ type: "seat", number });
const aisle: SeatCell = { type: "aisle" };
const empty: SeatCell = { type: "empty" };
const exit: SeatCell = { type: "exit" };

export const BUS_LAYOUT: SeatCell[][] = [
    [s(1), s(2), aisle, { type: "driver" }, { type: "door" }],
    [s(3), s(4), aisle, empty, empty],
    [s(5), s(6), aisle, empty, empty],
    [s(7), s(8), aisle, s(9), s(10)],
    [s(11), s(12), aisle, s(13), s(14)],
    [s(15), s(16), aisle, s(17), s(18)],
    [s(19), s(20), aisle, s(21), s(22)],
    [s(23), s(24), aisle, s(25), s(26)],
    [s(27), s(28), aisle, exit, exit],
    [exit, exit, aisle, s(29), s(30)],
    [s(31), s(32), aisle, s(33), s(34)],
    [s(35), s(36), aisle, s(37), s(38)],
    [s(39), s(40), aisle, s(41), s(42)],
];

export const TOTAL_SEATS = 42;

export function isValidSeat(seatNumber: number): boolean {
    return Number.isInteger(seatNumber) && seatNumber >= 1 && seatNumber <= TOTAL_SEATS;
}

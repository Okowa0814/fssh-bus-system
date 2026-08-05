import "server-only";
import type { StationDto } from "@/lib/types";

export function parseStations(input: unknown): StationDto[] | null {
    if (!Array.isArray(input)) {
        return null;
    }
    const stations: StationDto[] = [];
    for (const item of input) {
        if (
            typeof item !== "object" ||
            item === null ||
            typeof (item as StationDto).name !== "string" ||
            typeof (item as StationDto).arriveAt !== "string" ||
            typeof (item as StationDto).monthlyPrice !== "number" ||
            !Number.isFinite((item as StationDto).monthlyPrice) ||
            (item as StationDto).monthlyPrice < 0
        ) {
            return null;
        }
        const station = item as StationDto;
        stations.push({
            name: station.name.trim().slice(0, 50),
            arriveAt: station.arriveAt.trim().slice(0, 20),
            monthlyPrice: Math.round(station.monthlyPrice),
        });
    }
    return stations;
}

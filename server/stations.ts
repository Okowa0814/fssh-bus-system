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
            typeof (item as StationDto).time !== "string" ||
            typeof (item as StationDto).enabled !== "boolean"
        ) {
            return null;
        }
        const station = item as StationDto;
        stations.push({
            name: station.name.trim().slice(0, 50),
            time: station.time.trim().slice(0, 20),
            enabled: station.enabled,
        });
    }
    return stations;
}

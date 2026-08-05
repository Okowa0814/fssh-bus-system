export interface TokenPayload {
    sub: string; // 學號
    name: string;
    email: string;
    enrollmentYear: string;
    isAdmin: boolean;
    exp: number;
}

export interface StationDto {
    name: string;
    arriveAt: string;
    monthlyPrice: number;
}

export interface RouteDto {
    id: number;
    name: string;
    stations: StationDto[];
    isFull: boolean;
}

export interface BookingDto {
    id: number;
    seatNumber: number;
    station: string;
    isPaid: boolean;
    createdAt: string;
    route: { id: number; name: string; stations: StationDto[] };
}

export interface WaitlistEntryDto {
    id: number;
    station: string;
    position: number;
    route: { id: number; name: string; stations: StationDto[] };
}

export interface MeResponse {
    user: {
        studentId: string;
        name: string;
        email: string;
        enrollmentYear: string;
        isAdmin: boolean;
    };
    booking: BookingDto | null;
    waitlist: WaitlistEntryDto | null;
}

export interface BookingWindowDto {
    start: string | null;
    end: string | null;
    open: boolean;
}

export interface SeatsResponse {
    routeId: number;
    totalSeats: number;
    takenSeats: number[];
}

export interface AdminBookingDto extends BookingDto {
    student: {
        studentId: string;
        name: string;
        enrollmentYear: string;
        email: string;
    };
}

export interface AdminUserDto {
    studentId: string;
    name: string;
    email: string;
    enrollmentYear: string;
    isAdmin: boolean;
    createdAt: string;
}

export interface LoginResponse {
    token: string;
    user: MeResponse["user"];
}

export interface PublicStatsDto {
    routeCount: number;
    totalSeats: number;
}

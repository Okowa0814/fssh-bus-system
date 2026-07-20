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
    time: string;
    enabled: boolean;
}

export interface ScheduleDto {
    id: number;
    label: string;
    departAt: string;
}

export interface RouteDto {
    id: number;
    name: string;
    enabled: boolean;
    stations: StationDto[];
    schedules: ScheduleDto[];
}

export interface BookingDto {
    id: number;
    seatNumber: number;
    status: "SUCCESS" | "CANCELLED";
    createdAt: string;
    schedule: ScheduleDto & { route: { id: number; name: string } };
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
}

export interface BookingWindowDto {
    start: string | null;
    end: string | null;
    open: boolean;
}

export interface SeatsResponse {
    scheduleId: number;
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

export interface LoginResponse {
    token: string;
    user: MeResponse["user"];
}

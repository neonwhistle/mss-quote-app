import { queryGoogleCalendarAvailability } from "@/lib/google-calendar-availability";
import { parseServiceWindow } from "@/lib/service-window";
import type { AvailabilityApiResponseBody } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse<AvailabilityApiResponseBody>> {
  const url: URL = new URL(req.url);
  const serviceDate: string | null = url.searchParams.get("serviceDate");
  const serviceStartTime: string | null = url.searchParams.get("serviceStartTime");
  const serviceEndTime: string | null = url.searchParams.get("serviceEndTime");
  const serviceTimeZone: string | null = url.searchParams.get("serviceTimeZone");

  if (
    serviceDate === null ||
    serviceStartTime === null ||
    serviceEndTime === null ||
    serviceTimeZone === null
  ) {
    return NextResponse.json(
      {
        ok: false,
        calendarConfigured: false,
        error:
          "Missing query params: serviceDate, serviceStartTime, serviceEndTime, serviceTimeZone.",
      },
      { status: 400 },
    );
  }

  const window: { timeMin: string; timeMax: string } | null = parseServiceWindow(
    serviceDate,
    serviceStartTime,
    serviceEndTime,
    serviceTimeZone,
  );

  if (window === null) {
    return NextResponse.json(
      {
        ok: false,
        calendarConfigured: false,
        error: "Invalid service date, times, or timezone.",
      },
      { status: 400 },
    );
  }

  const { timeMin, timeMax } = window;
  const result = await queryGoogleCalendarAvailability(timeMin, timeMax);

  if (result.apiError !== undefined) {
    return NextResponse.json({
      ok: true,
      calendarConfigured: result.calendarConfigured,
      timeMin,
      timeMax,
      resources: result.resources,
      apiError: result.apiError,
    });
  }

  return NextResponse.json({
    ok: true,
    calendarConfigured: result.calendarConfigured,
    timeMin,
    timeMax,
    resources: result.resources,
  });
}

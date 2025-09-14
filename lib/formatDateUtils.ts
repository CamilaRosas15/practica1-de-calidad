import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { format, formatDistanceToNowStrict } from "date-fns";

const formatToYYYYMMDD = (dateString: string) => {
  return format(new Date(dateString), "yyyy-MM-dd");
};

export const formatDateDayMonthYear = (dateString: string, timezone = getLocalTimeZone()) => {
  const formattedDate = dateString.includes("T") ? formatToYYYYMMDD(dateString) : dateString;

  const date = parseDate(formattedDate).toDate(timezone);

  const formatter = new DateFormatter("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return formatter.format(date);
};

export function isRecentDate(dateString: string, days = 7): boolean {
  const date = parseDate(dateString);

  const todayDate = today("UTC"); // use UTC to avoid timezone issues

  const pastDate = todayDate.subtract({ days });

  // Check if the date is between pastDate (inclusive) and today
  return date.compare(pastDate) >= 0;
}

export function formatHowLongAgo(date: Date | string | number) {
  // Check if it's a string in YYYY-MM-DD format
  if (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) // matches YYYY-MM-DD exactly
  ) {
    const todayDate = today(getLocalTimeZone());
    // Create CalendarDate directly from the YYYY-MM-DD string
    const [year, month, day] = date.split("-").map(Number);
    const compareDate = new CalendarDate(year, month, day);

    if (compareDate.compare(todayDate) === 0) {
      return "today";
    }
  }

  return formatDistanceToNowStrict(new Date(date), {
    addSuffix: true,
  });
}

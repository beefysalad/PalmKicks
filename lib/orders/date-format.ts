// Match the calendar day used by the order search API, regardless of the viewer's zone.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

export const formatOrderDate = (value: string) => dateFormatter.format(new Date(value));
export const formatOrderTime = (value: string) => timeFormatter.format(new Date(value));
export const formatOrderDateTime = (value: string) => dateTimeFormatter.format(new Date(value));

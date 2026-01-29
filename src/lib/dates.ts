import { DateTime } from "luxon";
import { appConfig } from "../config/env";

const menuDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: appConfig.timezone,
});

export function getMenuDateString(): string {
  return menuDateFormatter.format(new Date());
}

export function getSilentUntil(): Date {
  return DateTime.now().setZone(appConfig.timezone).endOf("day").toJSDate();
}

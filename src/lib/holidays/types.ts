export type Holiday = {
  date: string; // YYYY-MM-DD in calendar sense (not TZ-shifted)
  name: string;
  localName?: string;
  religion?: "islamic" | "buddhist" | "hindu" | "chinese" | "christian" | null;
  type: "public" | "religious" | "observance";
  scope?: "national" | "federal" | "state" | "regional";
};

export type HolidayCountryCode =
  | "none"
  | "MY"
  | "SG"
  | "ID"
  | "US"
  | "GB"
  | "AU"
  | "PH"
  | "TH";

export type HolidayCountryOption = {
  value: HolidayCountryCode;
  label: string;
};

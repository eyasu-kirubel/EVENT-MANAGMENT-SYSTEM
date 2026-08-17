export const EVENT_CATEGORIES = [
  "Music",
  "Art",
  "Sports",
  "Book",
  "Business",
  "Food",
  "Festival",
  "Fashion",
  "workshop",
  "kids",
  "cultural",
];

export const CATEGORY_ICONS = Object.fromEntries(EVENT_CATEGORIES.map((category) => [category, ""]));
CATEGORY_ICONS.All = "";
CATEGORY_ICONS.General = "";

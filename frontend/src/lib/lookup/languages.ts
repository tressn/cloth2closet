export type Option = { value: string; label: string };

export const LANGUAGES: Option[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
];

export const LANGUAGE_SET = new Set(LANGUAGES.map((l) => l.value));
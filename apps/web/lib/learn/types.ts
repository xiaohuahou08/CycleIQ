import type { Locale } from "@/lib/i18n/locales";

/** Inline illustration rendered as a crisp bilingual SVG (no raster assets). */
export type LearnFigureKind =
  | "contract-anatomy"
  | "long-call"
  | "long-put"
  | "short-put"
  | "short-call"
  | "delta-slope"
  | "delta-curve";

export interface LearnSection {
  heading: string;
  paragraphs: string[];
  /** Optional diagram rendered under the section text. */
  figure?: LearnFigureKind;
  /** Localized caption shown beneath the figure. */
  figureCaption?: string;
}

export interface LearnPostLocalized {
  title: string;
  description: string;
  sections: LearnSection[];
}

export interface LearnPostSource {
  slug: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Diagram used as the list thumbnail. */
  thumbnail?: LearnFigureKind;
  en: LearnPostLocalized;
  zh: LearnPostLocalized;
}

export interface LearnPost {
  slug: string;
  date: string;
  thumbnail?: LearnFigureKind;
  title: string;
  description: string;
  sections: LearnSection[];
}

export type LearnLocale = Locale;

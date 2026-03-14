import { Nunito_Sans, Poppins, Caveat } from "next/font/google";

export const bodyFont = Nunito_Sans({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const headingFont = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const accentFont = Caveat({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-accent",
});

export const fontVariables = `${bodyFont.variable} ${headingFont.variable} ${accentFont.variable}`;

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teaches tailwind-merge the type scale from `@clinia/tailwindcss`. Without it,
// `text-body-s` reads as a text colour and a component's own `text-sm` stays beside it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display-l",
            "display-m",
            "display-s",
            "title-xl",
            "title-l",
            "title-m",
            "title-s",
            "title-xs",
            "body-xl",
            "body-l",
            "body-m",
            "body-s",
            "body-xs",
            "eyebrow-l",
            "eyebrow-s",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

"use client";

import Link from "next/link";

/**
 * Footer component for the home page.
 */
export function HomeFooter() {
  return (
    <footer className="mt-auto border-t border-base-200">
      <div className="max-w-2xl mx-auto px-6 py-10 text-sm text-base-content/70 text-center">
        <div className="space-y-3 leading-relaxed">
          <p>
            This site is maintained by{" "}
            <Link
              href="https://github.com/ppriyankuu"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary"
            >
              Priyanku Gogoi
            </Link>{" "}
            himself. (Mostly because he&apos;s lonely AF).
          </p>

          <p>
            Found a bug? You may report it in the{" "}
            <Link
              href="https://github.com/ppriyankuu/rent/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              issues section
            </Link>{" "}
            of this app&apos;s repository.
          </p>

          <p>
            If you&apos;re a developer yourself or are into computer science, feel free to contribute — Pull Requests are always welcome (just don&apos;t start judging my code).{" "}
            <Link
              href="https://github.com/ppriyankuu/rent"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Click me!
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-base-200 text-xs opacity-40">
          © {new Date().getFullYear()} — Built with Next.js and questionable amounts of sugar.
        </div>
      </div>
    </footer>
  );
}

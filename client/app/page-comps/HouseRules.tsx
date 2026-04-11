"use client";

/**
 * House rules section component.
 */
export function HouseRules() {
  return (
    <section className="py-10 sm:py-12 border-t border-base-200">
      <div className="p-5 bg-base-200/50 rounded-xl text-sm sm:text-base text-base-content/80 max-w-2xl mx-auto">
        <p className="text-base-content font-medium mb-3">A few simple things to keep in mind:</p>

        <ul className="list-disc list-outside ml-5 space-y-1 text-base-content/70 text-justify leading-tight">
          <li>Please help keep the rooms and facilities clean — future you (and everyone else) will appreciate it.</li>
          <li>The bathroom and kitchen are shared, so please leave them the way you&apos;d like to find them.</li>
          <li>If something stops working, just raise a complaint from your dashboard — we&apos;ll take a look at it.</li>
          <li>Noise happens, we get it. Just try to keep it low, especially at night.</li>
          <li>Dustbins are provided — let&apos;s use them and keep the place tidy.</li>
        </ul>
      </div>
    </section>
  );
}

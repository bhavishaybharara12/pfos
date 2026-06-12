import { SimulateStudio } from "@/components/SimulateStudio";

export const dynamic = "force-dynamic";

export default function SimulatePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Simulate</h1>
      <p className="text-xs text-ink-faint -mt-3">
        Every scenario runs the same Monte Carlo engine as the retirement plan (2,000 paths, seeded —
        same inputs always give the same answer).
      </p>
      <SimulateStudio />
    </div>
  );
}

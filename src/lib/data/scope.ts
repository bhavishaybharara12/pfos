import { db } from "../db";

export interface Scope {
  key: string; // 'family' or person id
  label: string;
  personIds: string[];
  persons: { id: string; fullName: string; role: string; monthlyIncome: number; dateOfBirth: Date }[];
  familyId: string;
}

export async function resolveScope(scopeParam?: string): Promise<Scope> {
  const family = await db.family.findFirstOrThrow({ include: { persons: true } });
  const persons = family.persons;
  if (scopeParam && scopeParam !== "family") {
    const p = persons.find((x) => x.id === scopeParam);
    if (p)
      return {
        key: p.id,
        label: p.fullName.split(" ")[0],
        personIds: [p.id],
        persons,
        familyId: family.id,
      };
  }
  return {
    key: "family",
    label: "Family",
    personIds: persons.map((p) => p.id),
    persons,
    familyId: family.id,
  };
}

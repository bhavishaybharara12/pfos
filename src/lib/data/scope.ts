import { db } from "../db";

export interface Scope {
  key: string; // 'family' or person slug (first name, lowercase)
  label: string;
  personIds: string[];
  persons: { id: string; fullName: string; role: string; monthlyIncome: number; dateOfBirth: Date }[];
  familyId: string;
}

export const personSlug = (fullName: string) => fullName.split(" ")[0].toLowerCase();

export async function resolveScope(scopeParam?: string): Promise<Scope> {
  const family = await db.family.findFirstOrThrow({ include: { persons: true } });
  const persons = family.persons;
  if (scopeParam && scopeParam !== "family") {
    const p = persons.find(
      (x) => personSlug(x.fullName) === scopeParam.toLowerCase() || x.id === scopeParam,
    );
    if (p)
      return {
        key: personSlug(p.fullName),
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

/** generateStaticParams source for every /[scope]/ page (static export). */
export async function scopeParams(): Promise<{ scope: string }[]> {
  const persons = await db.person.findMany();
  return [{ scope: "family" }, ...persons.map((p) => ({ scope: personSlug(p.fullName) }))];
}

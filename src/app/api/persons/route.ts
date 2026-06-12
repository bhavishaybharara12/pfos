import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const persons = await db.person.findMany({ select: { id: true, fullName: true } });
  return NextResponse.json(persons);
}

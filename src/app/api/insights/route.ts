import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Mark an insight acted/dismissed (per pfos/06: act-rate is the engine's own KPI). */
export async function POST(req: NextRequest) {
  const { ruleCode, status } = (await req.json()) as { ruleCode: string; status: string };
  if (!ruleCode || !["acted", "dismissed", "open"].includes(status)) {
    return NextResponse.json({ error: "ruleCode and status (acted|dismissed|open) required" }, { status: 400 });
  }
  const owner = await db.person.findFirstOrThrow({ where: { role: "owner" } });
  if (status === "open") {
    await db.insightAction.deleteMany({ where: { personId: owner.id, ruleCode } });
  } else {
    await db.insightAction.upsert({
      where: { personId_ruleCode: { personId: owner.id, ruleCode } },
      create: { personId: owner.id, ruleCode, status },
      update: { status, at: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}

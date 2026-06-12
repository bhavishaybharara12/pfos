// Demo seed: the "Arjun & Meera" family from pfos/02-prd.md personas.
// Deterministic (seeded RNG) so every reseed produces the same world.
import { PrismaClient } from "@prisma/client";
import { mulberry32 } from "../src/lib/engines/rng";
import { amortizationSchedule, emi } from "../src/lib/engines/loan";

const db = new PrismaClient();
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86400000);
const monthsAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() - n);
  return d;
};
const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Monthly (24m) + daily (90d) valuation series ending at `current`, generated backwards. */
function genSeries(
  key: string,
  current: number,
  monthlyDrift: number, // expected monthly growth, e.g. 0.011
  monthlyVol: number,
): { asOfDate: Date; value: number }[] {
  const rand = mulberry32(hashSeed(key));
  const noise = () => (rand() - 0.5) * 2; // [-1, 1]
  const rows: { asOfDate: Date; value: number }[] = [];
  // daily, last 90 days (backwards)
  let v = current;
  const dailyDrift = monthlyDrift / 30;
  const dailyVol = monthlyVol / Math.sqrt(30);
  for (let d = 0; d <= 90; d++) {
    rows.push({ asOfDate: daysAgo(d), value: Math.round(v) });
    v = v / (1 + dailyDrift + noise() * dailyVol);
  }
  // monthly from month 4 to 24
  let mv = v;
  for (let m = 4; m <= 24; m++) {
    mv = mv / (1 + monthlyDrift + noise() * monthlyVol);
    rows.push({ asOfDate: monthsAgo(m), value: Math.round(mv) });
  }
  return rows;
}

async function main() {
  // wipe (FK-safe order)
  await db.$transaction([
    db.insightAction.deleteMany(),
    db.healthScoreSnapshot.deleteMany(),
    db.goalAccountMap.deleteMany(),
    db.goal.deleteMany(),
    db.insurancePolicy.deleteMany(),
    db.creditReport.deleteMany(),
    db.creditCardDetail.deleteMany(),
    db.loanDetail.deleteMany(),
    db.transaction.deleteMany(),
    db.accountValuation.deleteMany(),
    db.position.deleteMany(),
    db.account.deleteMany(),
    db.instrument.deleteMany(),
    db.connection.deleteMany(),
    db.person.deleteMany(),
    db.family.deleteMany(),
  ]);

  const family = await db.family.create({ data: { name: "Sharma Family" } });
  const arjun = await db.person.create({
    data: {
      familyId: family.id,
      fullName: "Arjun Sharma",
      role: "owner",
      dateOfBirth: new Date("1994-04-15"),
      monthlyIncome: 215000,
    },
  });
  const meera = await db.person.create({
    data: {
      familyId: family.id,
      fullName: "Meera Sharma",
      role: "partner",
      dateOfBirth: new Date("1996-08-22"),
      monthlyIncome: 115000,
    },
  });

  // ---------- connections ----------
  const conn = async (personId: string, provider: string, label: string, dq: number, fetchedDaysAgo: number, status = "active") =>
    db.connection.create({
      data: { personId, provider, label, dataQuality: dq, status, lastFetchAt: new Date(TODAY.getTime() - fetchedDaysAgo * 86400000 + 6.2 * 3600000) },
    });

  const aaArjun = await conn(arjun.id, "aa_finvu", "Account Aggregator · Finvu", 78, 0);
  const mfcArjun = await conn(arjun.id, "mf_central", "MF Central", 92, 0);
  const kite = await conn(arjun.id, "broker_zerodha", "Zerodha Kite", 90, 0);
  const cibil = await conn(arjun.id, "cibil", "CIBIL", 95, 3);
  const epfo = await conn(arjun.id, "epfo", "EPFO Passbook", 55, 32, "error");
  const manualA = await conn(arjun.id, "manual", "Manually tracked", 60, 0);
  const aaMeera = await conn(meera.id, "aa_finvu", "Account Aggregator · Finvu", 80, 1);
  const mfcMeera = await conn(meera.id, "mf_central", "MF Central", 92, 0);
  const manualM = await conn(meera.id, "manual", "Manually tracked", 60, 0);

  // ---------- instruments ----------
  const inst = async (type: string, name: string, assetClass: string, extra: Record<string, unknown> = {}) =>
    db.instrument.create({ data: { type, name, assetClass, ...extra } });

  const ppfas = await inst("mutual_fund", "Parag Parikh Flexi Cap Dir-G", "equity", { subClass: "flexi_cap", expenseRatio: 0.63 });
  const utiNifty = await inst("mutual_fund", "UTI Nifty 50 Index Dir-G", "equity", { subClass: "large_cap", expenseRatio: 0.17 });
  const mirae = await inst("mutual_fund", "Mirae Asset Large & Midcap Dir-G", "equity", { subClass: "large_mid_cap", expenseRatio: 0.65 });
  const axisSmall = await inst("mutual_fund", "Axis Small Cap Dir-G", "equity", { subClass: "small_cap", expenseRatio: 0.55 });
  const hdfcBond = await inst("mutual_fund", "HDFC Corporate Bond Dir-G", "debt", { subClass: "corporate_bond", expenseRatio: 0.36 });
  const kotakEq = await inst("mutual_fund", "Kotak Equity Opportunities Dir-G", "equity", { subClass: "large_mid_cap", expenseRatio: 0.58 });
  const sbiBlue = await inst("mutual_fund", "SBI Bluechip Dir-G", "equity", { subClass: "large_cap", expenseRatio: 0.81 });
  const iciciBaf = await inst("mutual_fund", "ICICI Pru Balanced Advantage Dir-G", "equity", { subClass: "hybrid", expenseRatio: 0.69 });

  const stocks = {
    RELIANCE: await inst("stock", "Reliance Industries", "equity", { symbol: "RELIANCE", sector: "Energy" }),
    HDFCBANK: await inst("stock", "HDFC Bank", "equity", { symbol: "HDFCBANK", sector: "Financials" }),
    INFY: await inst("stock", "Infosys", "equity", { symbol: "INFY", sector: "IT" }),
    TCS: await inst("stock", "TCS", "equity", { symbol: "TCS", sector: "IT" }),
    ITC: await inst("stock", "ITC", "equity", { symbol: "ITC", sector: "FMCG" }),
    TATAMOTORS: await inst("stock", "Tata Motors", "equity", { symbol: "TATAMOTORS", sector: "Auto" }),
    DIXON: await inst("stock", "Dixon Technologies", "equity", { symbol: "DIXON", sector: "Electronics" }),
  };

  // ---------- accounts ----------
  type AccSpec = {
    person: string; connection?: string; class: "asset" | "liability"; type: string;
    name: string; institution?: string; assetClass: string; confidence?: number; meta?: object;
  };
  const acc = async (s: AccSpec) =>
    db.account.create({
      data: {
        personId: s.person, connectionId: s.connection, class: s.class, type: s.type,
        displayName: s.name, institution: s.institution, assetClass: s.assetClass,
        confidence: s.confidence ?? 100, meta: s.meta ? JSON.stringify(s.meta) : null,
      },
    });

  const hdfcSav = await acc({ person: arjun.id, connection: aaArjun.id, class: "asset", type: "savings_account", name: "HDFC Savings ··4821", institution: "HDFC Bank", assetClass: "cash" });
  const iciciSav = await acc({ person: arjun.id, connection: aaArjun.id, class: "asset", type: "savings_account", name: "ICICI Savings ··7710", institution: "ICICI Bank", assetClass: "cash" });
  const hdfcFd = await acc({ person: arjun.id, connection: aaArjun.id, class: "asset", type: "fixed_deposit", name: "HDFC FD @7.1%", institution: "HDFC Bank", assetClass: "debt" });
  const folioA = await acc({ person: arjun.id, connection: mfcArjun.id, class: "asset", type: "mf_folio", name: "Mutual Funds (4 folios)", institution: "MF Central", assetClass: "equity" });
  const demat = await acc({ person: arjun.id, connection: kite.id, class: "asset", type: "demat", name: "Zerodha Demat", institution: "Zerodha", assetClass: "equity" });
  const epfA = await acc({ person: arjun.id, connection: epfo.id, class: "asset", type: "epf", name: "EPF (UAN ··8834)", institution: "EPFO", assetClass: "debt" });
  const ppf = await acc({ person: arjun.id, connection: manualA.id, class: "asset", type: "ppf", name: "PPF · SBI", institution: "SBI", assetClass: "debt" });
  const nps = await acc({ person: arjun.id, connection: manualA.id, class: "asset", type: "nps_tier1", name: "NPS Tier 1 (Aggressive)", institution: "Protean CRA", assetClass: "equity" });
  const esop = await acc({
    person: arjun.id, connection: manualA.id, class: "asset", type: "esop_grant", name: "TechCo ESOPs", institution: "TechCo", assetClass: "alternative", confidence: 50,
    meta: { totalOptions: 4800, vested: 2400, strike: 150, fmv: 480, haircut: 0.3 },
  });
  const house = await acc({ person: arjun.id, connection: manualA.id, class: "asset", type: "real_estate", name: "2BHK · Whitefield, Bengaluru", assetClass: "real_estate", confidence: 60 });
  const car = await acc({ person: arjun.id, connection: manualA.id, class: "asset", type: "vehicle", name: "Hyundai Creta (2022)", assetClass: "alternative", confidence: 70 });
  const gold = await acc({ person: arjun.id, connection: manualA.id, class: "asset", type: "gold_jewellery", name: "Gold & Jewellery", assetClass: "gold", confidence: 70 });

  const homeLoan = await acc({ person: arjun.id, connection: aaArjun.id, class: "liability", type: "home_loan", name: "HDFC Home Loan", institution: "HDFC Bank", assetClass: "liability" });
  const persLoan = await acc({ person: arjun.id, connection: cibil.id, class: "liability", type: "personal_loan", name: "Bajaj Personal Loan", institution: "Bajaj Finance", assetClass: "liability" });
  const card = await acc({ person: arjun.id, connection: aaArjun.id, class: "liability", type: "credit_card", name: "HDFC Infinia ··3344", institution: "HDFC Bank", assetClass: "liability" });

  const sbiSav = await acc({ person: meera.id, connection: aaMeera.id, class: "asset", type: "savings_account", name: "SBI Savings ··2289", institution: "SBI", assetClass: "cash" });
  const folioM = await acc({ person: meera.id, connection: mfcMeera.id, class: "asset", type: "mf_folio", name: "Mutual Funds (3 folios)", institution: "MF Central", assetClass: "equity" });
  const epfM = await acc({ person: meera.id, connection: manualM.id, class: "asset", type: "epf", name: "EPF (UAN ··2210)", institution: "EPFO", assetClass: "debt" });

  // ---------- positions ----------
  const pos = (accountId: string, instrumentId: string, qty: number, avgCost: number, price: number) =>
    db.position.create({
      data: { accountId, instrumentId, quantity: qty, avgCost, investedAmount: Math.round(qty * avgCost), currentPrice: price },
    });

  await pos(folioA.id, ppfas.id, 9800, 52, 82.4);
  await pos(folioA.id, utiNifty.id, 14200, 118, 165);
  await pos(folioA.id, mirae.id, 8500, 95, 142);
  await pos(folioA.id, axisSmall.id, 6200, 68, 102);
  await pos(folioA.id, hdfcBond.id, 38000, 26.5, 31.2);
  await pos(demat.id, stocks.RELIANCE.id, 420, 1280, 1520);
  await pos(demat.id, stocks.HDFCBANK.id, 550, 1450, 1685);
  await pos(demat.id, stocks.INFY.id, 380, 1390, 1612);
  await pos(demat.id, stocks.TCS.id, 90, 3450, 3890);
  await pos(demat.id, stocks.ITC.id, 1200, 390, 452);
  await pos(demat.id, stocks.TATAMOTORS.id, 600, 640, 790);
  await pos(demat.id, stocks.DIXON.id, 45, 11500, 14800);
  await pos(folioM.id, kotakEq.id, 5400, 215, 312);
  await pos(folioM.id, sbiBlue.id, 4800, 62, 81);
  await pos(folioM.id, iciciBaf.id, 6500, 52, 68.5);

  // ---------- loans (amounts derived from the amortization engine for consistency) ----------
  const hlPrincipal = 4600000, hlRate = 8.65, hlTenure = 240;
  const hlEmi = Math.round(emi(hlPrincipal, hlRate, hlTenure));
  const hlStart = new Date("2021-06-05");
  const hlElapsed = Math.min(monthsBetween(hlStart, TODAY), hlTenure);
  const hlSched = amortizationSchedule(hlPrincipal, hlRate, hlEmi);
  const hlOutstanding = Math.round(hlSched[hlElapsed - 1].balance);
  await db.loanDetail.create({
    data: { accountId: homeLoan.id, principal: hlPrincipal, outstanding: hlOutstanding, interestRate: hlRate, emi: hlEmi, emiDay: 3, startDate: hlStart, tenureMonths: hlTenure, remainingMonths: hlTenure - hlElapsed },
  });

  const plPrincipal = 480000, plRate = 14.2, plTenure = 48;
  const plEmi = Math.round(emi(plPrincipal, plRate, plTenure));
  const plStart = new Date("2024-08-05");
  const plElapsed = Math.min(monthsBetween(plStart, TODAY), plTenure);
  const plSched = amortizationSchedule(plPrincipal, plRate, plEmi);
  const plOutstanding = Math.round(plSched[plElapsed - 1].balance);
  await db.loanDetail.create({
    data: { accountId: persLoan.id, principal: plPrincipal, outstanding: plOutstanding, interestRate: plRate, emi: plEmi, emiDay: 5, startDate: plStart, tenureMonths: plTenure, remainingMonths: plTenure - plElapsed },
  });

  const cardOutstanding = 86400;
  await db.creditCardDetail.create({
    data: { accountId: card.id, creditLimit: 230000, apr: 42, statementDay: 18, dueDay: 6 },
  });

  // ---------- valuations ----------
  const CURRENT: Record<string, { v: number; drift: number; vol: number }> = {
    [hdfcSav.id]: { v: 462000, drift: 0.004, vol: 0.05 },
    [iciciSav.id]: { v: 118000, drift: 0.002, vol: 0.03 },
    [hdfcFd.id]: { v: 305000, drift: 0.0057, vol: 0.0005 },
    [folioA.id]: { v: 9800 * 82.4 + 14200 * 165 + 8500 * 142 + 6200 * 102 + 38000 * 31.2, drift: 0.011, vol: 0.028 },
    [demat.id]: { v: 420 * 1520 + 550 * 1685 + 380 * 1612 + 90 * 3890 + 1200 * 452 + 600 * 790 + 45 * 14800, drift: 0.012, vol: 0.035 },
    [epfA.id]: { v: 1940000, drift: 0.0068, vol: 0.0008 },
    [ppf.id]: { v: 685000, drift: 0.0059, vol: 0.0005 },
    [nps.id]: { v: 418000, drift: 0.009, vol: 0.015 },
    [esop.id]: { v: Math.round(2400 * (480 - 150) * 0.7), drift: 0.006, vol: 0.0001 },
    [house.id]: { v: 9500000, drift: 0.0058, vol: 0.001 },
    [car.id]: { v: 640000, drift: -0.013, vol: 0.0005 },
    [gold.id]: { v: 460000, drift: 0.007, vol: 0.012 },
    [sbiSav.id]: { v: 284000, drift: 0.003, vol: 0.04 },
    [folioM.id]: { v: 5400 * 312 + 4800 * 81 + 6500 * 68.5, drift: 0.011, vol: 0.026 },
    [epfM.id]: { v: 820000, drift: 0.0068, vol: 0.0008 },
  };

  const valuationRows: { accountId: string; asOfDate: Date; value: number; invested: number | null }[] = [];
  const INVESTED: Record<string, number> = {
    [folioA.id]: Math.round(9800 * 52 + 14200 * 118 + 8500 * 95 + 6200 * 68 + 38000 * 26.5),
    [demat.id]: 420 * 1280 + 550 * 1450 + 380 * 1390 + 90 * 3450 + 1200 * 390 + 600 * 640 + 45 * 11500,
    [folioM.id]: Math.round(5400 * 215 + 4800 * 62 + 6500 * 52),
  };
  for (const [accountId, cfg] of Object.entries(CURRENT)) {
    for (const r of genSeries(accountId, cfg.v, cfg.drift, cfg.vol)) {
      valuationRows.push({ accountId, asOfDate: r.asOfDate, value: r.value, invested: INVESTED[accountId] ?? null });
    }
  }
  // liabilities: negative values from amortization balances
  const loanVal = (accountId: string, sched: { balance: number }[], start: Date) => {
    for (let d = 0; d <= 90; d += 1) {
      const m = Math.max(0, monthsBetween(start, daysAgo(d)));
      valuationRows.push({ accountId, asOfDate: daysAgo(d), value: -Math.round(sched[Math.min(m, sched.length) - 1]?.balance ?? 0), invested: null });
    }
    for (let m = 4; m <= 24; m++) {
      const mm = Math.max(1, monthsBetween(start, monthsAgo(m)));
      valuationRows.push({ accountId, asOfDate: monthsAgo(m), value: -Math.round(sched[Math.min(mm, sched.length) - 1]?.balance ?? 0), invested: null });
    }
  };
  loanVal(homeLoan.id, hlSched, hlStart);
  loanVal(persLoan.id, plSched, plStart);
  {
    const rand = mulberry32(hashSeed(card.id));
    for (let d = 0; d <= 90; d++) valuationRows.push({ accountId: card.id, asOfDate: daysAgo(d), value: -Math.round(cardOutstanding * (0.6 + rand() * 0.8)), invested: null });
    for (let m = 4; m <= 24; m++) valuationRows.push({ accountId: card.id, asOfDate: monthsAgo(m), value: -Math.round(40000 + rand() * 80000), invested: null });
  }
  // today's card value should match detail
  const todayIdx = valuationRows.findIndex((r) => r.accountId === card.id && r.asOfDate.getTime() === TODAY.getTime());
  if (todayIdx >= 0) valuationRows[todayIdx].value = -cardOutstanding;

  for (let i = 0; i < valuationRows.length; i += 500) {
    await db.accountValuation.createMany({ data: valuationRows.slice(i, i + 500) });
  }

  // ---------- transactions (13 months) ----------
  const txns: {
    accountId: string; instrumentId?: string; type: string; txnDate: Date; amount: number;
    description?: string; merchant?: string; category?: string;
  }[] = [];
  const rand = mulberry32(20260612);
  const jitter = (base: number, pct = 0.25) => Math.round(base * (1 - pct + rand() * 2 * pct));
  const dayOf = (monthsBack: number, day: number) => {
    const d = monthsAgo(monthsBack);
    d.setDate(Math.min(day, 28));
    return d;
  };

  for (let m = 12; m >= 0; m--) {
    const isCurrentMonth = m === 0;
    const dayCap = isCurrentMonth ? TODAY.getDate() : 31;
    const push = (day: number, t: (typeof txns)[number]) => {
      if (day <= dayCap) txns.push(t);
    };

    // income
    push(1, { accountId: hdfcSav.id, type: "salary_credit", txnDate: dayOf(m, 1), amount: 215000, description: "SALARY TECHCO INDIA PVT LTD", merchant: "TechCo", category: "Income" });
    push(28, { accountId: sbiSav.id, type: "salary_credit", txnDate: dayOf(m, 28), amount: 115000, description: "SALARY BRANDWORKS", merchant: "BrandWorks", category: "Income" });

    // EMIs
    push(3, { accountId: hdfcSav.id, type: "emi", txnDate: dayOf(m, 3), amount: -hlEmi, description: "HDFC HOME LOAN EMI", merchant: "HDFC Bank", category: "Housing" });
    push(5, { accountId: hdfcSav.id, type: "emi", txnDate: dayOf(m, 5), amount: -plEmi, description: "BAJAJ FINANCE EMI", merchant: "Bajaj Finance", category: "Debt Repayment" });

    // SIPs (also recorded as folio buys for XIRR)
    push(5, { accountId: hdfcSav.id, type: "sip", txnDate: dayOf(m, 5), amount: -85000, description: "ACH MF SIP X 4", category: "Investments" });
    if (5 <= dayCap) {
      for (const [instId, amt] of [[ppfas.id, 25000], [utiNifty.id, 30000], [mirae.id, 15000], [axisSmall.id, 15000]] as [string, number][]) {
        txns.push({ accountId: folioA.id, instrumentId: instId, type: "buy", txnDate: dayOf(m, 5), amount: -amt, description: "SIP purchase", category: "Investments" });
      }
    }
    push(7, { accountId: sbiSav.id, type: "sip", txnDate: dayOf(m, 7), amount: -25000, description: "ACH MF SIP", category: "Investments" });
    if (7 <= dayCap) {
      txns.push({ accountId: folioM.id, instrumentId: kotakEq.id, type: "buy", txnDate: dayOf(m, 7), amount: -15000, description: "SIP purchase", category: "Investments" });
      txns.push({ accountId: folioM.id, instrumentId: iciciBaf.id, type: "buy", txnDate: dayOf(m, 7), amount: -10000, description: "SIP purchase", category: "Investments" });
    }

    // household from savings
    push(4, { accountId: hdfcSav.id, type: "spend", txnDate: dayOf(m, 4), amount: -6500, description: "SOCIETY MAINTENANCE", merchant: "MyGate", category: "Housing" });
    push(9, { accountId: hdfcSav.id, type: "spend", txnDate: dayOf(m, 9), amount: -jitter(3200), description: "BESCOM ELECTRICITY", merchant: "BESCOM", category: "Housing" });
    push(11, { accountId: hdfcSav.id, type: "spend", txnDate: dayOf(m, 11), amount: -1199, description: "JIO FIBER", merchant: "Jio", category: "Housing" });
    push(15, { accountId: hdfcSav.id, type: "spend", txnDate: dayOf(m, 15), amount: -jitter(24000, 0.15), description: "RENT SUPPORT PARENTS", merchant: "Transfer", category: "Lifestyle" });

    // card spends
    const cardSpend = (day: number, base: number, merchant: string, category: string, desc?: string) =>
      push(day, { accountId: card.id, type: "card_spend", txnDate: dayOf(m, day), amount: -jitter(base), description: desc ?? merchant.toUpperCase(), merchant, category });

    cardSpend(2, 3400, "BigBasket", "Food");
    cardSpend(6, 1850, "Swiggy", "Food");
    cardSpend(8, 2100, "Zomato", "Food");
    cardSpend(12, 3300, "BigBasket", "Food");
    cardSpend(14, 1700, "Swiggy", "Food");
    cardSpend(17, 2450, "Blinkit", "Food");
    cardSpend(21, 1900, "Swiggy", "Food");
    cardSpend(24, 2900, "Zomato", "Food");
    cardSpend(27, 2200, "Blinkit", "Food");
    cardSpend(7, 650, "Uber", "Transportation");
    cardSpend(13, 720, "Uber", "Transportation");
    cardSpend(19, 580, "Uber", "Transportation");
    cardSpend(10, 2600, "Indian Oil", "Transportation", "INDIANOIL FUEL");
    cardSpend(23, 2500, "Indian Oil", "Transportation", "INDIANOIL FUEL");
    push(15, { accountId: card.id, type: "card_spend", txnDate: dayOf(m, 15), amount: -649, description: "NETFLIX", merchant: "Netflix", category: "Entertainment" });
    push(20, { accountId: card.id, type: "card_spend", txnDate: dayOf(m, 20), amount: -119, description: "SPOTIFY", merchant: "Spotify", category: "Entertainment" });
    cardSpend(16, 1600, "BookMyShow", "Entertainment");
    cardSpend(9, 2800, "Amazon", "Lifestyle");
    cardSpend(18, 2400, "Amazon", "Lifestyle");
    cardSpend(22, 3100, "Myntra", "Lifestyle");
    cardSpend(26, 2100, "Amazon", "Lifestyle");

    // school fee quarterly
    if (m % 3 === 0) push(8, { accountId: hdfcSav.id, type: "spend", txnDate: dayOf(m, 8), amount: -18500, description: "VIBGYOR SCHOOL FEE", merchant: "Vibgyor", category: "Education" });

    // travel spike 2 months ago (Goa)
    if (m === 2) {
      txns.push({ accountId: card.id, type: "card_spend", txnDate: dayOf(m, 12), amount: -28400, description: "MAKEMYTRIP FLIGHTS", merchant: "MakeMyTrip", category: "Travel" });
      txns.push({ accountId: card.id, type: "card_spend", txnDate: dayOf(m, 14), amount: -14200, description: "TAJ HOLIDAY VILLAGE", merchant: "Taj Hotels", category: "Travel" });
    } else {
      cardSpend(25, 2000, "IRCTC", "Travel");
    }

    // insurance premiums (annual)
    if (monthsAgo(m).getMonth() === 6) push(10, { accountId: hdfcSav.id, type: "spend", txnDate: dayOf(m, 10), amount: -28400, description: "CARE HEALTH PREMIUM", merchant: "Care Health", category: "Insurance" });
    if (monthsAgo(m).getMonth() === 10) push(12, { accountId: hdfcSav.id, type: "spend", txnDate: dayOf(m, 12), amount: -12800, description: "ICICI LOMBARD MOTOR", merchant: "ICICI Lombard", category: "Insurance" });

    // card payment (previous statement) — internal transfer, excluded from spend analytics
    push(6, { accountId: hdfcSav.id, type: "card_payment", txnDate: dayOf(m, 6), amount: -jitter(52000, 0.2), description: "HDFC CARD AUTOPAY", merchant: "HDFC Bank", category: "Transfer" });

    // quarterly savings interest
    if (m % 3 === 1) {
      push(30, { accountId: hdfcSav.id, type: "interest", txnDate: dayOf(m, 30), amount: jitter(2400), description: "INT.PD", category: "Income" });
    }

    // Meera spends
    push(10, { accountId: sbiSav.id, type: "spend", txnDate: dayOf(m, 10), amount: -jitter(9500), description: "DMART", merchant: "DMart", category: "Food" });
    push(16, { accountId: sbiSav.id, type: "spend", txnDate: dayOf(m, 16), amount: -jitter(4200), description: "NYKAA", merchant: "Nykaa", category: "Lifestyle" });
    push(20, { accountId: sbiSav.id, type: "spend", txnDate: dayOf(m, 20), amount: -jitter(3600), description: "UBER / BMTC", merchant: "Uber", category: "Transportation" });
  }

  // initial lumpsum buys (3 years ago) so XIRR has a sensible base
  txns.push({ accountId: folioA.id, instrumentId: ppfas.id, type: "buy", txnDate: monthsAgo(36), amount: -180000, description: "Lumpsum", category: "Investments" });
  txns.push({ accountId: folioA.id, instrumentId: utiNifty.id, type: "buy", txnDate: monthsAgo(36), amount: -1280000, description: "Lumpsum", category: "Investments" });
  txns.push({ accountId: folioA.id, instrumentId: mirae.id, type: "buy", txnDate: monthsAgo(36), amount: -610000, description: "Lumpsum", category: "Investments" });
  txns.push({ accountId: folioA.id, instrumentId: axisSmall.id, type: "buy", txnDate: monthsAgo(30), amount: -230000, description: "Lumpsum", category: "Investments" });
  txns.push({ accountId: folioA.id, instrumentId: hdfcBond.id, type: "buy", txnDate: monthsAgo(36), amount: -1007000, description: "Lumpsum", category: "Investments" });
  txns.push({ accountId: demat.id, type: "buy", txnDate: monthsAgo(34), amount: -2100000, description: "Stock purchases (aggregated)", category: "Investments" });
  txns.push({ accountId: demat.id, type: "buy", txnDate: monthsAgo(18), amount: -1200000, description: "Stock purchases (aggregated)", category: "Investments" });
  txns.push({ accountId: folioM.id, instrumentId: kotakEq.id, type: "buy", txnDate: monthsAgo(40), amount: -836000, description: "Lumpsum", category: "Investments" });
  txns.push({ accountId: folioM.id, instrumentId: sbiBlue.id, type: "buy", txnDate: monthsAgo(40), amount: -297600, description: "Lumpsum", category: "Investments" });

  for (let i = 0; i < txns.length; i += 300) {
    await db.transaction.createMany({ data: txns.slice(i, i + 300) });
  }

  // ---------- credit reports ----------
  const scores = [748, 752, 755, 760, 758, 763, 767, 771];
  for (let i = 0; i < scores.length; i++) {
    await db.creditReport.create({
      data: {
        personId: arjun.id, bureau: "CIBIL", score: scores[i], pulledAt: monthsAgo(scores.length - 1 - i),
        utilization: 0.31 + (i % 3) * 0.03, activeLoans: 3, enquiries6m: 1,
      },
    });
  }

  // ---------- insurance ----------
  await db.insurancePolicy.create({
    data: { personId: arjun.id, type: "health", insurer: "Care Health", sumAssured: 1000000, annualPremium: 28400, renewalDate: new Date(TODAY.getFullYear(), 6, 10) },
  });
  await db.insurancePolicy.create({
    data: { personId: arjun.id, type: "motor", insurer: "ICICI Lombard", sumAssured: 850000, annualPremium: 12800, renewalDate: new Date(TODAY.getFullYear(), 10, 12) },
  });
  // NOTE: no term life policy — INS_LIFE_GAP insight should fire.

  // ---------- goals ----------
  const goalRows = [
    {
      type: "emergency_fund", name: "Emergency Fund", targetAmount: 480000,
      targetDate: new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), 1), inflationRate: 0, priority: 1, monthlySip: 0,
      maps: [{ accountId: hdfcFd.id, pct: 100 }, { accountId: iciciSav.id, pct: 100 }],
    },
    {
      type: "child_education", name: "Riya's Education", targetAmount: 6000000,
      targetDate: new Date(TODAY.getFullYear() + 10, 5, 1), inflationRate: 0.1, priority: 1, monthlySip: 25000,
      maps: [{ accountId: folioM.id, pct: 80 }],
    },
    {
      type: "house", name: "House Upgrade Down Payment", targetAmount: 4000000,
      targetDate: new Date(TODAY.getFullYear() + 5, 3, 1), inflationRate: 0.07, priority: 2, monthlySip: 20000,
      maps: [{ accountId: folioA.id, pct: 30 }],
    },
    {
      type: "retirement", name: "Retirement", targetAmount: 0,
      targetDate: new Date(TODAY.getFullYear() + 23, 3, 1), inflationRate: 0.06, priority: 1, monthlySip: 65000,
      maps: [
        { accountId: epfA.id, pct: 100 }, { accountId: ppf.id, pct: 100 }, { accountId: nps.id, pct: 100 },
        { accountId: folioA.id, pct: 50 }, { accountId: demat.id, pct: 60 }, { accountId: epfM.id, pct: 100 },
      ],
    },
  ];
  for (const g of goalRows) {
    const goal = await db.goal.create({
      data: {
        familyId: family.id, type: g.type, name: g.name, targetAmount: g.targetAmount,
        targetDate: g.targetDate, inflationRate: g.inflationRate, priority: g.priority, monthlySip: g.monthlySip,
      },
    });
    for (const mp of g.maps) {
      await db.goalAccountMap.create({ data: { goalId: goal.id, accountId: mp.accountId, allocationPct: mp.pct } });
    }
  }

  // ---------- health score history ----------
  const totals = [66, 67, 67, 68, 69, 70, 70, 71, 72, 72, 73, 74];
  for (let i = 0; i < totals.length; i++) {
    await db.healthScoreSnapshot.create({
      data: {
        personId: arjun.id, runDate: monthsAgo(totals.length - 1 - i), total: totals[i],
        components: JSON.stringify({ trend: "seeded-history" }),
      },
    });
  }

  const counts = {
    accounts: await db.account.count(),
    valuations: await db.accountValuation.count(),
    transactions: await db.transaction.count(),
    positions: await db.position.count(),
    goals: await db.goal.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

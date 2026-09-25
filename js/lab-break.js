function sumWhere(rows, fn) { return rows.filter(fn).reduce((s, r) => s + num(r.amount || r.usd), 0); }
function unitsWhere(rows, fn) { return rows.filter(fn).reduce((s, r) => s + (num(r.units) || 1), 0); }
function tile(title, value, note) {
  return `<div class="tile"><strong>${title}</strong><div class="value">${value}</div><div class="hint">${note || ""}</div></div>`;
}
function renderLab() {
  const s = store();
  const A = s.rows.filter(r => r.module === "A");
  const B = s.rows.filter(r => r.module === "B");
  const C = s.rows.filter(r => r.module === "C");
  const D = s.rows.filter(r => r.module === "D");
  const presale = sumWhere(A, r => /presale/i.test(r.cohort || ""));
  const aftersale = sumWhere(A, r => /aftersale/i.test(r.cohort || ""));
  const new26 = sumWhere(A, r => /new_bdag/i.test(r.cohort || ""));
  const otherPay = sumWhere(A, r => !/presale|aftersale|new_bdag/i.test(r.cohort || ""));
  const Tobs = presale + aftersale + new26 + otherPay;
  const bonusCoins = B.reduce((s, r) => s + num(r.amount), 0);
  const buyback = sumWhere(C, r => /buyback/i.test(r.program || ""));
  const swap = sumWhere(C, r => /swap/i.test(r.program || ""));
  const claim = sumWhere(C, r => /claim/i.test(r.program || ""));
  const dashUsdt = sumWhere(C, r => /dashboard/i.test(r.program || ""));
  const minerPaidUsd = D.filter(r => r.event === "paid").reduce((s, r) => s + num(r.usd), 0);
  const minerPaidU = unitsWhere(D, r => r.event === "paid" && /X10|X30|X100/.test(r.sku || ""));
  const minerDelU = unitsWhere(D, r => r.event === "delivered" && /X10|X30|X100/.test(r.sku || ""));
  const n = s.wallet ? 1 : 0;
  const xbar = A.length ? Tobs / A.length : 0;
  const hw = D.filter(r => /X10|X30|X100/.test(r.sku || ""));
  const pN = betaMean(1 + (hw.length ? 1 : 0), 1 + Math.max(0, n - (hw.length ? 1 : 0)));
  const pS = betaMean(2 + (hw.length ? 1 : 0), 8 + Math.max(0, n - (hw.length ? 1 : 0)));
  if (q("indivReport")) {
    q("indivReport").innerHTML =
      tile("Presale cash (observed)", presale, "Cohort presale_2024_25. Not added to buyback.") +
      tile("Aftersale cash (observed)", aftersale, "Cohort aftersale.") +
      tile("2026 New / other paid cash", new26 + otherPay, "Separate vintage / other.") +
      tile("Grant coins (not cash)", bonusCoins, "Forbidden in T_obs.") +
      tile("Buyback amount as shown", buyback, "Flow / right. Not 2025 stock.") +
      tile("Swap amount as shown", swap, "Do not net into T_obs.") +
      tile("Claim amount as shown", claim, "Claim event, not cash raised.") +
      tile("Dashboard USDT right", dashUsdt, "A view, not banked cash.") +
      tile("Miner USD paid", minerPaidUsd, "Hardware cash table.") +
      tile("Miner units paid / delivered", minerPaidU + " / " + minerDelU, "Two events. Do not pool.") +
      tile("E5", s.e5 || "—", "Unweighted attitude.");
  }
  chart("meChart",
    ["Presale","Aftersale","New/other","Buyback","Swap","Miner USD"],
    [presale, aftersale, new26 + otherPay, buyback, swap, minerPaidUsd],
    "Observed layers (not one total)");
  if (q("publicA")) {
    q("publicA").innerHTML =
      tile("n reporters (this file)", n, "Among wallets that reported to this application.") +
      tile("T_obs paid-in cash", Tobs, "Purchase module only. Bonus and rights excluded.") +
      tile("Presale T_obs", presale, "") +
      tile("Aftersale T_obs", aftersale, "") +
      tile("Buyback flow (observed)", buyback, "2026 flow table.") +
      tile("Swap flow (observed)", swap, "") +
      tile("Miner paid USD / units", minerPaidUsd + " / " + minerPaidU, "Sold-event card.") +
      tile("Miner delivered units", minerDelU, "Delivered-event card.") +
      tile("p_k hardware (neutral / skeptical)", pN.toFixed(2) + " / " + pS.toFixed(2), "Among reporters. Not percent of all buyers.");
  }
  chart("aChart", ["Presale","Aftersale","Buyback","Swap","Miner paid USD"], [presale, aftersale, buyback, swap, minerPaidUsd], "Surface A layers");
  const fans = [
    ["Presale", presale, A.filter(r => /presale/i.test(r.cohort || "")).length ? presale / Math.max(1, A.filter(r => /presale/i.test(r.cohort || "")).length) : 0],
    ["Aftersale", aftersale, A.filter(r => /aftersale/i.test(r.cohort || "")).length ? aftersale / Math.max(1, A.filter(r => /aftersale/i.test(r.cohort || "")).length) : 0],
    ["Paid-in all cohorts", Tobs, xbar]
  ];
  if (q("publicC")) {
    q("publicC").innerHTML = fans.map(([name, T, x]) => {
      const cells = [0.3, 0.5, 0.8].map(c => `c=${c} N=40k ${that(T, n, 40000, c, x).toFixed(0)}`).join(" · ");
      return tile("T-hat " + name, cells, "Scenario range. Not an official BlockDAG total. Fan off as identified N until more reporters exist.");
    }).join("") + tile("Buyback / swap", "no cash T-hat", "Flows stay in the flow table.") +
      tile("Miner units paid M-hat", [0.3,0.5,0.8].map(c => `c=${c} ${that(minerPaidU, n, 40000, c, minerPaidU || 0).toFixed(1)}`).join(" · "), "Sold-event only. Separate from delivered.");
  }
  chart("cChart", ["Presale c.5","Aftersale c.5","All cash c.5"], [
    that(presale, n, 40000, 0.5, fans[0][2]),
    that(aftersale, n, 40000, 0.5, fans[1][2]),
    that(Tobs, n, 40000, 0.5, xbar)
  ], "T-hat N=40k c=0.5 illustration");
  if (q("labPoints")) q("labPoints").textContent = s.points;
}

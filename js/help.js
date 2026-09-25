const HELP = {
  Presale: "Observed cash you typed for cohort presale_2024_25. Only the purchase chapter. Bonus coins are excluded. This is T_obs for that cohort among rows in this file, not total raised worldwide.",
  Aftersale: "Observed cash for the aftersale cohort. Kept separate from presale because the papers treat cohorts as different strata.",
  "2026 New": "Paid cash marked new_bdag_2026 or other. Still cash T_obs, still not added to buyback or dashboard USDT.",
  Grant: "Grant or referral coins. The protocol forbids putting these into T_obs or pricing them at an assumed listing price.",
  Buyback: "Amount as shown on a buyback / USDT repurchase screen. A 2026 program flow or right. Not added to 2024-25 paid-in stock.",
  Swap: "Amount as shown on a swap. Legs are not netted into cash raised.",
  Claim: "Coins or status from a claim event. Not cash raised.",
  Dashboard: "A number on a dashboard. A view, not chain state, and not banked USDT.",
  MinerUSD: "USD you said you paid for hardware. Lives in the miner cash table so it is not also counted as BDAG coins.",
  MinerUnits: "Units at event paid versus event delivered. Official sold counts and delivered counts are different estimands.",
  E5: "Which ledger you treat as mainnet. Attitude only. Shown as a count among reporters. It does not weight money.",
  Tobs: "Sum of paid-in cash in the purchase module after cleaning rules. Caption: among wallets that reported to this application.",
  That: "T-hat(N,c)=T_obs+(N-n)*c*x-bar. N is an assumed unobserved wallet count. c is how much those missing wallets are assumed to resemble reporters (0.3, 0.5, 0.8). This is a scenario fan, not an official BlockDAG total. With n=1 it is not identified."
};
function tile(title, value, note, helpKey) {
  const k = helpKey || title.split(" ")[0];
  const text = HELP[k] || note || "Observed figure among rows in this preview file.";
  return `<div class="tile"><button type="button" class="info" onclick="this.nextElementSibling.classList.toggle('on')" aria-label="Explain this figure"><i class="fa-solid fa-circle-info"></i></button><strong>${title}</strong><div class="value">${value}</div><div class="helpbox">${text}</div><div class="hint">${note || ""}</div></div>`;
}

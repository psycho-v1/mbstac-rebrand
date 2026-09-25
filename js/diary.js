const DIARY_KEY = "mbstac_diary_v1";
function diary() {
  const d = JSON.parse(localStorage.getItem(DIARY_KEY) || "null") || {
    wallets: [], buys: [], miners: [], x1: [], telegram: [], buyback: [], exchanges: []
  };
  if (!Array.isArray(d.wallets)) d.wallets = [];
  return d;
}
function saveDiary(d) { localStorage.setItem(DIARY_KEY, JSON.stringify(d)); paintDiary(); }
function addRow(key, row) { const d = diary(); d[key].push(row); saveDiary(d); }
function delRow(key, i) { const d = diary(); d[key].splice(i, 1); saveDiary(d); }
function val(id) { return (document.getElementById(id)?.value || "").trim(); }
function addWallet() {
  const a = val("diaryWallet");
  if (!/^0x[a-fA-F0-9]{40}$/i.test(a)) return alert("Need a 0x address.");
  const d = diary();
  const addr = a.toLowerCase();
  const note = val("diaryWalletNote");
  const existing = d.wallets.find(w => (w.address || "").toLowerCase() === addr);
  if (existing) { existing.note = note || existing.note; saveDiary(d); return; }
  d.wallets.push({ address: a, note });
  saveDiary(d);
  const box = document.getElementById("diaryWallet"); if (box) box.value = "";
}
function addConnectedWallet() {
  const a = sourceWallet || val("compare-wallet-address");
  const box = document.getElementById("diaryWallet");
  if (box) box.value = a || "";
  addWallet();
}
function useWallet(i) {
  const w = diary().wallets[i]; if (!w) return;
  const input = document.getElementById("compare-wallet-address");
  if (input) input.value = w.address;
  if (typeof showPane === "function") showPane("read");
}
function addBuy() {
  const h = val("diaryBuyHash");
  if (h && !/^0x[a-fA-F0-9]{64}$/i.test(h)) return alert("Hash should be 0x plus 64 characters.");
  addRow("buys", { hash: h, kind: val("diaryBuyKind"), amount: val("diaryBuyAmt"), date: val("diaryBuyDate"), wallet: val("diaryBuyWallet") || val("compare-wallet-address") });
}
function addMinerTx() {
  addRow("miners", { hash: val("diaryMinerHash"), type: val("diaryMinerType"), qty: val("diaryMinerQty"), usd: val("diaryMinerUsd"), date: val("diaryMinerDate"), wallet: val("diaryMinerWallet") || val("compare-wallet-address") });
}
function addX1() { addRow("x1", { amount: val("diaryX1"), date: val("diaryX1Date"), note: val("diaryX1Note"), wallet: val("diaryX1Wallet") }); }
function addTg() { addRow("telegram", { points: val("diaryTg"), date: val("diaryTgDate"), note: val("diaryTgNote") }); }
function addBuyback() { addRow("buyback", { usdt: val("diaryBbUsdt"), track: val("diaryBbTrack"), date: val("diaryBbDate"), note: val("diaryBbNote"), wallet: val("diaryBbWallet") }); }
function addEx() { addRow("exchanges", { name: val("diaryExName"), status: val("diaryExStatus"), note: val("diaryExNote") }); }
function walletOptions(id) {
  const sel = document.getElementById(id); if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">which wallet?</option>' + diary().wallets.map(w => `<option value="${w.address}">${w.note ? w.note + " — " : ""}${w.address.slice(0,6)}…${w.address.slice(-4)}</option>`).join("");
  if (cur) sel.value = cur;
}
function list(key, fmt) {
  const host = document.getElementById("list-" + key); if (!host) return;
  const rows = diary()[key] || [];
  host.innerHTML = rows.map((r, i) => `<div class="diary-item">${fmt(r, i)}</div>`).join("") || "<p class='hint'>None yet.</p>";
}
function paintDiary() {
  list("wallets", (r, i) => `<div class="hash">${r.address}</div><div>${r.note || "wallet " + (i+1)}</div>
    <button type="button" class="btn-mint" onclick="useWallet(${i})">Use for compare</button>
    <button type="button" class="btn-ghost" onclick="delRow('wallets',${i})">Remove</button>`);
  list("buys", r => `${r.date || ""} · ${r.kind} · ${r.amount || ""} · ${r.wallet || ""}<div class="hash">${r.hash || "no hash"}</div>`);
  list("miners", r => `${r.date || ""} · ${r.qty || ""}× ${r.type} · ${r.wallet || ""}<div class="hash">${r.hash || "no hash"}</div>`);
  list("x1", r => `${r.date || ""} · X1 ${r.amount || ""} · ${r.wallet || ""} ${r.note || ""}`);
  list("telegram", r => `${r.date || ""} · tap ${r.points || ""} ${r.note || ""}`);
  list("buyback", r => `${r.date || ""} · ${r.track} · USDT ${r.usdt || ""} · ${r.wallet || ""}`);
  list("exchanges", r => `${r.name || "exchange"} · ${r.status} · ${r.note || ""}`);
  ["diaryBuyWallet","diaryMinerWallet","diaryX1Wallet","diaryBbWallet"].forEach(walletOptions);
  const n = document.getElementById("walletCount");
  if (n) n.textContent = diary().wallets.length + " wallet(s) saved";
}
function exportDiary() {
  const blob = new Blob([JSON.stringify(diary(), null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mbstac-diary.json"; a.click();
}
document.addEventListener("DOMContentLoaded", paintDiary);

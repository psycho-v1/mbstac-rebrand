const DIARY_KEY = "mbstac_diary_v1";
function diary() {
  return JSON.parse(localStorage.getItem(DIARY_KEY) || JSON.stringify({
    wallets: [], buys: [], miners: [], x1: [], telegram: [], buyback: [], exchanges: []
  }));
}
function saveDiary(d) { localStorage.setItem(DIARY_KEY, JSON.stringify(d)); paintDiary(); }
function addRow(key, row) { const d = diary(); d[key].push(row); saveDiary(d); }
function delRow(key, i) { const d = diary(); d[key].splice(i, 1); saveDiary(d); }
function val(id) { return (document.getElementById(id)?.value || "").trim(); }
function addWallet() { const a = val("diaryWallet"); if (!/^0x[a-fA-F0-9]{40}$/i.test(a)) return alert("Need a 0x address."); addRow("wallets", { address: a, note: val("diaryWalletNote") }); }
function addBuy() { const h = val("diaryBuyHash"); if (h && !/^0x[a-fA-F0-9]{64}$/i.test(h)) return alert("Hash should be 0x plus 64 characters."); addRow("buys", { hash: h, kind: val("diaryBuyKind"), amount: val("diaryBuyAmt"), date: val("diaryBuyDate") }); }
function addMinerTx() { addRow("miners", { hash: val("diaryMinerHash"), type: val("diaryMinerType"), qty: val("diaryMinerQty"), usd: val("diaryMinerUsd"), date: val("diaryMinerDate") }); }
function addX1() { addRow("x1", { amount: val("diaryX1"), date: val("diaryX1Date"), note: val("diaryX1Note") }); }
function addTg() { addRow("telegram", { points: val("diaryTg"), date: val("diaryTgDate"), note: val("diaryTgNote") }); }
function addBuyback() { addRow("buyback", { usdt: val("diaryBbUsdt"), track: val("diaryBbTrack"), date: val("diaryBbDate"), note: val("diaryBbNote") }); }
function addEx() { addRow("exchanges", { name: val("diaryExName"), status: val("diaryExStatus"), note: val("diaryExNote") }); }
function list(key, fmt) {
  const host = document.getElementById("list-" + key); if (!host) return;
  const rows = diary()[key] || [];
  host.innerHTML = rows.map((r, i) => `<div class="diary-item">${fmt(r)} <button type="button" class="btn-ghost" onclick="delRow('${key}',${i})">Remove</button></div>`).join("") || "<p class='hint'>None yet.</p>";
}
function paintDiary() {
  list("wallets", r => `<div class="hash">${r.address}</div><div>${r.note || ""}</div>`);
  list("buys", r => `${r.date || ""} · ${r.kind} · ${r.amount || ""}<div class="hash">${r.hash || "no hash"}</div>`);
  list("miners", r => `${r.date || ""} · ${r.qty || ""}× ${r.type} · $${r.usd || ""}<div class="hash">${r.hash || "no hash"}</div>`);
  list("x1", r => `${r.date || ""} · X1 ${r.amount || ""} ${r.note || ""}`);
  list("telegram", r => `${r.date || ""} · tap ${r.points || ""} ${r.note || ""}`);
  list("buyback", r => `${r.date || ""} · ${r.track} · USDT ${r.usdt || ""} ${r.note || ""}`);
  list("exchanges", r => `${r.name || "exchange"} · ${r.status} · ${r.note || ""}`);
}
function exportDiary() {
  const blob = new Blob([JSON.stringify(diary(), null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mbstac-diary.json"; a.click();
}
document.addEventListener("DOMContentLoaded", paintDiary);

const SKEY = "mbase_story_v3";
const TX = /^0x[a-fA-F0-9]{64}$/;
const ADDR = /^0x[a-fA-F0-9]{40}$/;
function store() {
  return JSON.parse(localStorage.getItem(SKEY) || "null") || {
    step: 0, consent: false, wallet: "", pick: {}, rows: [], e5: "", signed: false, points: 0
  };
}
function put(s) { localStorage.setItem(SKEY, JSON.stringify(s)); paintStory(); paintEdit(); }
function q(id) { return document.getElementById(id); }
function val(id) { return (q(id)?.value || "").trim(); }
function chk(id) { return !!q(id)?.checked; }
function needTx(h) { return TX.test(h); }

const CHAPTERS = [
  { id: "hello", title: "Start your diary", ask: "This file is voluntary and incomplete. Signing later only proves you control a key now. It does not prove that key paid the project." },
  { id: "who", title: "Which wallet is telling this story?", ask: "Paste or connect the reporting address. It may differ from an exchange deposit or a vesting beneficiary. We store the link as asserted, not proved." },
  { id: "screen", title: "What happened to you?", ask: "Tick every situation that applies. Ticking none writes no zeros. You will only see the next chapters you need." },
  { id: "A", title: "The purchase", ask: "Paid Legacy or New BDAG, or a presale / aftersale batch. Cash paid and grant coins stay separate. A transaction hash is required for a paid row." },
  { id: "B", title: "Coins you did not pay for", ask: "Referral, extra New, or other grant. These coins are not cash raised." },
  { id: "C", title: "Buyback, swap, or claim", ask: "A program flow or a dashboard right — not 2025 stock. If money moved on chain, add the hash." },
  { id: "D", title: "Mining chapter", ask: "X1 and Telegram tap are app use. X10 / X30 / X100 are hardware. Paid and delivered are different events. A hash is required when you say you paid." },
  { id: "E", title: "Other BlockDAG apps", ask: "Use, not cash. Casino, card, and similar stay optional." },
  { id: "E1", title: "Stuck on an exchange", ask: "A custodial credit is not an on-chain balance. We hash account IDs. We do not add this number to wallet stock." },
  { id: "E2", title: "Wallet an exchange will not take", ask: "Name the address. We will read both histories later. Keep your word (stuck, frozen) separate from the technical flag." },
  { id: "E3", title: "Unclaimed vesting", ask: "A remainder is a remainder. We will not price it in USD." },
  { id: "E4", title: "A number on a dashboard", ask: "A view, not chain state. Say whether you could move it." },
  { id: "E5", title: "Which ledger do you treat as mainnet?", ask: "This is an attitude item. It does not weight money. There is no button labelled official mainnet." },
  { id: "done", title: "Chapter closed", ask: "Review, edit, or export. Ten Lab points are recorded on this device when the diary is complete. No BDAG fee." }
];

function activeChapters(s) {
  const p = s.pick || {};
  const list = ["hello", "who", "screen"];
  if (p.A) list.push("A"); if (p.B) list.push("B"); if (p.C) list.push("C"); if (p.D) list.push("D"); if (p.E) list.push("E");
  if (p.E1) list.push("E1"); if (p.E2) list.push("E2"); if (p.E3) list.push("E3"); if (p.E4) list.push("E4");
  list.push("E5", "done");
  return list;
}
function chapterHtml(id, s) {
  if (id === "hello") return `<p>${CHAPTERS[0].ask}</p><div class="form-check"><input class="form-check-input" type="checkbox" id="consent" ${s.consent ? "checked" : ""}><label class="form-check-label" for="consent">I understand reports are voluntary, the file is incomplete, and published figures are not official BlockDAG totals.</label></div>`;
  if (id === "who") return `<label class="form-label">Reporting wallet</label><input id="walletBox" class="form-control hash" value="${s.wallet || ""}" placeholder="0x…"><button type="button" class="btn-ghost mt-2" onclick="connectWallet()">Connect</button>`;
  if (id === "screen") return [
    ["A","I paid for Legacy BDAG, New BDAG, or a presale / aftersale batch."],
    ["B","I received referral or grant / extra New BDAG."],
    ["C","I used a buyback, swap, dashboard-USDT, or Legacy-claim program."],
    ["D","I used X1, Telegram tap, or I ordered / paid / received X10, X30, or X100."],
    ["E","I used another listed app (exchange, staking, casino, card…)."],
    ["E1","An exchange shows a credit I cannot withdraw."],
    ["E2","I hold BDAG on a community RPC and cannot deposit it to an exchange."],
    ["E3","I have an unclaimed vesting or claim remainder."],
    ["E4","A dashboard shows a figure I cannot move."]
  ].map(([k,t]) => `<div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="p${k}" ${s.pick[k] ? "checked" : ""}><label class="form-check-label" for="p${k}">${t}</label></div>`).join("");
  if (id === "A") return fields([
    ["date","date","When did you pay?"],["vintage","select","Which vintage?",["Legacy BDAG","New BDAG","unknown"]],
    ["cohort","select","Which cohort?",["presale_2024_25","aftersale","new_bdag_2026","other","unknown batch"]],
    ["amount","text","How much cash did you pay?"],["currency","text","Currency (USDT, USD…)"],
    ["coins_paid","text","Coins from that payment (not bonus)"],["coins_bonus","text","Bonus coins on the same ticket, if any"],
    ["hash","text","Transaction hash (required) 0x + 64 characters"]
  ]);
  if (id === "B") return fields([["date","date","When did the grant appear?"],["amount","text","How many grant coins?"],["note","text","Code or label if you remember"]]);
  if (id === "C") return fields([
    ["date","date","Date of the program"],["program","select","Which label?",["buyback USDT","swap","legacy claim","dashboard USDT","extra New","other"]],
    ["amount","text","Amount as shown"],["asset","select","Asset",["USDT","BDAG","other"]],
    ["hash","text","Hash if value moved on chain (required when you sent or received on chain)"]
  ]);
  if (id === "D") return fields([
    ["date","date","Date"],["sku","select","Which miner?",["X1 app","Telegram tap","X10","X30","X100"]],
    ["event","select","What happened?",["used","ordered","paid","shipped","delivered","powered"]],
    ["units","text","How many units?"],["usd","text","USD paid if you bought hardware"],
    ["hash","text","Hash required if event is paid or ordered"]
  ]);
  if (id === "E") return fields([["surface","select","Which surface?",["Super App","exchange","staking","NFT","casino","sportsbook","BDUSD","Plus Wallet","card","fan token","other"]],["used","select","Status",["installed","used 30d","account","deposit","prefer not to say"]]]);
  if (id === "E1") return fields([["venue","text","Venue name"],["amount","text","Amount as shown"],["asset","select","Asset",["BDAG","USDT","other"]],["fail","select","What happened?",["pending","rejected","ignored","wrong-network","checkpoint-mismatch","frozen","other"]],["uid","text","Email or UID (we store a hash only)"],["deposit","text","Deposit 0x if you have one"]]);
  if (id === "E2") return fields([["address","text","Wallet 0x"],["amount","text","Balance you see"],["dest","text","Which venue refused it?"],["word","select","Your word",["stuck","frozen","cannot send","stolen","other"]],["tech","select","Technical word",["immobilised","transferable","unknown","spend-observed"]]]);
  if (id === "E3") return fields([["contract","text","Contract 0x or unknown"],["amount","text","Amount the UI showed"],["status","select","Claim status",["unclaimed","claimed","reverted","ineligible","unknown"]],["hash","text","Failed claim hash if any"]]);
  if (id === "E4") return fields([["dash","text","Which dashboard?"],["amount","text","Amount shown"],["asset","select","Asset",["BDAG","USDT","points","other"]],["move","select","Could you withdraw or claim it?",["yes","no","unknown"]]]);
  if (id === "E5") return `<p>The August papers disagree. Your answer is a proportion among reporters only.</p>
    <select id="e5box" class="form-select">
      <option value="">Choose one</option>
      <option value="community_peer_connected">Community / peer-connected history</option>
      <option value="bdagscan_rpc">bdagscan RPC history</option>
      <option value="both_are_real_and_incompatible">Both are real and incompatible</option>
      <option value="neither_is_what_I_was_sold">Neither is what I was sold</option>
      <option value="do_not_know">I do not know</option>
    </select>`;
  return `<p>You can edit any chapter from the list below. Lab points: ${s.points}.</p><button type="button" class="btn-ghost" onclick="exportStory()">Export JSON</button>`;
}
function fields(list) {
  return list.map(([id, t, label, opts]) => {
    if (t === "select") return `<label class="form-label mt-2">${label}</label><select id="f_${id}" class="form-select">${opts.map(o => `<option>${o}</option>`).join("")}</select>`;
    return `<label class="form-label mt-2">${label}</label><input id="f_${id}" class="form-control" type="${t}">`;
  }).join("");
}
function draw() {
  const s = store();
  const ids = activeChapters(s);
  if (s.step >= ids.length) s.step = ids.length - 1;
  const id = ids[s.step];
  const meta = CHAPTERS.find(c => c.id === id);
  q("stepHint").textContent = `Chapter ${s.step + 1} of ${ids.length} — ${meta.title}`;
  q("bar").style.width = Math.round(((s.step + 1) / ids.length) * 100) + "%";
  q("chapter").innerHTML = `<h2>${meta.title}</h2><p class="hint">${meta.ask}</p>` + chapterHtml(id, s);
  if (id === "E5" && s.e5) q("e5box").value = s.e5;
}
function readChapter(id, s) {
  if (id === "hello") { s.consent = chk("consent"); return !s.consent ? "Tick the consent box to continue." : ""; }
  if (id === "who") {
    s.wallet = val("walletBox") || (typeof sourceWallet === "string" ? sourceWallet : "");
    return ADDR.test(s.wallet) ? "" : "Need a 0x address.";
  }
  if (id === "screen") {
    ["A","B","C","D","E","E1","E2","E3","E4"].forEach(k => s.pick[k] = chk("p" + k));
    return "";
  }
  if (id === "E5") { s.e5 = val("e5box"); return s.e5 ? "" : "Choose one answer. This item does not move money."; }
  if (id === "done") return "";
  const row = { module: id, date: val("f_date") || "unknown", class: id };
  ["vintage","cohort","amount","currency","coins_paid","coins_bonus","hash","note","program","asset","sku","event","units","usd","surface","used","venue","fail","uid","deposit","address","dest","word","tech","contract","status","dash","move"].forEach(k => {
    const v = val("f_" + k); if (v) row[k] = v;
  });
  if (id === "A" && !needTx(row.hash || "")) return "A paid purchase needs a 0x transaction hash.";
  if (id === "D" && (row.event === "paid" || row.event === "ordered") && !needTx(row.hash || "")) return "Paid or ordered miners need a 0x hash.";
  if (id === "C" && row.program && /swap|claim/i.test(row.program) && row.hash && !needTx(row.hash)) return "If you paste a hash it must be 0x + 64 hex characters.";
  if (id === "E1" && row.uid) { row.uid = "hashed-later"; row._rawUid = val("f_uid"); }
  s.rows = s.rows.filter(r => r.module !== id);
  s.rows.push(row);
  return "";
}
async function next() {
  const s = store();
  const ids = activeChapters(s);
  const err = readChapter(ids[s.step], s);
  if (err) { q("diaryStatus").textContent = err; return; }
  if (s.rows.some(r => r._rawUid)) {
    for (const r of s.rows) {
      if (r._rawUid && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(r._rawUid));
        r.account_id_hash = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
        delete r._rawUid; delete r.uid;
      }
    }
  }
  if (s.step < ids.length - 1) s.step += 1;
  s.points = (s.consent && ADDR.test(s.wallet) && s.e5 && s.rows.length) ? 10 : 0;
  put(s); draw(); renderLab();
  q("diaryStatus").textContent = s.points === 10 ? "Diary complete. 10 Lab points on this device." : "Saved this chapter.";
}
function back() { const s = store(); if (s.step) s.step -= 1; put(s); draw(); }
function paintStory() {
  const host = q("story"); if (!host) return;
  const rows = store().rows.slice().sort((a,b) => String(a.date).localeCompare(String(b.date)));
  host.innerHTML = rows.map(r => `<div class="ev"><strong>${r.date}</strong> · module ${r.module}<br><span class="hint">${r.amount || r.sku || r.surface || r.venue || ""} ${r.hash ? r.hash.slice(0,10)+"…" : ""}</span></div>`).join("") || "<p class='hint'>No chapters saved yet.</p>";
}
function paintEdit() {
  const host = q("editList"); if (!host) return;
  const s = store();
  host.innerHTML = s.rows.map((r,i) => `<div class="tile">${r.module} · ${r.date} <button type="button" class="btn-ghost" onclick="editRow(${i})">Edit</button> <button type="button" class="btn-ghost" onclick="delRow(${i})">Remove</button></div>`).join("");
}
function editRow(i) {
  const s = store(); const r = s.rows[i]; if (!r) return;
  const ids = activeChapters(s); const idx = ids.indexOf(r.module);
  s.step = idx >= 0 ? idx : s.step; put(s); draw();
  setTimeout(() => { Object.keys(r).forEach(k => { const el = q("f_" + k); if (el) el.value = r[k]; }); }, 0);
}
function delRow(i) { const s = store(); s.rows.splice(i,1); s.points = 0; put(s); draw(); renderLab(); }
function exportStory() {
  const blob = new Blob([JSON.stringify(store(), null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mbasestack-diary.json"; a.click();
}
function num(x) { return parseFloat(String(x || "").replace(/[^0-9.]/g, "")) || 0; }
function that(Tobs, n, N, c, xbar) { return Tobs + Math.max(0, N - n) * c * xbar; }
function betaMean(a, b) { return a / (a + b); }
let charts = {};
function chart(id, labels, data, label) {
  const el = q(id); if (!el || typeof Chart === "undefined") return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(el, { type: "bar", data: { labels, datasets: [{ label, data, backgroundColor: "#7ee7ff" }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
}
function renderLab() {
  const s = store();
  const cashRows = s.rows.filter(r => r.module === "A");
  const Tobs = cashRows.reduce((x, r) => x + num(r.amount), 0);
  const n = s.wallet ? 1 : 0;
  const xbar = cashRows.length ? Tobs / cashRows.length : 0;
  const hw = s.rows.filter(r => r.module === "D" && /X10|X30|X100/.test(r.sku || ""));
  const pNeutral = betaMean(1 + hw.length, 1 + Math.max(0, n - hw.length));
  const pSkep = betaMean(2 + hw.length, 8 + Math.max(0, n - hw.length));
  if (q("indivReport")) {
    q("indivReport").innerHTML = `<div class="tile">Wallet ${s.wallet || "—"}</div>
      <div class="tile">E5 ${s.e5 || "—"}</div>
      <div class="tile">Paid-in rows (cash only) ${Tobs}</div>
      <div class="tile">Hardware rows ${hw.length} · p_k Beta(1,1) mean ${pNeutral.toFixed(2)} · skeptical Beta(2,8) ${pSkep.toFixed(2)}</div>`;
  }
  chart("meChart", s.rows.map(r => r.module), s.rows.map(r => num(r.amount) || num(r.units) || 1), "Your chapters");
  const counts = { A:0,B:0,C:0,D:0,E:0,E1:0,E2:0,E3:0,E4:0 };
  s.rows.forEach(r => { if (counts[r.module] != null) counts[r.module]++; });
  if (q("publicA")) q("publicA").innerHTML = `<div class="tile">n = ${n} (this preview file)</div>
    <div class="tile">T_obs cash among purchase rows = ${Tobs}</div>
    <div class="tile">E1 ${counts.E1} · E2 ${counts.E2} · E3 ${counts.E3} · E4 ${counts.E4}</div>
    <p class="hint">Caption: among wallets that reported to this application. Rights are not added to cash.</p>`;
  chart("aChart", Object.keys(counts), Object.values(counts), "Module counts");
  const grid = [0.3,0.5,0.8,1].map(c => ({ c, t40: that(Tobs, n, 40000, c, xbar), t320: that(Tobs, n, 320000, c, xbar) }));
  if (q("publicC")) q("publicC").innerHTML = grid.map(g => `<div class="tile">c=${g.c} · N=40k T-hat ${g.t40.toFixed(0)} · N=320k T-hat ${g.t320.toFixed(0)}</div>`).join("") +
    `<p class="hint">With n=${n} the fan is not identified. Illustration of the paper identity only.</p>`;
  chart("cChart", grid.map(g => "c=" + g.c), grid.map(g => g.t40), "T-hat N=40k illustration");
  if (q("labPoints")) q("labPoints").textContent = s.points;
}
document.addEventListener("DOMContentLoaded", () => {
  if (q("nextBtn")) q("nextBtn").onclick = () => next().catch(e => q("diaryStatus").textContent = e.message);
  if (q("backBtn")) q("backBtn").onclick = back;
  document.querySelectorAll(".tab[data-go]").forEach(t => t.addEventListener("click", () => {
    document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.dataset.pane === t.dataset.go));
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("on", x === t));
    if (t.dataset.go === "lab") renderLab();
  }));
  draw(); paintStory(); paintEdit(); renderLab();
});

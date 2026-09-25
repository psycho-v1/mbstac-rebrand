const CONTRACT = "0x89c7B13Dea0Ca0003342F6b3cf8F9ec116EBcd19";
const CHAIN_ID = 1404, CHAIN_HEX = "0x57c", FORK = 316002;
const ALPHA_HASH = "0xe2c7a9b0ff6206e6ac93f2cceead3992e081a4be64f5a5975d6e2158cc02a824";
const BETA_HASH = "0xcd4d2568e9cba6725329e8cf6d96217ace7acb03d71d9b519c8b2560bb6bb781";
const KEY = "mbase_file_v2";
const RPX = [
  ["CapeDAG","https://rpc.capedag.com","beta"],["Engineering","https://rpc.blockdag.engineering","beta"],
  ["DVD Mining","https://rpc.dvdmining.com","beta"],["BDAG-US East","https://rpc.east.bdag-us.org","beta"],
  ["BDAG-US West","https://rpc.west.bdag-us.org","beta"],["ENGLAND","https://rpc.england.bdag.us.org","beta"],
  ["BRAZIL","https://rpc.brazil.bdag.us.org","beta"],["DAGCORE","https://rpc.dagcore.net","beta"],
  ["BlockDAG Works","https://rpc.blockdag.works","alpha"],["BDAGScan","https://rpc.bdagscan.com","alpha"]
];
let sourceWallet = null;
function file() {
  return JSON.parse(localStorage.getItem(KEY) || "null") || {
    consent: false, wallet: "", families: {}, mods: {}, rows: [], e5: "", points: 0, events: []
  };
}
function saveFile(f) { localStorage.setItem(KEY, JSON.stringify(f)); }
function showPane(id) {
  document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.dataset.pane === id));
  document.querySelectorAll(".tab[data-go]").forEach(t => t.classList.toggle("on", t.dataset.go === id));
}
function wei(v) { try { const n = BigInt(v || 0), b = 10n ** 18n; return (n / b).toLocaleString() + "." + ((n % b) * 1000n / b).toString().padStart(3, "0"); } catch { return String(v); } }
async function rpc(url, method, params) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) });
  const data = await res.json(); if (data.error) throw new Error(data.error.message); return data.result;
}
function betaUrl() { return document.getElementById("rpcSelect")?.value; }
function alphaUrl() { return document.getElementById("alphaRpcSelect")?.value; }
async function ensureChain() {
  if (!window.ethereum?.request) throw new Error("Open inside a wallet browser.");
  try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] }); }
  catch (e) {
    if (e.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN_HEX, chainName: "BlockDAG 1404", nativeCurrency: { name: "BDAG", symbol: "BDAG", decimals: 18 }, rpcUrls: [betaUrl() || "https://rpc.east.bdag-us.org"] }] });
    else if (e.code !== 4001) throw e;
  }
}
async function connectWallet() {
  try {
    await ensureChain();
    const acc = await window.ethereum.request({ method: "eth_requestAccounts" });
    sourceWallet = acc[0];
    document.getElementById("sourceWalletDisplay").textContent = sourceWallet.slice(0, 6) + "…" + sourceWallet.slice(-4);
    const inp = document.getElementById("compare-wallet-address"); if (inp) inp.value = sourceWallet;
    const t = new ethers.Contract(CONTRACT, ["function balanceOf(address) view returns (uint256)"], new ethers.JsonRpcProvider(betaUrl(), CHAIN_ID));
    document.getElementById("tokenBalance").textContent = wei(await t.balanceOf(sourceWallet)) + " MBSTAC";
  } catch (e) { document.getElementById("status").textContent = e.message || String(e); }
}
function claimToken() {
  const el = document.getElementById("mintStatus"); el.hidden = false;
  el.textContent = "Mint is on mbasestack.com. This preview does not send a claim.";
  window.open("https://mbasestack.com/#mbasestack-utility-token", "_blank", "noopener");
}
function fillRpc() {
  const b = document.getElementById("rpcSelect"), a = document.getElementById("alphaRpcSelect");
  if (!b || !a) return;
  b.innerHTML = RPX.filter(r => r[2] === "beta").map(r => `<option value="${r[1]}">${r[0]}</option>`).join("");
  a.innerHTML = RPX.filter(r => r[2] === "alpha").map(r => `<option value="${r[1]}">${r[0]}</option>`).join("");
}
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s || ""));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function moduleForms() {
  const host = document.getElementById("modules"); if (!host) return;
  const on = id => document.getElementById(id)?.checked;
  let h = "";
  if (on("famA")) h += fieldset("Paid purchase", [["dateA","date"],["vintageA","text","Legacy or New"],["cohortA","text","presale / aftersale / 2026"],["paidA","text","cash paid"],["curA","text","USDT"],["coinsA","text","coins paid"],["hashA","text","0x hash optional"]]);
  if (on("famB")) h += fieldset("Grant / bonus", [["dateB","date"],["bonusB","text","grant coins"]]);
  if (on("famC")) h += fieldset("Buyback / swap / claim", [["dateC","date"],["progC","text","buyback / swap / claim"],["usdtC","text","USDT shown"],["hashC","text","hash optional"]]);
  if (on("famD")) h += fieldset("Mining", [["dateD","date"],["skuD","text","X1 / TG / X10 / X30 / X100"],["unitsD","text","units"],["eventD","text","used / paid / delivered"],["hashD","text","hash optional"]]);
  if (on("famE")) h += fieldset("App surface", [["surfE","text","which app"],["usedE","text","used / account"]]);
  if (on("modE1")) h += fieldset("E1 exchange stuck", [["venue1","text","venue"],["amt1","text","amount as shown"],["asset1","text","BDAG / USDT"],["fail1","text","wrong-network / frozen / …"],["uid1","text","email or UID (hashed)"]]);
  if (on("modE2")) h += fieldset("E2 wallet not accepted", [["addr2","text","0x wallet"],["amt2","text","self-reported balance"],["dest2","text","destination venue"],["word2","text","stuck / frozen / …"]]);
  if (on("modE3")) h += fieldset("E3 vesting remainder", [["ctr3","text","contract 0x or unknown"],["ui3","text","UI amount"],["st3","text","unclaimed / claimed"]]);
  if (on("modE4")) h += fieldset("E4 dashboard view", [["dash4","text","which screen"],["amt4","text","amount shown"],["asset4","text","BDAG / USDT / points"],["move4","text","could withdraw? yes/no"]]);
  host.innerHTML = h;
}
function fieldset(title, fields) {
  return `<fieldset class="tile"><legend>${title}</legend>` + fields.map(([id, t, ph]) => `<label>${ph || id}</label><input id="${id}" class="form-control" type="${t}" placeholder="${ph || ""}">`).join("") + `</fieldset>`;
}
function v(id) { return (document.getElementById(id)?.value || "").trim(); }
function complete(f) {
  const fam = Object.values(f.families || {}).some(Boolean);
  const stuck = Object.values(f.mods || {}).some(Boolean);
  return !!(f.consent && f.wallet && (fam || stuck) && f.e5 && f.rows.length);
}
async function saveDiarySurvey() {
  const f = file();
  f.consent = !!document.getElementById("consent")?.checked;
  f.wallet = v("compare-wallet-address") || sourceWallet || f.wallet;
  f.families = { A: !!fam("famA"), B: !!fam("famB"), C: !!fam("famC"), D: !!fam("famD"), E: !!fam("famE") };
  f.mods = { E1: !!fam("modE1"), E2: !!fam("modE2"), E3: !!fam("modE3"), E4: !!fam("modE4") };
  f.e5 = v("e5");
  function fam(id) { return document.getElementById(id)?.checked; }
  const add = (date, title, obj, history) => { if (!date && !obj.amount && !title) return; f.rows.push({ date: date || "unknown", title, history: history || "unknown", ...obj }); };
  if (f.families.A) add(v("dateA"), "Paid purchase", { vintage: v("vintageA"), cohort: v("cohortA"), amount: v("paidA"), currency: v("curA"), coins: v("coinsA"), hash: v("hashA"), class: "stock" }, "unknown");
  if (f.families.B) add(v("dateB"), "Grant coins", { amount: v("bonusB"), class: "grant" }, "dashboard_ui");
  if (f.families.C) add(v("dateC"), v("progC") || "Program flow", { amount: v("usdtC"), hash: v("hashC"), class: "right" }, "dashboard_ui");
  if (f.families.D) add(v("dateD"), "Miner " + v("skuD"), { sku: v("skuD"), units: v("unitsD"), event: v("eventD"), hash: v("hashD"), class: "miner" }, "unknown");
  if (f.families.E) add("", "App " + v("surfE"), { surface: v("surfE"), used: v("usedE"), class: "surface" }, "unknown");
  if (f.mods.E1) {
    const raw = v("uid1");
    add("", "E1 exchange stuck", { venue: v("venue1"), amount: v("amt1"), asset: v("asset1"), fail: v("fail1"), account_id_hash: raw ? await sha256(raw) : "", class: "exchange" }, "exchange_custodial");
  }
  if (f.mods.E2) add("", "E2 wallet stock", { address: v("addr2"), amount: v("amt2"), dest: v("dest2"), user_word: v("word2"), technical_word: "unknown", class: "wallet_stock" }, "community_corroborated");
  if (f.mods.E3) add("", "E3 vesting", { contract: v("ctr3"), amount: v("ui3"), status: v("st3"), class: "vesting" }, "vesting_contract");
  if (f.mods.E4) add("", "E4 dashboard", { dash: v("dash4"), amount: v("amt4"), asset: v("asset4"), movable: v("move4"), class: "dashboard" }, "dashboard_ui");
  const payload = { schema: "mbase.split.v1", wallet: f.wallet, at: new Date().toISOString(), e5: f.e5, n_rows: f.rows.length };
  f.events.push(payload);
  if (window.ethereum && f.wallet) {
    try {
      await window.ethereum.request({ method: "personal_sign", params: [JSON.stringify(payload), f.wallet] });
      payload.signed = true;
    } catch { payload.signed = false; }
  }
  const was = complete(f);
  f.points = was ? 10 : 0;
  saveFile(f);
  document.getElementById("diaryStatus").textContent = was ? "Diary complete. 10 Lab points recorded on this device. On-chain credit waits for the operator Lab Points contract (no gas from you)." : "Saved. Answer E5 and at least one module with a date or amount to complete.";
  document.getElementById("labPoints").textContent = f.points;
  paintStory(); buildIndividual(); buildPublic();
}
function paintStory() {
  const host = document.getElementById("story"); if (!host) return;
  const rows = (file().rows || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  host.innerHTML = rows.length ? rows.map(r => `<div class="ev"><strong>${r.date}</strong> · ${r.title}<br><span class="hint">${r.history} · ${r.class || ""} · ${r.amount || ""} ${r.currency || r.asset || ""}</span></div>`).join("") : "<p class='hint'>No dated events yet.</p>";
}
async function dual(addr) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr || "")) return null;
  const out = { address: addr };
  try { out.dash = wei(await rpc(alphaUrl(), "eth_getBalance", [addr, "latest"])); } catch (e) { out.dash = e.message; }
  try { out.main = wei(await rpc(betaUrl(), "eth_getBalance", [addr, "latest"])); } catch (e) { out.main = e.message; }
  return out;
}
async function buildIndividual() {
  const host = document.getElementById("indivReport"); if (!host) return;
  const f = file();
  const duals = [];
  if (f.wallet) duals.push(await dual(f.wallet));
  host.innerHTML = `<div class="tile">Wallet ${f.wallet || "—"}<br>E5: ${f.e5 || "not answered"}<br>Rows ${f.rows.length}<br>Points ${f.points}</div>` +
    (duals[0] ? `<div class="tile">Dual-RPC pair<br>Dashboard Side ${duals[0].dash}<br>Mainnet Side ${duals[0].main}<br><span class="hint">Both numbers are kept. The larger one is not the report.</span></div>` : "") +
    f.rows.map(r => `<div class="tile">${r.title} · ${r.history}<br>${r.amount || ""} ${r.asset || r.currency || ""}</div>`).join("");
}
function buildPublic() {
  const f = file();
  const a = document.getElementById("publicA"), c = document.getElementById("publicC");
  const n = f.wallet ? 1 : 0;
  const cash = f.rows.filter(r => r.class === "stock" && r.amount).reduce((s, r) => s + (parseFloat(String(r.amount).replace(/[^0-9.]/g, "")) || 0), 0);
  const e1 = f.rows.filter(r => r.class === "exchange").length;
  const e4 = f.rows.filter(r => r.class === "dashboard").length;
  if (a) a.innerHTML = `<div class="tile">n reporters (this preview file): ${n}</div>
    <div class="tile">Observed paid-in among completed purchase rows: ${cash} (currency as typed)</div>
    <div class="tile">E1 rows: ${e1}</div><div class="tile">E4 dashboard rows: ${e4}</div>
    <div class="tile">E5: ${f.e5 || "—"} (attitude, unweighted)</div>
    <p class="hint">Caption: among wallets that reported to this application. Five objects stay five tiles.</p>`;
  const xbar = n ? cash : 0;
  if (c) c.innerHTML = `<div class="tile">Observed only: ${cash}</div>
    <div class="tile">T-hat(N=40k, c=0.5) illustration only if this were a multi-reporter file. With n=${n} the fan is not identified.</div>
    <p class="hint">Community scenario range. Not an official BlockDAG total.</p>`;
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab[data-go]").forEach(t => t.addEventListener("click", () => showPane(t.dataset.go)));
  ["famA","famB","famC","famD","famE","modE1","modE2","modE3","modE4"].forEach(id => document.getElementById(id)?.addEventListener("change", moduleForms));
  fillRpc(); paintStory(); buildPublic();
  const f = file(); document.getElementById("labPoints").textContent = f.points || 0;
  if (f.wallet) document.getElementById("compare-wallet-address").value = f.wallet;
});

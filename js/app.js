const SIGNING_BASE = "https://api.mbasestack.com";
const FORK = 316002;
const ALPHA_HASH = "0xe2c7a9b0ff6206e6ac93f2cceead3992e081a4be64f5a5975d6e2158cc02a824";
const BETA_HASH = "0xcd4d2568e9cba6725329e8cf6d96217ace7acb03d71d9b519c8b2560bb6bb781";
const VESTING = ["0xc99D6778be60F095F2f24283771fFeAd94ebD53d","0xc413AF6162635D2bA9175D236Fc3c2D0DE8787Fe","0x04dcf6a45e169020ed4ae78a3b627c5aada35355"];
const CLAIM_TOPIC = "0x987d620f307ff6b94d58743cb7a7509f24071586a77759b77c2d4e29f75a2f9a";
let sourceWallet = null, purchase = 0n, bonus = 0n, total = 0n, claimed = 0n, available = 0n, contractAddr = "";

function showPane(id) {
  document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.dataset.pane === id));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.go === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function setStatus(msg) { const el = document.getElementById("status"); if (el) el.textContent = msg || ""; }
function wei(v) {
  try {
    const n = BigInt(v || 0); const b = 10n ** 18n;
    return (n / b).toLocaleString("en-US") + "." + ((n % b) * 1000n / b).toString().padStart(3, "0");
  } catch { return String(v); }
}
async function rpc(url, method, params) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "RPC error");
  return data.result;
}
async function loadRpcs() {
  const text = await (await fetch("rpcs.csv", { cache: "no-store" })).text();
  const rows = text.trim().split(/\n/).slice(1).map(l => {
    const [name, url, explorer, branch] = l.split(",");
    return { name, url, explorer, branch };
  });
  fill("rpcSelect", rows.filter(r => r.branch === "beta"));
  fill("alphaRpcSelect", rows.filter(r => r.branch === "alpha"));
  ping("beta"); ping("alpha");
}
function fill(id, list) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = list.map((r, i) => `<option value="${r.url}" ${i ? "" : "selected"}>${r.name}</option>`).join("");
  sel.onchange = () => ping(id === "rpcSelect" ? "beta" : "alpha");
}
async function ping(side) {
  const sel = document.getElementById(side === "alpha" ? "alphaRpcSelect" : "rpcSelect");
  const health = document.getElementById(side === "alpha" ? "alphaRpcHealth" : "rpcHealth");
  if (!sel || !health) return;
  health.className = "rpc-health wait"; health.textContent = "Checking...";
  try {
    const url = sel.value;
    const [cid, block, fork] = await Promise.all([
      rpc(url, "eth_chainId"),
      rpc(url, "eth_blockNumber"),
      rpc(url, "eth_getBlockByNumber", ["0x" + FORK.toString(16), false])
    ]);
    const okHash = String(fork?.hash || "").toLowerCase() === (side === "alpha" ? ALPHA_HASH : BETA_HASH);
    if (parseInt(cid, 16) !== 1404 || !okHash) throw new Error("Unexpected chain or fork hash");
    health.className = "rpc-health ok";
    health.textContent = "Ready · block " + parseInt(block, 16).toLocaleString();
  } catch (e) {
    health.className = "rpc-health bad";
    health.textContent = e.message || "Failed";
  }
}
async function connectWallet() {
  try {
    if (!window.ethereum?.request) throw new Error("Open this page in a wallet browser, or install an injected wallet.");
    const acc = await window.ethereum.request({ method: "eth_requestAccounts" });
    sourceWallet = acc[0];
    document.getElementById("sourceWalletDisplay").textContent = sourceWallet.slice(0, 6) + "…" + sourceWallet.slice(-4);
    document.getElementById("sourceWalletDisplay").title = sourceWallet;
    const input = document.getElementById("compare-wallet-address");
    if (input && !input.value) input.value = sourceWallet;
    setStatus("Connected.");
    await loadSource();
  } catch (e) { setStatus(e.message || String(e)); }
}
function disconnectWallet() {
  sourceWallet = null;
  document.getElementById("sourceWalletDisplay").textContent = "Not connected";
  document.getElementById("sourceWalletDisplay").title = "";
  setStatus("Disconnected.");
}
async function compareBalances() {
  const a = (document.getElementById("compare-wallet-address").value || "").trim();
  const st = document.getElementById("balance-compare-status");
  const box = document.getElementById("balance-compare-results");
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { st.textContent = "Enter a 0x address."; return; }
  box.hidden = false; st.textContent = "Reading both RPCs...";
  try {
    const alpha = document.getElementById("alphaRpcSelect").value;
    const beta = document.getElementById("rpcSelect").value;
    const [ab, bb] = await Promise.all([rpc(alpha, "eth_getBalance", [a, "latest"]), rpc(beta, "eth_getBalance", [a, "latest"])]);
    document.getElementById("alpha-balance").textContent = wei(ab) + " BDAG";
    document.getElementById("beta-balance").textContent = wei(bb) + " BDAG";
    st.textContent = "Figures are this RPC, this moment.";
  } catch (e) { st.textContent = e.message || String(e); }
}
async function compareClaims() {
  const a = (document.getElementById("compare-wallet-address").value || "").trim();
  const st = document.getElementById("compare-claims-status");
  const host = document.getElementById("claim-comparison-tables");
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { st.textContent = "Enter a 0x address."; return; }
  const topic = "0x" + a.slice(2).toLowerCase().padStart(64, "0");
  const alpha = document.getElementById("alphaRpcSelect").value;
  const beta = document.getElementById("rpcSelect").value;
  host.innerHTML = "Reading vesting logs...";
  let html = "";
  for (const c of VESTING) {
    const q = { address: c, topics: [CLAIM_TOPIC, topic], fromBlock: "0x0", toBlock: "latest" };
    let al = "?"; let bl = "?";
    try { al = (await rpc(alpha, "eth_getLogs", [q])).length; } catch (e) { al = e.message; }
    try { bl = (await rpc(beta, "eth_getLogs", [q])).length; } catch (e) { bl = e.message; }
    html += `<p><strong>${c.slice(0, 10)}…</strong><br>Branch A events: ${al}<br>Community events: ${bl}</p>`;
  }
  host.innerHTML = html;
  st.textContent = "Claim logs are public events on each RPC.";
}
async function loadConfig() {
  try {
    const data = await (await fetch(SIGNING_BASE + "/config")).json();
    contractAddr = data.contractAddress || "";
    document.getElementById("tokenContractAddress").textContent = contractAddr || "Unavailable";
    document.getElementById("topContractAddress").textContent = contractAddr || "";
    document.getElementById("contactSupportEmail").textContent = data.contactEmail || "See official site";
  } catch {
    document.getElementById("tokenContractAddress").textContent = "Could not reach signing server from this preview.";
  }
}
async function loadSource() {
  if (!sourceWallet) return;
  try {
    const res = await fetch(SIGNING_BASE + "/source-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceWallet }) });
    if (!res.ok) throw new Error("Source lookup failed");
    const data = await res.json();
    purchase = BigInt(data.purchase); bonus = BigInt(data.bonus); total = BigInt(data.total);
    document.getElementById("purchaseAmount").textContent = wei(purchase);
    document.getElementById("bonusAmount").textContent = wei(bonus);
    document.getElementById("totalAmount").textContent = wei(total);
    document.getElementById("reportedAmount").textContent = wei(total);
    const st = await fetch(SIGNING_BASE + "/claim-state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceWallet, recipient: sourceWallet }) });
    if (st.ok) {
      const cs = await st.json();
      claimed = BigInt(cs.currentClaimed || 0);
      document.getElementById("claimedAmount").textContent = wei(claimed);
      document.getElementById("tokenBalance").textContent = wei(cs.recipientBalance || 0);
    }
    available = total > claimed ? total - claimed : 0n;
    document.getElementById("availableAmount").textContent = wei(available);
  } catch (e) { setStatus(e.message || String(e)); }
}
async function saveContact() {
  const email = document.getElementById("contactEmail").value.trim();
  const name = document.getElementById("contactNameHandle").value.trim();
  const st = document.getElementById("contactInfoStatus");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { st.textContent = "Enter a valid email."; return; }
  if (!sourceWallet) { st.textContent = "Connect a wallet first."; return; }
  try {
    const res = await fetch(SIGNING_BASE + "/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceWallet, email, name }) });
    if (!res.ok) throw new Error(await res.text());
    st.textContent = "Saved.";
    document.getElementById("claimButton").disabled = false;
  } catch (e) { st.textContent = e.message || String(e); }
}
async function claimToken() {
  const mint = document.getElementById("mintStatus");
  mint.hidden = false;
  try {
    if (!sourceWallet) throw new Error("Connect first.");
    const max = document.getElementById("mintMax").checked;
    let amount = available;
    if (!max) {
      const text = document.getElementById("customMintAmount").value.trim().replace(/,/g, "");
      if (!text) throw new Error("Enter a custom amount.");
      amount = ethers.parseUnits(text, 18);
    }
    if (amount <= 0n || amount > available) throw new Error("Amount is outside the available range.");
    mint.textContent = "This preview should not be used to mint. Use mbasestack.com.";
  } catch (e) { mint.textContent = e.message || String(e); }
}
async function copyText(id) {
  const t = document.getElementById(id)?.textContent?.trim();
  if (t) try { await navigator.clipboard.writeText(t); } catch {}
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showPane(t.dataset.go)));
  const menuBtn = document.getElementById("siteMenuBtn");
  const menu = document.getElementById("siteMenu");
  menuBtn?.addEventListener("click", e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener("click", () => { if (menu) menu.hidden = true; });
  menu?.addEventListener("click", e => e.stopPropagation());
  loadRpcs(); loadConfig();
});

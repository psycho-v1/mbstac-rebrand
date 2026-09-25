const CONTRACT = "0x89c7B13Dea0Ca0003342F6b3cf8F9ec116EBcd19";
const CHAIN_ID = 1404;
const FORK = 316002;
const ALPHA_HASH = "0xe2c7a9b0ff6206e6ac93f2cceead3992e081a4be64f5a5975d6e2158cc02a824";
const BETA_HASH = "0xcd4d2568e9cba6725329e8cf6d96217ace7acb03d71d9b519c8b2560bb6bb781";
const VESTING = ["0xc99D6778be60F095F2f24283771fFeAd94ebD53d","0xc413AF6162635D2bA9175D236Fc3c2D0DE8787Fe","0x04dcf6a45e169020ed4ae78a3b627c5aada35355"];
const CLAIM_TOPIC = "0x987d620f307ff6b94d58743cb7a7509f24071586a77759b77c2d4e29f75a2f9a";
const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];
let sourceWallet = null;

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
function betaUrl() { return document.getElementById("rpcSelect")?.value; }
function alphaUrl() { return document.getElementById("alphaRpcSelect")?.value; }
async function rpc(url, method, params) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "RPC error");
  return data.result;
}
function provider(url) { return new ethers.JsonRpcProvider(url, CHAIN_ID); }
function token(url) { return new ethers.Contract(CONTRACT, ABI, provider(url)); }

async function loadRpcs() {
  const text = await (await fetch("rpcs.csv", { cache: "no-store" })).text();
  const rows = text.trim().split(/\n/).slice(1).map(l => {
    const [name, url, explorer, branch] = l.split(",");
    return { name, url, explorer, branch };
  });
  fill("rpcSelect", rows.filter(r => r.branch === "beta"));
  fill("alphaRpcSelect", rows.filter(r => r.branch === "alpha"));
  ping("beta"); ping("alpha");
  readContract();
}
function fill(id, list) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = list.map((r, i) => `<option value="${r.url}" ${i ? "" : "selected"}>${r.name}</option>`).join("");
  sel.onchange = () => { ping(id === "rpcSelect" ? "beta" : "alpha"); if (id === "rpcSelect") readContract(); };
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
    if (parseInt(cid, 16) !== CHAIN_ID || !okHash) throw new Error("Unexpected chain or fork hash");
    health.className = "rpc-health ok";
    health.textContent = "Ready · block " + parseInt(block, 16).toLocaleString();
  } catch (e) {
    health.className = "rpc-health bad";
    health.textContent = e.message || "Failed";
  }
}

async function readContract() {
  const box = document.getElementById("onchainStatus");
  document.getElementById("topContractAddress").textContent = CONTRACT;
  document.getElementById("tokenContractAddress").textContent = CONTRACT;
  try {
    const codeBeta = await rpc(betaUrl(), "eth_getCode", [CONTRACT, "latest"]);
    const codeAlpha = await rpc(alphaUrl(), "eth_getCode", [CONTRACT, "latest"]);
    const liveBeta = codeBeta && codeBeta !== "0x";
    const liveAlpha = codeAlpha && codeAlpha !== "0x";
    let line = "Contract " + CONTRACT + ". Community bytecode: " + (liveBeta ? "present" : "absent") + ". Branch A bytecode: " + (liveAlpha ? "present" : "absent") + ".";
    if (liveBeta) {
      const t = token(betaUrl());
      const [name, symbol, supply] = await Promise.all([t.name(), t.symbol(), t.totalSupply()]);
      line += " On this Community RPC the token reports " + name + " / " + symbol + ", totalSupply " + wei(supply) + ".";
      document.getElementById("contractSymbol").textContent = symbol;
    }
    if (box) box.textContent = line;
    if (sourceWallet) await refreshTokenBalance();
  } catch (e) {
    if (box) box.textContent = "Contract read failed: " + (e.message || e);
  }
}

async function refreshTokenBalance() {
  if (!sourceWallet) return;
  try {
    const t = token(betaUrl());
    const bal = await t.balanceOf(sourceWallet);
    document.getElementById("tokenBalance").textContent = wei(bal) + " MBSTAC";
  } catch (e) {
    document.getElementById("tokenBalance").textContent = e.message || "---";
  }
}

async function connectWallet() {
  try {
    if (!window.ethereum?.request) throw new Error("Open this page in a wallet browser.");
    const acc = await window.ethereum.request({ method: "eth_requestAccounts" });
    sourceWallet = ethers.getAddress(acc[0]);
    document.getElementById("sourceWalletDisplay").textContent = sourceWallet.slice(0, 6) + "…" + sourceWallet.slice(-4);
    document.getElementById("sourceWalletDisplay").title = sourceWallet;
    const input = document.getElementById("compare-wallet-address");
    if (input && !input.value) input.value = sourceWallet;
    setStatus("Connected. Reading contract on the selected Community RPC.");
    await refreshTokenBalance();
  } catch (e) { setStatus(e.message || String(e)); }
}
function disconnectWallet() {
  sourceWallet = null;
  document.getElementById("sourceWalletDisplay").textContent = "Not connected";
  setStatus("Disconnected.");
}
async function compareBalances() {
  const a = (document.getElementById("compare-wallet-address").value || "").trim();
  const st = document.getElementById("balance-compare-status");
  const box = document.getElementById("balance-compare-results");
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { st.textContent = "Enter a 0x address."; return; }
  box.hidden = false; st.textContent = "Reading both RPCs...";
  try {
    const [ab, bb] = await Promise.all([
      rpc(alphaUrl(), "eth_getBalance", [a, "latest"]),
      rpc(betaUrl(), "eth_getBalance", [a, "latest"])
    ]);
    document.getElementById("alpha-balance").textContent = wei(ab) + " BDAG";
    document.getElementById("beta-balance").textContent = wei(bb) + " BDAG";
    st.textContent = "Native BDAG only. RPC + time stamped in your head: now, these two endpoints.";
  } catch (e) { st.textContent = e.message || String(e); }
}
async function compareClaims() {
  const a = (document.getElementById("compare-wallet-address").value || "").trim();
  const st = document.getElementById("compare-claims-status");
  const host = document.getElementById("claim-comparison-tables");
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { st.textContent = "Enter a 0x address."; return; }
  const topic = "0x" + a.slice(2).toLowerCase().padStart(64, "0");
  host.innerHTML = "Reading vesting logs...";
  let html = "";
  for (const c of VESTING) {
    const q = { address: c, topics: [CLAIM_TOPIC, topic], fromBlock: "0x0", toBlock: "latest" };
    let al = "?"; let bl = "?";
    try { al = (await rpc(alphaUrl(), "eth_getLogs", [q])).length; } catch (e) { al = e.message; }
    try { bl = (await rpc(betaUrl(), "eth_getLogs", [q])).length; } catch (e) { bl = e.message; }
    html += `<p><strong>${c}</strong><br>Branch A events: ${al}<br>Community events: ${bl}</p>`;
  }
  host.innerHTML = html;
  st.textContent = "Logs collected by this page from the two RPCs you selected.";
}
async function copyText(id) {
  const t = document.getElementById(id)?.textContent?.trim();
  if (t) try { await navigator.clipboard.writeText(t); } catch {}
}
function claimToken() {
  const mint = document.getElementById("mintStatus");
  mint.hidden = false;
  mint.textContent = "Mint is still owner-gated on the official signer. This preview only reads the token at " + CONTRACT + " and will not send a claim transaction. Use mbasestack.com for mint.";
}
function saveContact() {
  document.getElementById("contactInfoStatus").textContent = "Contact storage stays on the official service. This preview does not keep emails.";
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showPane(t.dataset.go)));
  const menuBtn = document.getElementById("siteMenuBtn");
  const menu = document.getElementById("siteMenu");
  menuBtn?.addEventListener("click", e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener("click", () => { if (menu) menu.hidden = true; });
  menu?.addEventListener("click", e => e.stopPropagation());
  loadRpcs();
});

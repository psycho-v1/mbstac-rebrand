const CONTRACT = "0x89c7B13Dea0Ca0003342F6b3cf8F9ec116EBcd19";
const CHAIN_ID = 1404;
const CHAIN_HEX = "0x57c";
const FORK = 316002;
const ALPHA_HASH = "0xe2c7a9b0ff6206e6ac93f2cceead3992e081a4be64f5a5975d6e2158cc02a824";
const BETA_HASH = "0xcd4d2568e9cba6725329e8cf6d96217ace7acb03d71d9b519c8b2560bb6bb781";
const VESTING = ["0xc99D6778be60F095F2f24283771fFeAd94ebD53d","0xc413AF6162635D2bA9175D236Fc3c2D0DE8787Fe","0x04dcf6a45e169020ed4ae78a3b627c5aada35355"];
const CLAIM_TOPIC = "0x987d620f307ff6b94d58743cb7a7509f24071586a77759b77c2d4e29f75a2f9a";
const ABI = ["function name() view returns (string)","function symbol() view returns (string)","function decimals() view returns (uint8)","function totalSupply() view returns (uint256)","function balanceOf(address) view returns (uint256)"];
let sourceWallet = null, rpcRows = [], chartRef = null;

function showPane(id) {
  document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.dataset.pane === id));
  document.querySelectorAll(".tab[data-go]").forEach(t => t.classList.toggle("on", t.dataset.go === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function setStatus(msg) { const el = document.getElementById("status"); if (el) el.textContent = msg || ""; }
function wei(v) { try { const n = BigInt(v || 0), b = 10n ** 18n; return (n / b).toLocaleString("en-US") + "." + ((n % b) * 1000n / b).toString().padStart(3,"0"); } catch { return String(v); } }
function num(v) { try { return Number(ethers.formatUnits(BigInt(v || 0), 18)); } catch { return 0; } }
function betaUrl() { return document.getElementById("rpcSelect")?.value; }
function alphaUrl() { return document.getElementById("alphaRpcSelect")?.value; }
async function rpc(url, method, params) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "RPC error");
  return data.result;
}
function token(url) { return new ethers.Contract(CONTRACT, ABI, new ethers.JsonRpcProvider(url, CHAIN_ID)); }

async function ensureChain() {
  if (!window.ethereum?.request) throw new Error("No injected wallet.");
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch (e) {
    if (e.code === 4902 || /unrecognized|unknown chain/i.test(e.message || "")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_HEX,
          chainName: "BlockDAG 1404",
          nativeCurrency: { name: "BDAG", symbol: "BDAG", decimals: 18 },
          rpcUrls: [betaUrl() || "https://rpc.east.bdag-us.org"],
          blockExplorerUrls: ["https://explorer.east.bdag-us.org"]
        }]
      });
    } else if (e.code !== 4001) throw e;
    else throw new Error("Network switch was rejected.");
  }
}
async function connectWallet() {
  try {
    if (!window.ethereum?.request) throw new Error("Open this page inside MetaMask or another wallet browser. Desktop: install an injected wallet.");
    setStatus("Requesting wallet...");
    await ensureChain();
    const acc = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!acc?.[0]) throw new Error("No account returned.");
    sourceWallet = ethers.getAddress(acc[0]);
    paintWallet();
    setStatus("Connected on chain 1404.");
    await refreshTokenBalance();
    await witnessChart(sourceWallet);
  } catch (e) { setStatus(e.message || String(e)); }
}
function paintWallet() {
  const el = document.getElementById("sourceWalletDisplay");
  if (!el) return;
  if (!sourceWallet) { el.textContent = "Not connected"; el.title = ""; return; }
  el.textContent = sourceWallet.slice(0, 6) + "…" + sourceWallet.slice(-4);
  el.title = sourceWallet;
  const input = document.getElementById("compare-wallet-address");
  if (input && !input.value) input.value = sourceWallet;
}
function disconnectWallet() {
  sourceWallet = null; paintWallet(); setStatus("Disconnected.");
}
function watchWallet() {
  if (!window.ethereum?.on) return;
  window.ethereum.on("accountsChanged", (acc) => {
    sourceWallet = acc?.[0] ? ethers.getAddress(acc[0]) : null;
    paintWallet();
    if (sourceWallet) refreshTokenBalance();
  });
  window.ethereum.on("chainChanged", () => location.reload());
}

async function loadRpcs() {
  const text = await (await fetch("rpcs.csv", { cache: "no-store" })).text();
  rpcRows = text.trim().split(/\n/).slice(1).map(l => { const [name,url,explorer,branch] = l.split(","); return { name, url, explorer, branch }; });
  fill("rpcSelect", rpcRows.filter(r => r.branch === "beta"));
  fill("alphaRpcSelect", rpcRows.filter(r => r.branch === "alpha"));
  ping("beta"); ping("alpha"); readContract();
}
function fill(id, list) {
  const sel = document.getElementById(id); if (!sel) return;
  sel.innerHTML = list.map((r,i) => `<option value="${r.url}" ${i?"":"selected"}>${r.name}</option>`).join("");
  sel.onchange = () => { ping(id === "rpcSelect" ? "beta" : "alpha"); if (id === "rpcSelect") readContract(); };
}
async function ping(side) {
  const sel = document.getElementById(side === "alpha" ? "alphaRpcSelect" : "rpcSelect");
  const health = document.getElementById(side === "alpha" ? "alphaRpcHealth" : "rpcHealth");
  if (!sel || !health) return;
  health.className = "rpc-health wait"; health.textContent = "Checking...";
  try {
    const [cid, block, fork] = await Promise.all([
      rpc(sel.value, "eth_chainId"), rpc(sel.value, "eth_blockNumber"),
      rpc(sel.value, "eth_getBlockByNumber", ["0x" + FORK.toString(16), false])
    ]);
    const ok = String(fork?.hash || "").toLowerCase() === (side === "alpha" ? ALPHA_HASH : BETA_HASH);
    if (parseInt(cid, 16) !== CHAIN_ID || !ok) throw new Error("Unexpected chain or fork hash");
    health.className = "rpc-health ok";
    health.textContent = "Ready · block " + parseInt(block, 16).toLocaleString();
  } catch (e) { health.className = "rpc-health bad"; health.textContent = e.message || "Failed"; }
}
async function readContract() {
  const box = document.getElementById("onchainStatus");
  ["topContractAddress","tokenContractAddress"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = CONTRACT; });
  try {
    const [codeB, codeA] = await Promise.all([
      rpc(betaUrl(), "eth_getCode", [CONTRACT, "latest"]),
      rpc(alphaUrl(), "eth_getCode", [CONTRACT, "latest"])
    ]);
    let line = "MBSTAC " + CONTRACT + ". Community code: " + ((codeB && codeB !== "0x") ? "yes" : "no") + ". Branch A code: " + ((codeA && codeA !== "0x") ? "yes" : "no") + ".";
    if (codeB && codeB !== "0x") {
      const t = token(betaUrl());
      const [name, symbol, supply] = await Promise.all([t.name(), t.symbol(), t.totalSupply()]);
      line += " Token " + name + " / " + symbol + ", totalSupply " + wei(supply) + ".";
      const sym = document.getElementById("contractSymbol"); if (sym) sym.textContent = symbol;
    }
    if (box) box.textContent = line;
    if (sourceWallet) await refreshTokenBalance();
  } catch (e) { if (box) box.textContent = e.message || String(e); }
}
async function refreshTokenBalance() {
  if (!sourceWallet) return;
  try { document.getElementById("tokenBalance").textContent = wei(await token(betaUrl()).balanceOf(sourceWallet)) + " MBSTAC"; }
  catch (e) { document.getElementById("tokenBalance").textContent = e.message || "---"; }
}
async function compareBalances() {
  const a = (document.getElementById("compare-wallet-address").value || "").trim();
  const st = document.getElementById("balance-compare-status");
  const box = document.getElementById("balance-compare-results");
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { st.textContent = "Enter a 0x address."; return; }
  box.hidden = false; st.textContent = "Reading...";
  try {
    const [ab, bb] = await Promise.all([rpc(alphaUrl(), "eth_getBalance", [a,"latest"]), rpc(betaUrl(), "eth_getBalance", [a,"latest"])]);
    document.getElementById("alpha-balance").textContent = wei(ab) + " BDAG";
    document.getElementById("beta-balance").textContent = wei(bb) + " BDAG";
    st.textContent = "Native BDAG on the two selected RPCs.";
    await witnessChart(a);
  } catch (e) { st.textContent = e.message || String(e); }
}
async function compareClaims() {
  const a = (document.getElementById("compare-wallet-address").value || "").trim();
  const st = document.getElementById("compare-claims-status");
  const host = document.getElementById("claim-comparison-tables");
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { st.textContent = "Enter a 0x address."; return; }
  const topic = "0x" + a.slice(2).toLowerCase().padStart(64, "0");
  host.innerHTML = "Reading logs...";
  const labels = [], alphaN = [], betaN = [];
  let html = "";
  for (const c of VESTING) {
    const q = { address: c, topics: [CLAIM_TOPIC, topic], fromBlock: "0x0", toBlock: "latest" };
    let al = 0, bl = 0, ae = "", be = "";
    try { al = (await rpc(alphaUrl(), "eth_getLogs", [q])).length; } catch (e) { ae = e.message; }
    try { bl = (await rpc(betaUrl(), "eth_getLogs", [q])).length; } catch (e) { be = e.message; }
    labels.push(c.slice(0, 8)); alphaN.push(al); betaN.push(bl);
    html += `<p><strong>${c}</strong><br>Branch A: ${ae || al}<br>Community: ${be || bl}</p>`;
  }
  host.innerHTML = html;
  st.textContent = "Claim logs from the two selected RPCs.";
  drawGroup(labels, alphaN, betaN);
}
async function witnessChart(address) {
  const hint = document.getElementById("chartHint");
  if (hint) hint.textContent = "Reading every listed RPC for " + address.slice(0, 8) + "…";
  const labels = [], values = [];
  for (const row of rpcRows) {
    try {
      const bal = await rpc(row.url, "eth_getBalance", [address, "latest"]);
      labels.push(row.name);
      values.push(num(bal));
    } catch {
      labels.push(row.name + " (fail)");
      values.push(0);
    }
  }
  drawBars(labels, values);
  if (values.filter(v => v > 0).length >= 2) {
    const xs = values.filter((_, i) => rpcRows[i] && rpcRows[i].branch === "alpha");
    const ys = values.filter((_, i) => rpcRows[i] && rpcRows[i].branch === "beta");
    const mean = arr => arr.reduce((s, n) => s + n, 0) / (arr.length || 1);
    const mx = mean(values), vr = mean(values.map(v => (v - mx) ** 2));
    if (hint) hint.textContent = "Bars are native BDAG returned by each RPC. Spread (variance of this sample): " + vr.toFixed(2) + ". This is agreement among endpoints, not a forecast.";
  } else if (hint) hint.textContent = "Not enough live RPC replies to compare.";
  showPane("lab");
}
function drawBars(labels, values) {
  const canvas = document.getElementById("rpcChart"); if (!canvas || !window.Chart) return;
  if (chartRef) chartRef.destroy();
  chartRef = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ label: "Native BDAG", data: values, backgroundColor: "#b56bff88", borderColor: "#c084fc", borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: "#f4eefe" } } }, scales: { x: { ticks: { color: "#b7a6cc", maxRotation: 60 } }, y: { ticks: { color: "#b7a6cc" } } } }
  });
}
function drawGroup(labels, a, b) {
  const canvas = document.getElementById("claimChart"); if (!canvas || !window.Chart) return;
  if (canvas._ch) canvas._ch.destroy();
  canvas._ch = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [
      { label: "Branch A events", data: a, backgroundColor: "#4aa3d888" },
      { label: "Community events", data: b, backgroundColor: "#7dffa688" }
    ] },
    options: { responsive: true, plugins: { legend: { labels: { color: "#f4eefe" } } }, scales: { x: { ticks: { color: "#b7a6cc" } }, y: { ticks: { color: "#b7a6cc" } } } }
  });
}
function copyText(id) { const t = document.getElementById(id)?.textContent?.trim(); if (t) navigator.clipboard.writeText(t).catch(() => {}); }
function claimToken() {
  const mint = document.getElementById("mintStatus"); mint.hidden = false;
  mint.textContent = "Mint stays on the official signer. This page reads " + CONTRACT + " only. Use mbasestack.com to mint.";
}
function saveContact() { document.getElementById("contactInfoStatus").textContent = "This preview does not store email."; }

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab[data-go]").forEach(t => t.addEventListener("click", () => showPane(t.dataset.go)));
  const menuBtn = document.getElementById("siteMenuBtn"), menu = document.getElementById("siteMenu");
  menuBtn?.addEventListener("click", e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  document.addEventListener("click", () => { if (menu) menu.hidden = true; });
  menu?.addEventListener("click", e => e.stopPropagation());
  watchWallet(); loadRpcs();
});

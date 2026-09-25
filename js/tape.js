const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
function padAddr(a) { return "0x" + a.slice(2).toLowerCase().padStart(64, "0"); }
function short(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }
function explorerFor(url) {
  const row = (rpcRows || []).find(r => r.url === url);
  return (row && row.explorer) || "https://explorer.east.bdag-us.org";
}
async function stamp(side) {
  const url = side === "alpha" ? alphaUrl() : betaUrl();
  const [cid, block, fork] = await Promise.all([
    rpc(url, "eth_chainId"), rpc(url, "eth_blockNumber"),
    rpc(url, "eth_getBlockByNumber", ["0x" + FORK.toString(16), false])
  ]);
  return { side, url, chainId: parseInt(cid, 16), block: parseInt(block, 16), forkHash: fork && fork.hash, utc: new Date().toISOString() };
}
async function logsFor(url, filter) {
  try { return await rpc(url, "eth_getLogs", [filter]); }
  catch (e) { return { error: e.message || String(e) }; }
}
async function collectTape(address) {
  const topic = padAddr(address);
  const alpha = alphaUrl(), beta = betaUrl();
  const [sa, sb] = await Promise.all([stamp("alpha"), stamp("beta")]);
  const vest = [];
  for (const c of VESTING) {
    const q = { address: c, topics: [CLAIM_TOPIC, topic], fromBlock: "0x0", toBlock: "latest" };
    const [al, bl] = await Promise.all([logsFor(alpha, q), logsFor(beta, q)]);
    vest.push({ contract: c, alpha: al, beta: bl });
  }
  const inQ = { address: CONTRACT, topics: [TRANSFER_TOPIC, null, topic], fromBlock: "0x0", toBlock: "latest" };
  const outQ = { address: CONTRACT, topics: [TRANSFER_TOPIC, topic], fromBlock: "0x0", toBlock: "latest" };
  const [tin, tout] = await Promise.all([logsFor(beta, inQ), logsFor(beta, outQ)]);
  let nativeA = null, nativeB = null, tokenBal = null, codeA = "0x", codeB = "0x";
  try { nativeA = await rpc(alpha, "eth_getBalance", [address, "latest"]); } catch (e) { nativeA = e.message; }
  try { nativeB = await rpc(beta, "eth_getBalance", [address, "latest"]); } catch (e) { nativeB = e.message; }
  try { codeA = await rpc(alpha, "eth_getCode", [CONTRACT, "latest"]); } catch {}
  try { codeB = await rpc(beta, "eth_getCode", [CONTRACT, "latest"]); } catch {}
  try { tokenBal = (await token(beta).balanceOf(address)).toString(); } catch (e) { tokenBal = e.message; }
  return { address, collectedAt: new Date().toISOString(), stamps: [sa, sb], nativeA, nativeB, tokenBal, codeA: !!(codeA && codeA !== "0x"), codeB: !!(codeB && codeB !== "0x"), vest, mbstacIn: tin, mbstacOut: tout };
}
function countLogs(x) { return Array.isArray(x) ? x.length : 0; }
function hashes(x, n) {
  if (!Array.isArray(x)) return [];
  return x.slice(0, n || 8).map(l => l.transactionHash).filter(Boolean);
}
function renderTape(pack) {
  const host = document.getElementById("tapeHost");
  const flow = document.getElementById("flowHost");
  if (!host || !pack) return;
  const aLogs = pack.vest.reduce((n, v) => n + countLogs(v.alpha), 0);
  const bLogs = pack.vest.reduce((n, v) => n + countLogs(v.beta), 0);
  const inN = countLogs(pack.mbstacIn), outN = countLogs(pack.mbstacOut);
  host.innerHTML = pack.vest.map(v => {
    const ah = hashes(v.alpha, 3).map(h => `<a target="_blank" rel="noopener" href="${explorerFor(alphaUrl())}/tx/${h}">${short(h)}</a>`).join(" ");
    const bh = hashes(v.beta, 3).map(h => `<a target="_blank" rel="noopener" href="${explorerFor(betaUrl())}/tx/${h}">${short(h)}</a>`).join(" ");
    return `<p><strong>${v.contract}</strong><br>Dashboard Side events ${Array.isArray(v.alpha) ? v.alpha.length : v.alpha.error}<br>${ah || "—"}<br>Mainnet Side events ${Array.isArray(v.beta) ? v.beta.length : v.beta.error}<br>${bh || "—"}</p>`;
  }).join("");
  if (flow) {
    const nA = typeof pack.nativeA === "string" && pack.nativeA.startsWith("0x") ? wei(pack.nativeA) : pack.nativeA;
    const nB = typeof pack.nativeB === "string" && pack.nativeB.startsWith("0x") ? wei(pack.nativeB) : pack.nativeB;
    const tok = /^\d+$/.test(String(pack.tokenBal || "")) ? wei(pack.tokenBal) : pack.tokenBal;
    flow.innerHTML = `<div class="flow">
      <div class="node muted">Shop / dashboard records<br><small>off-chain unless you paste a CSV</small></div>
      <div class="arrow">dotted</div>
      <div class="row">
        <div class="node">Dashboard Side<br>native ${nA}<br>vesting events ${aLogs}</div>
        <div class="node">Mainnet Side<br>native ${nB}<br>vesting events ${bLogs}</div>
      </div>
      <div class="arrow">on-chain where logs exist</div>
      <div class="node">Wallet ${short(pack.address)}</div>
      <div class="arrow">MBSTAC ${pack.codeB ? "present on Mainnet Side RPC" : "no bytecode on this RPC"}</div>
      <div class="node">MBSTAC in ${inN} / out ${outN}<br>balance ${tok}</div>
    </div>`;
  }
  window.MBSTAC_FOOTPRINT = pack;
}
async function runTape() {
  const a = (document.getElementById("compare-wallet-address").value || sourceWallet || "").trim();
  const st = document.getElementById("tapeStatus");
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { if (st) st.textContent = "Enter a 0x address first."; return; }
  if (st) st.textContent = "Collecting public logs…";
  try {
    const pack = await collectTape(a);
    renderTape(pack);
    if (st) st.textContent = "Collected " + pack.collectedAt + ".";
    showPane("lab");
  } catch (e) { if (st) st.textContent = e.message || String(e); }
}
function exportFootprint() {
  const pack = window.MBSTAC_FOOTPRINT;
  if (!pack) { runTape(); return; }
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mbstac-footprint-" + pack.address.slice(2, 8) + ".json";
  a.click();
}
function saveWatch() {
  const a = (document.getElementById("compare-wallet-address").value || sourceWallet || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(a)) return;
  const list = JSON.parse(localStorage.getItem("mbstac_watch") || "[]");
  if (!list.includes(a)) list.push(a);
  localStorage.setItem("mbstac_watch", JSON.stringify(list));
  paintWatch();
}
function paintWatch() {
  const host = document.getElementById("watchList"); if (!host) return;
  const list = JSON.parse(localStorage.getItem("mbstac_watch") || "[]");
  host.innerHTML = list.map(a => `<button type="button" class="btn-ghost mt-1" onclick="document.getElementById('compare-wallet-address').value='${a}';runTape()">${short(a)}</button>`).join("") || "<span class='hint'>None saved on this device.</span>";
}

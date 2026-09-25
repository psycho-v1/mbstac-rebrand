let pickedProvider = null;
const MINER_KEY = "mbstac_miners";

function toggleHelp(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = !el.hidden;
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-help]");
  if (btn) toggleHelp(btn.getAttribute("data-help"));
});

window.addEventListener("eip6963:announceProvider", (event) => {
  const { info, provider } = event.detail || {};
  if (!info || !provider) return;
  const host = document.getElementById("walletList");
  if (!host || host.querySelector(`[data-uuid="${info.uuid}"]`)) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn-ghost";
  b.dataset.uuid = info.uuid;
  b.textContent = "Use " + (info.name || "wallet");
  b.onclick = () => { pickedProvider = provider; window.ethereum = provider; connectWallet(); };
  host.appendChild(b);
});
try { window.dispatchEvent(new Event("eip6963:requestProvider")); } catch {}

function minerRows() { return JSON.parse(localStorage.getItem(MINER_KEY) || "[]"); }
function addMiner() {
  const type = document.getElementById("minerType");
  const qty = Number(document.getElementById("minerQty").value || 1);
  let usd = Number(document.getElementById("minerUsd").value);
  if (!usd) usd = Number(type.selectedOptions[0].dataset.usd || 0);
  const date = document.getElementById("minerDate").value || new Date().toISOString().slice(0, 10);
  const row = { type: type.value, qty, usd, total: +(qty * usd).toFixed(2), date };
  const list = minerRows(); list.push(row);
  localStorage.setItem(MINER_KEY, JSON.stringify(list));
  paintMiners(); drawTrace();
}
function paintMiners() {
  const host = document.getElementById("minerList"); if (!host) return;
  const list = minerRows();
  if (!list.length) { host.textContent = "No miner rows on this device."; return; }
  host.innerHTML = list.map((r, i) => `${r.date} · ${r.qty}× ${r.type} · list $${r.usd} · $${r.total} <button type="button" class="btn-ghost" onclick="delMiner(${i})">Remove</button>`).join("<br>");
}
function delMiner(i) {
  const list = minerRows(); list.splice(i, 1);
  localStorage.setItem(MINER_KEY, JSON.stringify(list));
  paintMiners(); drawTrace();
}

function drawTrace() {
  const svg = document.getElementById("traceSvg"); if (!svg) return;
  const pack = window.MBSTAC_FOOTPRINT || {};
  const miners = minerRows();
  const minerUsd = miners.reduce((s, r) => s + (r.total || 0), 0);
  const aLogs = (pack.vest || []).reduce((n, v) => n + (Array.isArray(v.alpha) ? v.alpha.length : 0), 0);
  const bLogs = (pack.vest || []).reduce((n, v) => n + (Array.isArray(v.beta) ? v.beta.length : 0), 0);
  svg.innerHTML = `
    <rect x="8" y="8" width="110" height="44" rx="8" fill="none" stroke="#c4a0ff" stroke-dasharray="4 3"/>
    <text x="63" y="26" fill="#c4a0ff" font-size="11" text-anchor="middle">Miner shop</text>
    <text x="63" y="42" fill="#e8eef6" font-size="11" text-anchor="middle">$${minerUsd.toFixed(0)} logged</text>
    <rect x="125" y="8" width="110" height="44" rx="8" fill="none" stroke="#f0c36a" stroke-dasharray="4 3"/>
    <text x="180" y="26" fill="#f0c36a" font-size="11" text-anchor="middle">Shop totals</text>
    <text x="180" y="42" fill="#93a0b4" font-size="10" text-anchor="middle">off-chain</text>
    <rect x="242" y="8" width="110" height="44" rx="8" fill="none" stroke="#3ee0ff"/>
    <text x="297" y="26" fill="#3ee0ff" font-size="11" text-anchor="middle">MBSTAC</text>
    <text x="297" y="42" fill="#e8eef6" font-size="10" text-anchor="middle">token record</text>
    <path d="M63 52 C63 90, 80 90, 180 118" fill="none" stroke="#c4a0ff" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="M180 52 C180 90, 180 90, 180 118" fill="none" stroke="#f0c36a" stroke-width="2" stroke-dasharray="5 4"/>
    <rect x="20" y="130" width="150" height="56" rx="8" fill="#101820" stroke="#ff8b6a"/>
    <text x="95" y="152" fill="#ff8b6a" font-size="12" text-anchor="middle">Dashboard Side</text>
    <text x="95" y="172" fill="#e8eef6" font-size="11" text-anchor="middle">claims ${aLogs}</text>
    <rect x="190" y="130" width="150" height="56" rx="8" fill="#101820" stroke="#3ee0ff"/>
    <text x="265" y="152" fill="#3ee0ff" font-size="12" text-anchor="middle">Mainnet Side</text>
    <text x="265" y="172" fill="#e8eef6" font-size="11" text-anchor="middle">claims ${bLogs}</text>
    <rect x="105" y="204" width="150" height="44" rx="8" fill="#101820" stroke="#5ee0a8"/>
    <text x="180" y="222" fill="#5ee0a8" font-size="11" text-anchor="middle">Wallet</text>
    <text x="180" y="238" fill="#e8eef6" font-size="10" text-anchor="middle">${pack.address ? pack.address.slice(0,6)+"…"+pack.address.slice(-4) : "paste address"}</text>
    <path d="M95 186 L180 204" stroke="#ff8b6a" fill="none"/>
    <path d="M265 186 L180 204" stroke="#3ee0ff" fill="none"/>
  `;
}

const _run = window.runTape;
window.runTape = async function() {
  if (typeof _run === "function") await _run();
  drawTrace();
};

document.getElementById("minerType")?.addEventListener("change", () => {
  const usd = document.getElementById("minerUsd");
  const v = document.getElementById("minerType").selectedOptions[0].dataset.usd;
  if (usd && !usd.value) usd.placeholder = v;
});
document.addEventListener("DOMContentLoaded", () => { paintMiners(); paintWatch(); drawTrace(); });

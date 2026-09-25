const CONTRACT = "0x89c7B13Dea0Ca0003342F6b3cf8F9ec116EBcd19";
const CHAIN_ID = 1404, CHAIN_HEX = "0x57c";
const RPX = [
  ["CapeDAG","https://rpc.capedag.com","beta"],["Engineering","https://rpc.blockdag.engineering","beta"],
  ["DVD Mining","https://rpc.dvdmining.com","beta"],["BDAG-US East","https://rpc.east.bdag-us.org","beta"],
  ["BDAG-US West","https://rpc.west.bdag-us.org","beta"],["ENGLAND","https://rpc.england.bdag.us.org","beta"],
  ["BRAZIL","https://rpc.brazil.bdag.us.org","beta"],["DAGCORE","https://rpc.dagcore.net","beta"],
  ["BlockDAG Works","https://rpc.blockdag.works","alpha"],["BDAGScan","https://rpc.bdagscan.com","alpha"]
];
let sourceWallet = null;
function wei(v) { try { const n = BigInt(v || 0), b = 10n ** 18n; return (n / b).toLocaleString() + "." + ((n % b) * 1000n / b).toString().padStart(3, "0"); } catch { return String(v); } }
function betaUrl() { return document.getElementById("rpcSelect")?.value; }
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
    const short = sourceWallet.slice(0, 6) + "…" + sourceWallet.slice(-4);
    const d = document.getElementById("sourceWalletDisplay"); if (d) d.textContent = short;
    const box = document.getElementById("walletBox") || document.getElementById("compare-wallet-address");
    if (box) box.value = sourceWallet;
    const t = new ethers.Contract(CONTRACT, ["function balanceOf(address) view returns (uint256)"], new ethers.JsonRpcProvider(betaUrl(), CHAIN_ID));
    const bal = document.getElementById("tokenBalance"); if (bal) bal.textContent = wei(await t.balanceOf(sourceWallet)) + " MBSTAC";
  } catch (e) { const s = document.getElementById("status"); if (s) s.textContent = e.message || String(e); }
}
function claimToken() { window.open("https://mbasestack.com/#mbasestack-utility-token", "_blank", "noopener"); }
function fillRpc() {
  const b = document.getElementById("rpcSelect"), a = document.getElementById("alphaRpcSelect");
  if (!b || !a) return;
  b.innerHTML = RPX.filter(r => r[2] === "beta").map(r => `<option value="${r[1]}">${r[0]}</option>`).join("");
  a.innerHTML = RPX.filter(r => r[2] === "alpha").map(r => `<option value="${r[1]}">${r[0]}</option>`).join("");
}
document.addEventListener("DOMContentLoaded", fillRpc);

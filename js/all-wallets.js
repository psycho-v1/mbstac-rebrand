async function loadAllWallets() {
  const host = document.getElementById("allWalletBoard");
  const st = document.getElementById("allWalletStatus");
  const list = (typeof diary === "function" ? diary().wallets : []) || [];
  if (!host) return;
  if (!list.length) {
    host.innerHTML = "<p class='hint'>Save wallets in My Diary first. They all appear here.</p>";
    return;
  }
  if (st) st.textContent = "Reading " + list.length + " wallet(s) on both sides…";
  host.innerHTML = "";
  const alpha = typeof alphaUrl === "function" ? alphaUrl() : "";
  const beta = typeof betaUrl === "function" ? betaUrl() : "";
  for (const w of list) {
    const card = document.createElement("div");
    card.className = "diary-item";
    card.innerHTML = "<div class='hash'>" + w.address + "</div><div class='hint'>" + (w.note || "") + "</div><div class='hint'>Reading…</div>";
    host.appendChild(card);
    const body = card.lastChild;
    try {
      const topic = "0x" + w.address.slice(2).toLowerCase().padStart(64, "0");
      let dash = "—", main = "—", tok = "—", aN = 0, bN = 0;
      try { dash = wei(await rpc(alpha, "eth_getBalance", [w.address, "latest"])); } catch (e) { dash = e.message; }
      try { main = wei(await rpc(beta, "eth_getBalance", [w.address, "latest"])); } catch (e) { main = e.message; }
      try { tok = wei(await token(beta).balanceOf(w.address)) + " MBSTAC"; } catch (e) { tok = e.message; }
      for (const c of VESTING) {
        const q = { address: c, topics: [CLAIM_TOPIC, topic], fromBlock: "0x0", toBlock: "latest" };
        try { aN += (await rpc(alpha, "eth_getLogs", [q])).length; } catch {}
        try { bN += (await rpc(beta, "eth_getLogs", [q])).length; } catch {}
      }
      const rows = (typeof diary === "function" ? diary() : {});
      const buys = (rows.buys || []).filter(r => (r.wallet || "").toLowerCase() === w.address.toLowerCase()).length;
      const miners = (rows.miners || []).filter(r => (r.wallet || "").toLowerCase() === w.address.toLowerCase()).length;
      body.innerHTML = "Dashboard Side native <strong class='value'>" + dash + "</strong><br>Mainnet Side native <strong class='value'>" + main + "</strong><br>MBSTAC <strong class='value'>" + tok + "</strong><br>Vesting events D/M: " + aN + " / " + bN + "<br>Diary purchase rows: " + buys + " · miner rows: " + miners;
    } catch (e) { body.textContent = e.message || String(e); }
  }
  if (st) st.textContent = list.length + " wallet(s) on this board.";
}
document.addEventListener("DOMContentLoaded", () => {
  const app = document.querySelector(".app");
  if (app && !document.getElementById("allWalletBoard")) {
    const box = document.createElement("div");
    box.className = "card";
    box.innerHTML = "<div class='kicker'>All wallets</div><h2>Every saved address</h2><p class='hint'>One list. No switching. Add more addresses in Diary, then refresh this board.</p><p id='allWalletStatus' class='hint'></p><div id='allWalletBoard'></div><button type='button' class='btn-mint' onclick='loadAllWallets()'>Refresh all wallets</button>";
    const diaryPane = document.querySelector('[data-pane="diary"]');
    if (diaryPane) diaryPane.insertBefore(box, diaryPane.firstChild);
    else app.appendChild(box);
  }
});

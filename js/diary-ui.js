document.addEventListener("DOMContentLoaded", () => {
  const bar = document.querySelector(".topbar");
  if (bar && !document.querySelector("a.official")) {
    const a = document.createElement("a");
    a.className = "official";
    a.href = "https://mbasestack.com/#mbasestack-utility-token";
    a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Official site";
    const menuBtn = document.getElementById("siteMenuBtn");
    bar.insertBefore(a, menuBtn || null);
  }
  const app = document.querySelector(".app");
  if (app && !document.querySelector('[data-pane="diary"]')) {
    const sec = document.createElement("section");
    sec.className = "pane"; sec.dataset.pane = "diary";
    sec.innerHTML = `
      <div class="card">
        <div class="row-help"><div class="kicker">My Diary</div><button type="button" class="q" data-help="help-diary">?</button></div>
        <div id="help-diary" class="help" hidden>Saved only on this phone. Export a JSON copy. These are your notes, not chain proofs, unless you also paste a hash.</div>
        <h2>Keep your own record</h2>
        <p class="hint">Public posts from @blockdagnetwork have mentioned presale batches, Legacy / New tracks, X miners, X1 app, Telegram, Direct Swap, promo codes, and USDT buyback / restore figures on the dashboard. Exchanges may use a different RPC than Mainnet Side. Type what you actually did.</p>
        <h3>Wallets you used</h3>
        <input id="diaryWallet" class="form-control hash" placeholder="0x address">
        <input id="diaryWalletNote" class="form-control mt-2" placeholder="Which shop or app">
        <button type="button" class="btn-mint" onclick="addWallet()">Save wallet</button>
        <div id="list-wallets"></div>
        <h3 class="mt-3">Purchase / aftersale / swap hashes</h3>
        <select id="diaryBuyKind" class="form-select"><option>presale</option><option>aftersale</option><option>swap</option><option>direct-new</option><option>legacy</option><option>other</option></select>
        <input id="diaryBuyHash" class="form-control hash mt-2" placeholder="0x transaction hash">
        <input id="diaryBuyAmt" class="form-control mt-2" placeholder="Amount you paid or received">
        <input id="diaryBuyDate" class="form-control mt-2" type="date">
        <button type="button" class="btn-ghost" onclick="addBuy()">Save purchase row</button>
        <div id="list-buys"></div>
        <h3 class="mt-3">Miner purchase hashes</h3>
        <select id="diaryMinerType" class="form-select"><option>X1</option><option>X10</option><option>X30</option><option>X100</option><option>other miner</option></select>
        <input id="diaryMinerQty" class="form-control mt-2" placeholder="How many">
        <input id="diaryMinerUsd" class="form-control mt-2" placeholder="USD you paid">
        <input id="diaryMinerHash" class="form-control hash mt-2" placeholder="0x hash if you have one">
        <input id="diaryMinerDate" class="form-control mt-2" type="date">
        <button type="button" class="btn-ghost" onclick="addMinerTx()">Save miner row</button>
        <div id="list-miners"></div>
        <h3 class="mt-3">X1 mining before the app stopped</h3>
        <input id="diaryX1" class="form-control" placeholder="BDAG or points shown">
        <input id="diaryX1Date" class="form-control mt-2" type="date">
        <input id="diaryX1Note" class="form-control mt-2" placeholder="Screenshot note">
        <button type="button" class="btn-ghost" onclick="addX1()">Save X1 row</button>
        <div id="list-x1"></div>
        <h3 class="mt-3">Telegram tap points</h3>
        <input id="diaryTg" class="form-control" placeholder="Points shown">
        <input id="diaryTgDate" class="form-control mt-2" type="date">
        <input id="diaryTgNote" class="form-control mt-2" placeholder="Bot or group name">
        <button type="button" class="btn-ghost" onclick="addTg()">Save tap row</button>
        <div id="list-telegram"></div>
        <h3 class="mt-3">Buyback / dashboard USDT</h3>
        <p class="hint">@blockdagnetwork has posted buyback rates ($0.03, then $0.05 for a short window), restore of dashboard USDT figures, and November batch cashouts. Enter the number you saw.</p>
        <select id="diaryBbTrack" class="form-select"><option>legacy</option><option>new</option><option>both / unknown</option></select>
        <input id="diaryBbUsdt" class="form-control mt-2" placeholder="USDT figure on dashboard">
        <input id="diaryBbDate" class="form-control mt-2" type="date">
        <input id="diaryBbNote" class="form-control mt-2" placeholder="Restored? reversed? still waiting?">
        <button type="button" class="btn-ghost" onclick="addBuyback()">Save buyback row</button>
        <div id="list-buyback"></div>
        <h3 class="mt-3">Exchange stuck / RPC mismatch</h3>
        <input id="diaryExName" class="form-control" placeholder="Exchange name">
        <select id="diaryExStatus" class="form-select"><option>cannot withdraw</option><option>wrong network in app</option><option>uses Dashboard Side RPC only</option><option>uses Mainnet Side RPC only</option><option>resolved</option></select>
        <input id="diaryExNote" class="form-control mt-2" placeholder="What support told you">
        <button type="button" class="btn-ghost" onclick="addEx()">Save exchange row</button>
        <div id="list-exchanges"></div>
        <button type="button" class="btn-mint" onclick="exportDiary()">Export diary JSON</button>
      </div>`;
    app.appendChild(sec);
  }
  const menu = document.getElementById("siteMenu");
  if (menu && !menu.querySelector('[data-jump="diary"]')) {
    const a = document.createElement("a"); a.href = "#"; a.dataset.jump = "diary"; a.textContent = "My Diary";
    a.addEventListener("click", e => { e.preventDefault(); showPane("diary"); menu.hidden = true; });
    menu.insertBefore(a, menu.firstChild);
  }
  const nav = document.querySelector(".bottombar");
  if (nav && !nav.querySelector('[data-go="diary"]')) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tab"; b.dataset.go = "diary";
    b.innerHTML = '<i class="fa fa-book d-block"></i>Diary';
    b.onclick = () => showPane("diary");
    nav.appendChild(b);
  }
  if (typeof paintDiary === "function") paintDiary();
});

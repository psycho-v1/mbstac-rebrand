window.addEventListener("load", () => {
  if (document.querySelector("script[src='js/all-wallets.js']")) return;
  const s = document.createElement("script");
  s.src = "js/all-wallets.js";
  s.onload = () => { if (typeof loadAllWallets === "function") loadAllWallets(); };
  document.body.appendChild(s);
});

const UPDATES = [
  { date: "2026-09-26", title: "Lab tiles split by cohort", body: "Presale, aftersale, buyback, swap, and miner paid/delivered are separate. T-hat is a scenario fan, not an official total." },
  { date: "2026-09-26", title: "LabPoints.sol drafted", body: "Owner-only award of 10 points per diary hash. Participants are not meant to pay gas. Not deployed yet." },
  { date: "2026-09-25", title: "Rebrand preview notice", body: "This GitHub Pages file is a volunteer rebrand. Mint on the official site only." }
];
(function(){ if(!document.querySelector('link[href="css/extra.css"]')){ const l=document.createElement('link'); l.rel='stylesheet'; l.href='css/extra.css'; document.head.appendChild(l);} })();
function renderUpdates() {
  const host = document.getElementById("updatesList");
  if (!host) return;
  host.innerHTML = UPDATES.map(u => `<article class="tile"><div class="kicker">${u.date}</div><strong>${u.title}</strong><p class="hint">${u.body}</p></article>`).join("");
}
document.addEventListener("DOMContentLoaded", renderUpdates);

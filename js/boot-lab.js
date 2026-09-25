document.addEventListener("DOMContentLoaded", () => {
  ["js/append-row.js", "js/lab-break.js"].forEach(src => {
    if (document.querySelector(`script[src='${src}']`)) return;
    const s = document.createElement("script"); s.src = src; document.body.appendChild(s);
  });
  setTimeout(() => { if (typeof renderLab === "function") renderLab(); }, 400);
});

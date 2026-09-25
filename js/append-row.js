const _read = readChapter;
readChapter = function(id, s) {
  if (id === "hello" || id === "who" || id === "screen" || id === "E5" || id === "done") return _read(id, s);
  const row = { module: id, date: val("f_date") || "unknown", class: id };
  ["vintage","cohort","amount","currency","coins_paid","coins_bonus","hash","note","program","asset","sku","event","units","usd","surface","used","venue","fail","deposit","address","dest","word","tech","contract","status","dash","move"].forEach(k => {
    const v = val("f_" + k); if (v) row[k] = v;
  });
  if (id === "A" && !needTx(row.hash || "")) return "A paid purchase needs a 0x transaction hash.";
  if (id === "D" && (row.event === "paid" || row.event === "ordered") && !needTx(row.hash || "")) return "Paid or ordered miners need a 0x hash.";
  if (s._edit !== undefined) { s.rows[s._edit] = row; delete s._edit; }
  else s.rows.push(row);
  return "";
};

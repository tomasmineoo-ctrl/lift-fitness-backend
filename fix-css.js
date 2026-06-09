const fs = require('fs');
let html = fs.readFileSync('lift-backend/public/index.html', 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');
let css = html.slice(styleStart + 7, styleEnd);

// 1. Replace all Orbitron with Inter (global)
css = css.replace(/font-family:'Orbitron',sans-serif/g, "font-family:'Inter',sans-serif");
css = css.replace(/font-family:'Orbitron',monospace/g, "font-family:'Inter',monospace");

// Re-add Orbitron ONLY for brand identity elements
css = css.replace(".loginBrand{font-family:'Inter',sans-serif;", ".loginBrand{font-family:'Orbitron',sans-serif;");
css = css.replace(".loginCard h2{font-family:'Inter',sans-serif;", ".loginCard h2{font-family:'Orbitron',sans-serif;");
css = css.replace(".topBarBrand .wordmark{font-family:'Inter',sans-serif;", ".topBarBrand .wordmark{font-family:'Orbitron',sans-serif;");

// 2. Remove text-shadow glows on non-brand elements
css = css.replace(/;text-shadow:0 0 \d+px rgba\(229,8,126,0\.\d+\)/g, '');
css = css.replace(/text-shadow:0 0 \d+px rgba\(229,8,126,0\.\d+\)/g, '');

// 3. Tone down card h3 - change color from accent to text2
css = css.replace(
  "margin-bottom:14px;color:var(--accent);\n  opacity:.8",
  "margin-bottom:12px;color:var(--text2);"
);

// 4. Remove shimmer lines (gradient pink top on cards)
css = css.replace(
  ".card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(229,8,126,0.2),transparent)}",
  ".card::before{display:none}"
);
css = css.replace(
  ".statCard::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(229,8,126,0.15),transparent)}",
  ".statCard::before{display:none}"
);
css = css.replace(
  ".kpiCard::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(229,8,126,0.1),transparent)}",
  ".kpiCard::after{display:none}"
);

// 5. Replace glass/backdrop-filter cards with solid surfaces
css = css.replace(
  "background:var(--glass);\n  border:1px solid var(--border);\n  border-radius:12px;padding:20px;margin-bottom:14px;\n  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);\n  transition:border-color .2s,box-shadow .2s;\n  position:relative;overflow:hidden",
  "background:var(--surface);\n  border:1px solid var(--border);\n  border-radius:10px;padding:20px;margin-bottom:14px;\n  transition:border-color .2s;\n  position:relative;overflow:hidden"
);

// 6. Simplify card hover
css = css.replace(
  ".card:hover{border-color:rgba(229,8,126,0.2);box-shadow:0 4px 30px rgba(229,8,126,0.06)}",
  ".card:hover{border-color:var(--border2)}"
);

// 7. Remove backdrop-filter from statCard
css = css.replace("backdrop-filter:blur(10px);position:relative;overflow:hidden\n}\n.statCard::before", "position:relative;overflow:hidden\n}\n.statCard::before");

// 8. Remove statCard hover glow
css = css.replace(
  ".statCard:hover{border-left-color:var(--accent);transform:translateY(-2px);box-shadow:0 8px 24px rgba(229,8,126,0.1)}",
  ".statCard:hover{border-left-color:var(--accent);transform:translateY(-1px)}"
);

// 9. Remove chat bubble glow
css = css.replace(
  ".msgBubble.sent{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--white);align-self:flex-end;box-shadow:0 4px 16px rgba(229,8,126,0.3)}",
  ".msgBubble.sent{background:var(--accent);color:var(--white);align-self:flex-end}"
);

// 10. Simplify quickAction hover
css = css.replace(
  ".quickAction:hover{border-color:rgba(229,8,126,0.35);background:rgba(229,8,126,0.06);transform:translateY(-2px);box-shadow:0 8px 30px rgba(229,8,126,0.12)}",
  ".quickAction:hover{border-color:rgba(200,56,112,0.3);background:rgba(200,56,112,0.04);transform:translateY(-1px)}"
);

// 11. Simplify quickAction text - remove uppercase/tracked
css = css.replace(
  "font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--white);line-height:1.3}",
  "font-weight:700;letter-spacing:0;color:var(--white);line-height:1.3}"
);

// 12. Remove kpiCard colored glows
css = css.replace(/;box-shadow:0 0 8px rgba\([^)]+\)/g, '');

// 13. Remove quota/badge glows
css = css.replace(/;box-shadow:0 0 6px rgba\([^)]+\)/g, '');
css = css.replace(/;box-shadow:0 0 8px rgba\([^)]+\)/g, '');
css = css.replace(/;box-shadow:0 0 12px rgba\(229,8,126,0\.15\)/g, '');
css = css.replace(/;box-shadow:0 0 16px rgba\(229,8,126,0\.35\)/g, '');

// 14. Simplify annItem
css = css.replace(
  ".annItem{background:var(--glass);border-radius:10px;padding:14px;margin-bottom:8px;border:1px solid var(--border);border-left:2px solid var(--accent);box-shadow:inset 0 0 20px rgba(229,8,126,0.03)}",
  ".annItem{background:var(--surface);border-radius:8px;padding:14px;margin-bottom:8px;border:1px solid var(--border);border-left:3px solid var(--accent)}"
);

// 15. Simplify annItem h4
css = css.replace(
  ".annItem h4{font-family:'Inter',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase;color:var(--white)}",
  ".annItem h4{font-family:'Inter',sans-serif;font-size:.82rem;font-weight:700;margin-bottom:5px;color:var(--white)}"
);

// 16. Simplify QR wrap
css = css.replace(
  ".qrWrap{background:#fff;padding:10px;border-radius:8px;display:inline-block;box-shadow:0 0 20px rgba(229,8,126,0.15)}",
  ".qrWrap{background:#fff;padding:10px;border-radius:6px;display:inline-block}"
);

// 17. Remove healthItem hVal text glow
css = css.replace(
  ".healthItem .hVal{font-family:'Inter',sans-serif;font-size:1.1rem;font-weight:700;color:var(--accent);text-shadow:0 0 12px rgba(229,8,126,0.4)}",
  ".healthItem .hVal{font-family:'Inter',sans-serif;font-size:1.1rem;font-weight:700;color:var(--accent)}"
);

// 18. Simplify btnAccent hover
css = css.replace(
  ".btnAccent{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--white);border:none;box-shadow:0 4px 16px rgba(229,8,126,0.3)}",
  ".btnAccent{background:var(--accent);color:var(--white);border:none}"
);
css = css.replace(
  ".btnAccent:hover{box-shadow:0 4px 14px rgba(200,56,112,0.3);transform:translateY(-1px)}",
  ".btnAccent:hover{background:var(--accent2);transform:translateY(-1px)}"
);

// 19. Remove all remaining box-shadow glows with pink
css = css.replace(/;box-shadow:0 0 \d+px rgba\(229,8,126,[^)]+\)/g, '');
css = css.replace(/box-shadow:0 0 \d+px rgba\(229,8,126,[^)]+\),/g, '');

// 20. Replace remaining glass backgrounds with surface
css = css.replace(/background:var\(--glass\)/g, 'background:var(--surface2)');
css = css.replace(/background:var\(--glass2\)/g, 'background:var(--surface2)');

// 21. Remove remaining backdrop-filter:blur
css = css.replace(/backdrop-filter:blur\(\d+px\);-webkit-backdrop-filter:blur\(\d+px\);/g, '');
css = css.replace(/;backdrop-filter:blur\(\d+px\)/g, '');
css = css.replace(/backdrop-filter:blur\(\d+px\)/g, '');

// 22. Simplify modal box-shadow
css = css.replace(
  /box-shadow:0 0 80px rgba\(229,8,126,0\.12\),inset 0 1px 0 rgba\(229,8,126,0\.1\)/,
  "box-shadow:0 8px 40px rgba(0,0,0,0.4)"
);

// 23. Simplify loginCard box-shadow
css = css.replace(
  /box-shadow:0 0 60px rgba\(229,8,126,0\.08\),inset 0 1px 0 rgba\(255,255,255,0\.05\)/,
  "box-shadow:0 8px 32px rgba(0,0,0,0.3)"
);

// 24. Simplify btnPrimary (login button)
css = css.replace(
  /box-shadow:0 4px 20px rgba\(229,8,126,0\.4\),0 0 40px rgba\(229,8,126,0\.15\)/,
  "box-shadow:0 4px 16px rgba(200,56,112,0.3)"
);
css = css.replace(
  /box-shadow:0 6px 30px rgba\(229,8,126,0\.6\),0 0 60px rgba\(229,8,126,0\.2\)/,
  "box-shadow:0 6px 20px rgba(200,56,112,0.35)"
);

// 25. Simplify sidebar support button
css = css.replace(
  ".sidebarSupportBtn{\n  margin:10px 10px 12px;\n  background:linear-gradient(135deg,rgba(229,8,126,0.2),rgba(52,56,142,0.3));\n  border:1px solid rgba(229,8,126,0.3);\n  border-radius:10px;padding:10px 12px;cursor:pointer;\n  font-size:.62rem;font-weight:700;color:var(--accent);\n  display:flex;align-items:center;gap:7px;\n  transition:all .2s;user-select:none;\n  font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:.08em;\n  box-shadow:0 0 16px rgba(229,8,126,0.1)\n}",
  ".sidebarSupportBtn{\n  margin:10px 10px 12px;\n  background:var(--surface2);\n  border:1px solid var(--border);\n  border-radius:8px;padding:10px 12px;cursor:pointer;\n  font-size:.62rem;font-weight:700;color:var(--text2);\n  display:flex;align-items:center;gap:7px;\n  transition:all .2s;user-select:none;\n  font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:.06em\n}"
);
css = css.replace(
  ".sidebarSupportBtn:hover{background:linear-gradient(135deg,rgba(229,8,126,0.3),rgba(52,56,142,0.4));box-shadow:0 0 24px rgba(229,8,126,0.2);transform:translateY(-1px)}",
  ".sidebarSupportBtn:hover{background:var(--surface3);border-color:var(--border2);color:var(--accent)}"
);

// 26. Simplify dashHero
css = css.replace(
  "background:linear-gradient(135deg,rgba(229,8,126,0.08),rgba(52,56,142,0.06));\n  border:1px solid rgba(229,8,126,0.2);border-radius:16px;\n  padding:24px 28px;margin-bottom:16px;\n  display:flex;justify-content:space-between;align-items:center;\n  position:relative;overflow:hidden;\n  box-shadow:0 0 60px rgba(229,8,126,0.06),inset 0 1px 0 rgba(229,8,126,0.1)",
  "background:var(--surface);\n  border:1px solid var(--border);border-radius:10px;\n  padding:24px 28px;margin-bottom:16px;\n  display:flex;justify-content:space-between;align-items:center;\n  position:relative;overflow:hidden"
);

// 27. Remove remaining dashHero pseudo-elements content
css = css.replace(
  ".dashHero::before{content:'';position:absolute;right:-60px;top:-60px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(229,8,126,0.08) 0%,transparent 65%);pointer-events:none}",
  ".dashHero::before{display:none}"
);
css = css.replace(
  ".dashHero::after{content:'';position:absolute;left:0;bottom:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(229,8,126,0.2),transparent)}",
  ".dashHero::after{display:none}"
);

// 28. Simplify topbar separator
css = css.replace(
  "background:linear-gradient(90deg,transparent 0%,var(--accent) 30%,transparent 50%,var(--indigo) 70%,transparent 100%);\n  opacity:.5",
  "background:var(--border)"
);

// 29. Simplify sidebar bg
css = css.replace(
  "background:linear-gradient(180deg,#0d0d14 0%,#080810 100%);",
  "background:var(--surface);"
);

// 30. Remove pageTitle text shadow (if any remain)
css = css.replace(/\.pageTitle\{([^}]+)\}/, (m, inner) => {
  return '.pageTitle{' + inner.replace(/text-shadow:[^;]+;?/g, '') + '}';
});

// 31. Tab: remove Orbitron leftover letter-spacing weirdness, simplify active
css = css.replace(
  ".tab.active,.tab:hover{color:var(--white);border-bottom-color:var(--accent)}",
  ".tab.active,.tab:hover{color:var(--white);border-bottom-color:var(--accent)}"
);

// Write back
const result = html.slice(0, styleStart + 7) + css + html.slice(styleEnd);
fs.writeFileSync('lift-backend/public/index.html', result);
console.log('CSS transformation complete');

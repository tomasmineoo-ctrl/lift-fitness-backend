const fs = require('fs');
let html = fs.readFileSync('lift-backend/public/index.html', 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');
let css = html.slice(styleStart + 7, styleEnd);

// 1. Update :root palette
css = css.replace(
  /:root\{[^}]+\}/,
  `:root{
  --bg:#0c0b0a;--surface:#161412;--surface2:#1e1c19;--surface3:#262320;--border:#302d2a;--border2:#3d3a36;--border3:#4a4642;
  --accent:#c83870;--accent2:#a62e5c;--accent-glow:rgba(200,56,112,0.13);--accent-soft:rgba(200,56,112,0.07);
  --indigo:#4a4e9a;--indigo2:#3b3e80;--gray:#a8a49f;--white:#ede8e2;
  --red:#c75858;--green:#4fa876;--blue:#5490c2;--orange:#c8784a;--teal:#4da8a7;--purple:#9070bc;
  --text:#e8e3dd;--text2:#857e78;--text3:#504c48;
  --bronze:#b87333;--silver:#a8a8a8;--gold:#c8a84b;--diamond:#9fd8e8;
}`
);

// 2. Remove all text-shadow glows
css = css.replace(/;text-shadow:[^;}]+/g, '');
css = css.replace(/text-shadow:[^;}]+;/g, '');

// 3. Remove shimmer lines on cards (top gradient pink line)
css = css.replace(/\.card::before\{[^}]+\}/, '.card::before{display:none}');
css = css.replace(/\.statCard::before\{[^}]+\}/, '.statCard::before{display:none}');

// 4. Tone down card h3 - use text2 instead of accent
css = css.replace(
  /\.card h3\{[^}]+\}/,
  ".card h3{font-family:'Barlow Condensed',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;color:var(--text2)}"
);

// 5. Simplify card hover - no glow
css = css.replace(
  /\.card:hover\{[^}]+\}/,
  '.card:hover{border-color:var(--border2)}'
);

// 6. Remove all colored box-shadow glows (keep structural shadows)
css = css.replace(/;box-shadow:0 0 \d+px rgba\([^)]+\)/g, '');
css = css.replace(/box-shadow:0 0 \d+px rgba\([^)]+\),?/g, '');
css = css.replace(/;box-shadow:0 0 \d+px var\(--accent\)/g, '');

// 7. Simplify statCard hover
css = css.replace(
  /\.statCard:hover\{[^}]+\}/,
  '.statCard:hover{border-left-color:var(--accent);transform:translateY(-1px)}'
);

// 8. Simplify .btnAccent
css = css.replace(
  /\.btnAccent\{[^}]+\}/,
  '.btnAccent{background:var(--accent);color:var(--white);border:none}'
);
css = css.replace(
  /\.btnAccent:hover\{[^}]+\}/,
  '.btnAccent:hover{background:var(--accent2);transform:translateY(-1px)}'
);

// 9. Simplify quickAction hover
css = css.replace(
  /\.quickAction:hover\{[^}]+\}/,
  '.quickAction:hover{border-color:rgba(200,56,112,0.3);background:rgba(200,56,112,0.04);transform:translateY(-1px)}'
);

// 10. Remove topbar gradient separator line
css = css.replace(
  /\.topBar::after\{[^}]+\}/,
  '.topBar::after{content:\'\';position:absolute;bottom:0;left:0;right:0;height:1px;background:var(--border)}'
);

// 11. Simplify annItem
css = css.replace(
  /\.annItem\{[^}]+\}/,
  '.annItem{background:var(--surface);border-radius:8px;padding:14px;margin-bottom:8px;border:1px solid var(--border);border-left:3px solid var(--accent)}'
);

// 12. Simplify .annItem h4
css = css.replace(
  /\.annItem h4\{[^}]+\}/,
  ".annItem h4{font-family:'Barlow Condensed',sans-serif;font-size:.82rem;font-weight:700;margin-bottom:5px;color:var(--white)}"
);

// 13. Remove chat bubble glow
css = css.replace(
  /\.msgBubble\.sent\{[^}]+\}/,
  '.msgBubble.sent{background:var(--accent);color:var(--white);align-self:flex-end}'
);

// 14. Remove quota bar glows
css = css.replace(/\.quotaFill\{[^}]+\}/, '.quotaFill{height:100%;border-radius:2px;background:var(--green)}');
css = css.replace(/\.quotaFill\.warn\{[^}]+\}/, '.quotaFill.warn{background:var(--orange)}');
css = css.replace(/\.quotaFill\.danger\{[^}]+\}/, '.quotaFill.danger{background:var(--red)}');

// 15. Simplify QR shadow
css = css.replace(
  /\.qrWrap\{[^}]+\}/,
  '.qrWrap{background:#fff;padding:10px;border-radius:6px;display:inline-block}'
);

// 16. Simplify modal shadow
css = css.replace(
  /\.modal\{[^}]+\}/,
  ".modal{background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:28px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.4);animation:fadeIn .2s ease}"
);

// 17. Tone down formGroup labels - remove Orbitron, soften
css = css.replace(
  /\.formGroup label\{[^}]+\}/,
  ".formGroup label{font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;font-family:'Barlow Condensed',sans-serif}"
);

// 18. Tone down tbl th
css = css.replace(
  /\.tbl th\{[^}]+\}/,
  ".tbl th{background:var(--surface2);padding:10px 12px;text-align:left;color:var(--text2);font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--border)}"
);

// 19. Simplify .dashHero
css = css.replace(
  /\.dashHero\{[^}]+\}/,
  '.dashHero{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:24px 28px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;position:relative;overflow:hidden}'
);
css = css.replace(/\.dashHero::before\{[^}]+\}/, '.dashHero::before{display:none}');
css = css.replace(/\.dashHero::after\{[^}]+\}/, '.dashHero::after{display:none}');

// 20. Simplify .sideSection color
css = css.replace(
  /\.sideSection\{[^}]+\}/,
  ".sideSection{padding:20px 16px 5px;font-size:.6rem;letter-spacing:.08em;color:var(--text3);font-weight:700;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;border-top:1px solid var(--border);margin-top:4px}"
);

// 21. Simplify pageTitle - remove glow
css = css.replace(
  /\.pageTitle\{[^}]+\}/,
  ".pageTitle{font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;letter-spacing:.06em;color:var(--white);margin-bottom:24px;text-transform:uppercase;display:flex;align-items:center;gap:12px}"
);
css = css.replace(/\.pageTitle::before\{[^}]+\}/, '.pageTitle::before{content:\'\';display:inline-block;width:3px;height:1.4rem;background:var(--accent);border-radius:2px;flex-shrink:0}');

// 22. Simplify statCard num font
css = css.replace(
  /\.statCard \.num\{[^}]+\}/,
  ".statCard .num{font-family:'Barlow Condensed',sans-serif;font-size:1.9rem;font-weight:800;line-height:1}"
);

// 23. Clean up remaining colored btn glows
css = css.replace(/\.btnSuccess:hover\{[^}]+\}/, '.btnSuccess:hover{background:rgba(79,168,118,.15)}');
css = css.replace(/\.btnDanger:hover\{[^}]+\}/, '.btnDanger:hover{background:rgba(199,88,88,.15)}');
css = css.replace(/\.btnInfo:hover\{[^}]+\}/, '.btnInfo:hover{background:rgba(84,144,194,.15)}');
css = css.replace(/\.btnPurple:hover\{[^}]+\}/, '.btnPurple:hover{background:rgba(144,112,188,.15)}');
css = css.replace(/\.btnTeal:hover\{[^}]+\}/, '.btnTeal:hover{background:rgba(77,168,167,.15)}');

// 24. Simplify kpiCard num font
css = css.replace(
  /\.kpiCard \.kpiNum\{[^}]+\}/,
  ".kpiCard .kpiNum{font-family:'Barlow Condensed',sans-serif;font-size:1.7rem;font-weight:800;line-height:1}"
);

// 25. Remove remaining glow box-shadows
css = css.replace(/;box-shadow:[^;}]*rgba\(229,8,126[^)]*\)[^;}]*/g, '');
css = css.replace(/;box-shadow:[^;}]*rgba\(0,255,136[^)]*\)[^;}]*/g, '');
css = css.replace(/;box-shadow:[^;}]*rgba\(0,170,255[^)]*\)[^;}]*/g, '');
css = css.replace(/;box-shadow:[^;}]*rgba\(0,229,255[^)]*\)[^;}]*/g, '');

// Write back
const result = html.slice(0, styleStart + 7) + css + html.slice(styleEnd);
fs.writeFileSync('lift-backend/public/index.html', result);
console.log('Done');

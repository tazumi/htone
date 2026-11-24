// ============================================================================
// decal atlas: everything with letters or fine print, painted once at load time with Canvas 2D
// ============================================================================
// Graffiti and plates by the doors, the intercom panels, shop signs, the goods in the shop windows, notices. Each item
// is drawn into its own cell of one 2048 x 2048 texture; makeAtlas() returns the canvas and, per name, the cell as
// [u0, v0, u1, v1]. world.js asks for the cells by name (see DECALS there).
const ATLAS = 2048;
function makeAtlas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = ATLAS;
  const c = cv.getContext('2d'), R = {};
  rseed(77);
  // the cells are collected first, then packed tallest first in rows (8 px apart so the mip levels do not bleed)
  const cells = [];
  const cell = (name, w, h, draw) => cells.push({ name, w, h, draw });
  const pack = () => {
    let px = 0, py = 0, rowH = 0;
    for (const { name, w, h, draw } of cells.sort((a, b) => b.h - a.h)) {
      if (px + w > ATLAS) { px = 0; py += rowH + 8; rowH = 0; }
      if (py + h > ATLAS) throw new Error('decal atlas full at ' + name);
      c.save(); c.translate(px, py); c.beginPath(); c.rect(0, 0, w, h); c.clip(); draw(w, h); c.restore();
      R[name] = [px / ATLAS, py / ATLAS, (px + w) / ATLAS, (py + h) / ATLAS];
      px += w + 8; rowH = max(rowH, h);
    }
  };
  const FB = '"Arial Black", "Segoe UI Black", Impact, sans-serif', FN = 'Arial, "Segoe UI", sans-serif', FC = '"Courier New", monospace';
  // text fitted into a width
  const fit = (s, font, size, w, wt = '') => { c.font = `${wt} ${size}px ${font}`; const m = c.measureText(s).width; if (m > w) c.font = `${wt} ${size * w / m}px ${font}`; };
  const rgb = (r, g, b, a = 1) => `rgba(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0},${a})`;

  // ---- graffiti: spray tags, bubble letters, marker scribbles, stencils; all of them clean words
  const SPRAY = ['ЦОЙ ЖИВ', 'КИСА + ВОВА', 'МИР', 'LOVE', 'ДИМОН', 'RAP', 'ЖЕНЯ', 'ВЕСНА СКОРО', 'НЕ СДАВАЙСЯ', 'ЛЁХА', 'ROCK', 'ОЛЯ ♥'];
  const COLS = [[0.85, 0.12, 0.1], [0.1, 0.35, 0.85], [0.1, 0.65, 0.25], [0.95, 0.85, 0.85], [0.08, 0.08, 0.08], [0.9, 0.55, 0.1], [0.6, 0.2, 0.75]];
  SPRAY.forEach((s, i) => cell('g' + i, 400, 150, (w, h) => {
    const col = COLS[i % COLS.length], st = i % 4;
    c.translate(w / 2, h / 2); c.rotate(rr(-0.12, 0.08)); c.textAlign = 'center'; c.textBaseline = 'middle';
    if (st === 0 || st === 2) {
      // spray: soft overspray, a few drips
      fit(s, st ? FN : FB, 120, w * 0.86); c.shadowColor = rgb(...col, 0.8); c.shadowBlur = 10;
      c.fillStyle = rgb(...col, 0.92); c.fillText(s, 0, 0);
      c.shadowBlur = 0; c.fillStyle = rgb(...col, 0.75);
      for (let k = 0; k < 7; k++) { const x = rr(-w * 0.38, w * 0.38), l = rr(10, 60); c.fillRect(x, rr(10, 30), 3, l); c.beginPath(); c.arc(x + 1.5, 30 + l, 3, 0, TAU); c.fill(); }
    } else if (st === 1) {
      // bubble letters: fat fill, dark outline, a white shine
      fit(s, FB, 130, w * 0.9); c.lineJoin = 'round';
      c.lineWidth = 16; c.strokeStyle = rgb(0.04, 0.04, 0.05, 0.95); c.strokeText(s, 0, 0);
      const gr = c.createLinearGradient(0, -50, 0, 50); gr.addColorStop(0, rgb(...col)); gr.addColorStop(1, rgb(col[0] * 0.5, col[1] * 0.5, col[2] * 0.5)); c.fillStyle = gr; c.fillText(s, 0, 0);
      c.lineWidth = 3; c.strokeStyle = rgb(1, 1, 1, 0.7); c.strokeText(s, -3, -4);
    } else {
      // marker: thin, quick, slanted
      fit(s, FN, 90, w * 0.8, 'italic'); c.lineWidth = 5; c.strokeStyle = rgb(...col, 0.9); c.strokeText(s, 0, 0);
      c.beginPath(); c.moveTo(-w * 0.35, 48); c.quadraticCurveTo(0, 70, w * 0.38, 40); c.stroke();
    }
  }));
  // a heart with an arrow, a smiling face, a stencilled advert, a tag scrawl
  cell('heart', 192, 192, (w) => {
    c.translate(w / 2, w / 2 + 8); c.fillStyle = rgb(0.85, 0.1, 0.15, 0.9); c.beginPath(); c.moveTo(0, 60); c.bezierCurveTo(-90, 0, -50, -70, 0, -30); c.bezierCurveTo(50, -70, 90, 0, 0, 60); c.fill();
    c.strokeStyle = rgb(0.1, 0.1, 0.1, 0.9); c.lineWidth = 6; c.beginPath(); c.moveTo(-85, 45); c.lineTo(85, -45); c.stroke();
    c.font = `bold 30px ${FN}`; c.textAlign = 'center'; c.fillStyle = rgb(1, 1, 1, 0.9); c.fillText('С + А', 0, 0);
  });
  cell('smile', 160, 160, (w) => {
    c.translate(w / 2, w / 2); c.strokeStyle = rgb(0.95, 0.8, 0.1, 0.9); c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 62, 0, TAU); c.stroke();
    c.fillStyle = c.strokeStyle; c.fillRect(-26, -26, 12, 22); c.fillRect(14, -26, 12, 22); c.beginPath(); c.arc(0, 4, 36, 0.3, PI - 0.3); c.stroke();
  });
  cell('stencil', 512, 128, (w, h) => {
    c.fillStyle = rgb(0.05, 0.05, 0.06, 0.88); c.textAlign = 'center'; fit('РЕМОНТ ХОЛОДИЛЬНИКОВ', FC, 44, w * 0.95, 'bold');
    c.fillText('РЕМОНТ ХОЛОДИЛЬНИКОВ', w / 2, 52); fit('НЕДОРОГО · 24 ЧАСА', FC, 40, w * 0.8); c.fillText('НЕДОРОГО · 24 ЧАСА', w / 2, 104);
  });
  cell('scrawl', 384, 160, (w, h) => {
    c.strokeStyle = rgb(0.1, 0.1, 0.12, 0.9); c.lineWidth = 7; c.lineCap = 'round'; c.beginPath();
    let x = 20, y = 90; c.moveTo(x, y);
    for (let k = 0; k < 14; k++) { const nx = x + rr(10, 34), ny = 80 + rr(-55, 45); c.quadraticCurveTo(x + rr(-15, 25), rr(10, 150), nx, ny); x = nx; y = ny; }
    c.stroke(); c.beginPath(); c.moveTo(16, 140); c.lineTo(w - 20, 120); c.stroke();
  });
  // ---- the blue enamel plate over a door: entrance number and the flats in it
  for (let i = 0; i < 4; i++) cell('plate' + i, 256, 96, (w, h) => {
    c.fillStyle = rgb(0.06, 0.18, 0.5); c.fillRect(0, 0, w, h); c.strokeStyle = rgb(0.9, 0.9, 0.9); c.lineWidth = 5; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = rgb(0.95, 0.95, 0.95); c.textAlign = 'center'; c.font = `bold 34px ${FN}`; c.fillText(`ПОДЪЕЗД ${i + 1}`, w / 2, 42);
    c.font = `28px ${FN}`; c.fillText(`кв. ${i * 20 + 1} - ${i * 20 + 20}`, w / 2, 78);
  });
  // ---- the intercom on the door: steel panel, a keypad, a glowing display and a red light
  cell('intercom', 64, 128, (w, h) => {
    c.fillStyle = rgb(0.09, 0.09, 0.1); c.fillRect(0, 0, w, h); c.fillStyle = rgb(0.2, 0.2, 0.22); c.fillRect(3, 3, w - 6, h - 6);
    c.fillStyle = rgb(0.05, 0.6, 0.85); c.fillRect(10, 12, 44, 18); c.fillStyle = rgb(0.6, 1, 1); c.font = `bold 13px ${FC}`; c.fillText('8:8', 18, 26);
    c.fillStyle = rgb(0.85, 0.7, 0.3);
    for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) c.fillRect(12 + k * 15, 42 + j * 15, 10, 10);
    c.fillStyle = rgb(1, 0.1, 0.05); c.beginPath(); c.arc(32, 112, 5, 0, TAU); c.fill();
  });
  // ---- notices for the board
  cell('notice0', 256, 320, (w, h) => {
    c.fillStyle = rgb(0.86, 0.85, 0.8); c.fillRect(0, 0, w, h - 60); c.fillStyle = rgb(0.1, 0.1, 0.1); c.textAlign = 'center';
    c.font = `bold 30px ${FN}`; c.fillText('ОБЪЯВЛЕНИЕ', w / 2, 44); c.font = `18px ${FN}`;
    ['Уважаемые жильцы!', 'С 1 по 3 декабря', 'будет отключена', 'горячая вода.', 'Приносим извинения.', 'ЖЭК № 4'].forEach((l, k) => c.fillText(l, w / 2, 84 + k * 28));
    for (let k = 0; k < 8; k++) { c.fillStyle = rgb(0.86, 0.85, 0.8); c.fillRect(6 + k * 31, h - 58, 26, k === 2 || k === 5 ? 0 : 56); }
  });
  cell('notice1', 256, 320, (w, h) => {
    c.fillStyle = rgb(0.95, 0.93, 0.6); c.fillRect(0, 0, w, h); c.fillStyle = rgb(0.1, 0.1, 0.1); c.textAlign = 'center';
    c.font = `bold 34px ${FN}`; c.fillText('ПРОПАЛ КОТ', w / 2, 46);
    c.beginPath(); c.ellipse(w / 2, 150, 60, 48, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(w / 2 + 50, 100, 30, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(w / 2 + 28, 82); c.lineTo(w / 2 + 34, 56); c.lineTo(w / 2 + 46, 74); c.moveTo(w / 2 + 58, 72); c.lineTo(w / 2 + 70, 52); c.lineTo(w / 2 + 76, 80); c.fill();
    c.font = `20px ${FN}`; ['Серый, пушистый,', 'зовут Барсик.', 'Нашедшему - награда!'].forEach((l, k) => c.fillText(l, w / 2, 240 + k * 26));
  });
  cell('notice2', 256, 192, (w, h) => {
    c.fillStyle = rgb(0.8, 0.88, 0.95); c.fillRect(0, 0, w, h); c.fillStyle = rgb(0.6, 0.05, 0.05); c.textAlign = 'center';
    c.font = `bold 28px ${FN}`; c.fillText('ВНИМАНИЕ!', w / 2, 40); c.fillStyle = rgb(0.1, 0.1, 0.1); c.font = `18px ${FN}`;
    ['Собрание жильцов', 'в субботу в 12:00', 'у второго подъезда.'].forEach((l, k) => c.fillText(l, w / 2, 84 + k * 28));
  });
  // ---- shop signs: a lit box for the grocery, neon for the chemist's and the two all-night shops
  const neon = (s, col, size, w, h, font = FB) => {
    c.fillStyle = rgb(0.01, 0.01, 0.015); c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; fit(s, font, size, w * 0.9);
    c.lineJoin = 'round'; c.shadowColor = rgb(...col); c.shadowBlur = 24; c.lineWidth = 7; c.strokeStyle = rgb(...col); c.strokeText(s, w / 2, h / 2);
    c.shadowBlur = 6; c.lineWidth = 2.5; c.strokeStyle = rgb(min(1, col[0] + 0.6), min(1, col[1] + 0.6), min(1, col[2] + 0.6)); c.strokeText(s, w / 2, h / 2);
  };
  cell('signShop', 768, 96, (w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, rgb(0.85, 0.06, 0.06)); gr.addColorStop(1, rgb(0.55, 0.02, 0.03)); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = rgb(1, 0.82, 0.1); c.beginPath(); c.arc(80, h / 2, 46, 0, TAU); c.fill(); c.fillStyle = rgb(0.1, 0.55, 0.2); c.beginPath(); c.arc(80, h / 2, 30, 0, TAU); c.fill();
    c.fillStyle = rgb(1, 1, 1); c.font = `bold 40px ${FN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', 80, h / 2 + 2);
    fit('ПРОДУКТЫ', FB, 96, w - 220); c.fillText('ПРОДУКТЫ', w / 2 + 50, h / 2 + 4);
  });
  cell('signPharm', 768, 96, (w, h) => neon('АПТЕКА', [0.1, 1, 0.3], 100, w, h));
  cell('cross', 160, 160, (w, h) => {
    c.fillStyle = rgb(0.01, 0.02, 0.01); c.fillRect(0, 0, w, h); c.shadowColor = rgb(0.1, 1, 0.3); c.shadowBlur = 20; c.fillStyle = rgb(0.25, 1, 0.45);
    c.fillRect(w / 2 - 22, 16, 44, h - 32); c.fillRect(16, h / 2 - 22, w - 32, 44); c.shadowBlur = 0; c.fillStyle = rgb(0.75, 1, 0.8); c.fillRect(w / 2 - 12, 26, 24, h - 52); c.fillRect(26, h / 2 - 12, w - 52, 24);
  });
  cell('sign24a', 512, 128, (w, h) => neon('24 ЧАСА', [1, 0.25, 0.1], 100, w, h));
  cell('sign24b', 512, 128, (w, h) => neon('ПРОДУКТЫ 24', [0.25, 0.55, 1], 90, w, h));
  cell('open', 256, 96, (w, h) => neon('ОТКРЫТО', [1, 0.2, 0.5], 60, w, h, FN));
  cell('knock', 128, 96, (w, h) => {
    c.fillStyle = rgb(0.95, 0.95, 0.9); c.fillRect(8, 8, w - 16, h - 16); c.fillStyle = rgb(0.1, 0.1, 0.1); c.textAlign = 'center'; c.font = `bold 20px ${FN}`;
    c.fillText('СТУЧИТЕ', w / 2, 44); c.font = `16px ${FN}`; c.fillText('в окошко', w / 2, 68);
  });
  cell('busSign', 128, 160, (w, h) => {
    c.fillStyle = rgb(0.95, 0.95, 0.95); c.fillRect(0, 0, w, h); c.fillStyle = rgb(0.05, 0.25, 0.65); c.fillRect(6, 6, w - 12, 90);
    c.fillStyle = rgb(1, 1, 1); c.font = `bold 70px ${FN}`; c.textAlign = 'center'; c.fillText('А', w / 2, 78);
    c.fillStyle = rgb(0.05, 0.05, 0.05); c.font = `bold 22px ${FN}`; c.fillText('12  34  57', w / 2, 128); c.font = `14px ${FN}`; c.fillText('ул. Заводская', w / 2, 150);
  });

  // ---- the viewer's kitchen: tiles over the counter, a picture on the television, a wall clock, a tear-off calendar
  cell('tiles', 512, 172, (w, h) => {
    for (let j = 0; j < 6; j++) for (let i = 0; i < 18; i++) { c.fillStyle = (i + j) % 7 === 3 ? '#8fb0b8' : '#dfe4e0'; c.fillRect(i * 28.4 + 1, j * 28.4 + 1, 26.4, 26.4); }
    c.fillStyle = 'rgba(0,0,0,.25)'; for (let j = 0; j <= 6; j++) c.fillRect(0, j * 28.4, w, 1.5);
  });
  cell('tvimg', 192, 160, (w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6a8cc8'); g.addColorStop(1, '#203060'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8b090'; c.beginPath(); c.arc(w * 0.55, h * 0.42, 20, 0, TAU); c.fill(); c.fillStyle = '#283040'; c.fillRect(w * 0.55 - 40, h * 0.58, 80, h * 0.42);
    c.fillStyle = '#e8e0c0'; c.fillRect(0, h * 0.8, w, h * 0.12); c.fillStyle = '#c03020'; c.fillRect(6, h * 0.82, 30, h * 0.08);
  });
  cell('clock', 128, 128, (w) => {
    c.translate(w / 2, w / 2); c.fillStyle = '#ece6d8'; c.beginPath(); c.arc(0, 0, 60, 0, TAU); c.fill(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 6; c.stroke();
    c.fillStyle = '#222'; for (let k = 0; k < 12; k++) { c.save(); c.rotate(k * PI / 6); c.fillRect(-2, -54, 4, 10); c.restore(); }
    c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(26, -14); c.moveTo(0, 0); c.lineTo(-6, -44); c.stroke();
  });
  cell('calendar', 128, 176, (w, h) => {
    c.fillStyle = '#b02020'; c.fillRect(0, 0, w, 40); c.fillStyle = '#f2efe6'; c.fillRect(6, 40, w - 12, h - 46); c.fillStyle = '#fff'; c.font = `bold 22px ${FN}`; c.textAlign = 'center'; c.fillText('НОЯБРЬ', w / 2, 28);
    c.fillStyle = '#c02020'; c.font = `bold 72px ${FN}`; c.fillText('24', w / 2, 118); c.fillStyle = '#333'; c.font = `18px ${FN}`; c.fillText('вторник', w / 2, 150);
  });
  // ---- goods: forty kinds for the shop windows, each drawn standing on a shelf at (x, y) with height h
  const label = (x, y, w, h, bg, fg, s) => { c.fillStyle = bg; c.fillRect(x, y, w, h); if (s) { c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; fit(s, FN, h * 0.7, w * 0.9, 'bold'); c.fillText(s, x + w / 2, y + h / 2); } };
  const bottle = (x, y, w, h, glass, cap, lab, txt) => {
    c.fillStyle = glass; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h * 0.62); c.quadraticCurveTo(x, y - h * 0.75, x + w * 0.35, y - h * 0.82); c.lineTo(x + w * 0.35, y - h);
    c.lineTo(x + w * 0.65, y - h); c.lineTo(x + w * 0.65, y - h * 0.82); c.quadraticCurveTo(x + w, y - h * 0.75, x + w, y - h * 0.62); c.lineTo(x + w, y); c.fill();
    c.fillStyle = cap; c.fillRect(x + w * 0.33, y - h - 3, w * 0.34, 6); if (lab) label(x, y - h * 0.5, w, h * 0.26, lab, '#fff', txt);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + w * 0.15, y - h * 0.6, w * 0.1, h * 0.5);
  };
  const box = (x, y, w, h, col, band, txt) => { c.fillStyle = col; c.fillRect(x, y - h, w, h); if (band) label(x, y - h * 0.62, w, h * 0.28, band, '#fff', txt); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + w * 0.85, y - h, w * 0.15, h); };
  const can = (x, y, w, h, col, txt) => { const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, col); g.addColorStop(0.4, '#ddd'); g.addColorStop(0.55, col); g.addColorStop(1, '#222'); c.fillStyle = g; c.fillRect(x, y - h, w, h); c.fillStyle = '#bbb'; c.fillRect(x, y - h, w, 3); if (txt) label(x + 2, y - h * 0.6, w - 4, h * 0.22, 'rgba(0,0,0,.35)', '#fff', txt); };
  const bag = (x, y, w, h, col, txt) => { c.fillStyle = col; c.beginPath(); c.moveTo(x + 3, y); c.lineTo(x, y - h + 6); c.lineTo(x + 4, y - h); c.lineTo(x + w - 4, y - h); c.lineTo(x + w, y - h + 6); c.lineTo(x + w - 3, y); c.fill(); label(x + 4, y - h * 0.62, w - 8, h * 0.26, 'rgba(255,255,255,.85)', col, txt); };
  const GOODS = [
    (x, y, s) => bottle(x, y, 22 * s, 70 * s, 'rgba(160,210,240,.85)', '#1550c0', '#2a7fe0', 'ВОДА'),
    (x, y, s) => bottle(x, y, 22 * s, 72 * s, 'rgba(60,170,70,.9)', '#118', '#e8e030', 'ТАРХУН'),
    (x, y, s) => bottle(x, y, 22 * s, 72 * s, '#3a1a0c', '#c00', '#d00', 'КОЛА'),
    (x, y, s) => bottle(x, y, 18 * s, 66 * s, '#5a3008', '#d4a010', '#f0e0b0', 'ПИВО'),
    (x, y, s) => bottle(x, y, 18 * s, 66 * s, '#1c5a1c', '#ccc', '#f4f4f4', 'ПИВО'),
    (x, y, s) => bottle(x, y, 16 * s, 76 * s, 'rgba(220,235,240,.8)', '#c00', '#fff', 'ВОДКА'),
    (x, y, s) => bottle(x, y, 20 * s, 64 * s, 'rgba(240,200,40,.9)', '#c80', '#e04010', 'МАСЛО'),
    (x, y, s) => bottle(x, y, 14 * s, 44 * s, '#c01010', '#fff', '#fff', 'КЕТЧУП'),
    (x, y, s) => box(x, y, 22 * s, 46 * s, '#f6f6f6', '#2060d0', 'МОЛОКО'),
    (x, y, s) => box(x, y, 22 * s, 46 * s, '#f6f6f6', '#30a040', 'КЕФИР'),
    (x, y, s) => box(x, y, 20 * s, 50 * s, '#ff8a10', '#c04000', 'СОК'),
    (x, y, s) => box(x, y, 20 * s, 50 * s, '#80c030', '#407010', 'СОК'),
    (x, y, s) => box(x, y, 20 * s, 50 * s, '#a01030', '#600010', 'МОРС'),
    (x, y, s) => can(x, y, 14 * s, 30 * s, '#d0a020', 'ПИВО'),
    (x, y, s) => can(x, y, 14 * s, 30 * s, '#2050b0', ''),
    (x, y, s) => can(x, y, 12 * s, 34 * s, '#111', 'ENERGY'),
    (x, y, s) => can(x, y, 24 * s, 12 * s, '#b03010', ''),
    (x, y, s) => can(x, y, 18 * s, 22 * s, '#3060c0', 'СГУЩ'),
    (x, y, s) => can(x, y, 18 * s, 22 * s, '#2a8030', 'ГОРОШЕК'),
    (x, y, s) => box(x, y, 34 * s, 52 * s, '#e8c030', '#c02020', 'ХЛОПЬЯ'),
    (x, y, s) => box(x, y, 26 * s, 30 * s, '#a01818', '#e0c060', 'ЧАЙ'),
    (x, y, s) => { c.fillStyle = '#3a1c0a'; c.fillRect(x, y - 40 * s, 22 * s, 40 * s); c.fillStyle = '#c03018'; c.fillRect(x - 1, y - 44 * s, 24 * s, 7 * s); label(x, y - 26 * s, 22 * s, 12 * s, '#e0b050', '#3a1c0a', 'КОФЕ'); },
    (x, y, s) => box(x, y, 40 * s, 12 * s, '#5a2080', '#c0a0e0', 'ШОКОЛАД'),
    (x, y, s) => box(x, y, 40 * s, 12 * s, '#b01818', '#f0d080', 'АЛЁНКА'),
    (x, y, s) => box(x, y, 36 * s, 20 * s, '#d09040', '#704010', 'ПЕЧЕНЬЕ'),
    (x, y, s) => bag(x, y, 30 * s, 44 * s, '#f0c010', 'ЧИПСЫ'),
    (x, y, s) => bag(x, y, 30 * s, 44 * s, '#d02020', 'ЧИПСЫ'),
    (x, y, s) => bag(x, y, 30 * s, 44 * s, '#2050c0', 'СУХАРИКИ'),
    (x, y, s) => box(x, y, 26 * s, 40 * s, '#f0e0c0', '#c03020', 'МАКАРОНЫ'),
    (x, y, s) => box(x, y, 26 * s, 36 * s, '#c08040', '#603010', 'ГРЕЧКА'),
    (x, y, s) => box(x, y, 24 * s, 34 * s, '#f8f8f8', '#3070c0', 'САХАР'),
    (x, y, s) => { c.fillStyle = '#b07030'; c.beginPath(); c.ellipse(x + 22 * s, y - 14 * s, 22 * s, 14 * s, 0, PI, TAU); c.lineTo(x + 44 * s, y); c.lineTo(x, y); c.fill(); c.strokeStyle = '#704010'; c.lineWidth = 2; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 11 * s, y - 24 * s); c.lineTo(x + k * 11 * s + 6, y - 10 * s); c.stroke(); } },
    (x, y, s) => { c.fillStyle = '#c8b8a0'; c.fillRect(x, y - 14 * s, 44 * s, 14 * s); c.fillStyle = '#f4ece0'; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + (5 + k * 8.5) * s, y - 15 * s, 4 * s, 5 * s, 0, 0, TAU); c.fill(); } },
    (x, y, s) => { c.fillStyle = '#e8e0d0'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6 * s, y - 34 * s); c.lineTo(x + 26 * s, y - 34 * s); c.lineTo(x + 30 * s, y); c.fill(); label(x + 6 * s, y - 24 * s, 20 * s, 10 * s, '#d02020', '#fff', 'ЛАПША'); },
    (x, y, s) => { c.fillStyle = '#7a1c18'; c.fillRect(x, y - 12 * s, 50 * s, 12 * s); c.fillStyle = '#c0a090'; c.beginPath(); c.arc(x + 50 * s, y - 6 * s, 6 * s, -PI / 2, PI / 2); c.fill(); },
    (x, y, s) => { c.fillStyle = '#f0c840'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 34 * s, y); c.lineTo(x + 34 * s, y - 20 * s); c.closePath(); c.fill(); },
    (x, y, s) => { c.fillStyle = '#f8f8f8'; for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) c.fillRect(x + k * 16 * s, y - (j + 1) * 18 * s, 15 * s, 17 * s); label(x, y - 22 * s, 32 * s, 8 * s, '#40a0e0', '#fff', 'МЯГКАЯ'); },
    (x, y, s) => box(x, y, 30 * s, 40 * s, '#f0f0f0', '#e04080', 'ПОРОШОК'),
    (x, y, s) => box(x, y, 16 * s, 24 * s, '#3050a0', '#fff', 'СОЛЬ'),
    (x, y, s) => { c.fillStyle = 'rgba(200,220,230,.7)'; c.fillRect(x, y - 36 * s, 28 * s, 36 * s); for (let k = 0; k < 9; k++) { c.fillStyle = ['#e02020', '#20a040', '#f0c010', '#2060e0'][k & 3]; c.beginPath(); c.arc(x + (6 + (k % 3) * 8) * s, y - (8 + (k / 3 | 0) * 10) * s, 4 * s, 0, TAU); c.fill(); } c.fillStyle = '#c00'; c.fillRect(x - 1, y - 40 * s, 30 * s, 5 * s); },
  ];
  // a shop window from inside: a warm lit back, shelves of goods, a fridge glowing at the side, price tags
  const shelves = (w, h, rows, n0, warm) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, warm ? '#e8dcc4' : '#d8e4e8'); g.addColorStop(1, warm ? '#9c8c74' : '#8898a0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const rh = h / rows; let gi = n0;
    for (let r = 0; r < rows; r++) {
      const y = (r + 1) * rh - 10, s = rh / 80;
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y - rh + 14, w, rh - 18);
      let x = 6;
      while (x < w - 20) {
        const f = GOODS[gi % GOODS.length], n = 2 + (rnd() * 3 | 0);
        for (let k = 0; k < n && x < w - 20; k++) { c.save(); f(x, y, s); c.restore(); x += [26, 26, 26, 22, 22, 20, 24, 18, 26, 26, 24, 24, 24, 18, 18, 16, 28, 22, 22, 38, 30, 26, 44, 44, 40, 34, 34, 34, 30, 30, 28, 48, 48, 34, 54, 38, 36, 34, 20, 32][gi % GOODS.length] * s + 4; }
        x += 6; gi++;
      }
      c.fillStyle = '#d8d8d8'; c.fillRect(0, y, w, 8); c.fillStyle = '#f4e040'; for (let k = 10; k < w; k += 70) c.fillRect(k, y + 1, 26, 6);
    }
    return gi;
  };
  cell('shopWin', 768, 288, (w, h) => { shelves(w, h, 4, 0, true); });
  cell('kioskWinA', 384, 192, (w, h) => { shelves(w, h, 3, 3, true); });
  cell('kioskWinB', 384, 192, (w, h) => { shelves(w, h, 3, 17, false); });
  cell('pharmWin', 768, 288, (w, h) => {
    c.fillStyle = '#e8f0ec'; c.fillRect(0, 0, w, h); const rh = h / 4;
    for (let r = 0; r < 4; r++) {
      const y = (r + 1) * rh - 10;
      for (let x = 8; x < w - 40;) { const bw = rr(28, 60), bh = rr(30, rh - 24), col = pick(['#f4f4f4', '#e04040', '#4080e0', '#40b060', '#f0c030', '#a060c0']); c.fillStyle = col; c.fillRect(x, y - bh, bw, bh); c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(x + 3, y - bh * 0.6, bw - 6, bh * 0.2); x += bw + 4; }
      c.fillStyle = '#c8d0cc'; c.fillRect(0, y, w, 8);
    }
    c.fillStyle = 'rgba(40,160,80,.85)'; c.fillRect(w * 0.38, 20, w * 0.24, 50); c.fillStyle = '#fff'; c.font = `bold 34px ${FN}`; c.textAlign = 'center'; c.fillText('СКИДКИ', w / 2, 58);
  });
  pack();
  return { cv, R };
}

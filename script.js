(function () {
  const root = document.body;
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");
  const prefersLight = window.matchMedia(
    "(prefers-color-scheme: light)",
  ).matches;
  let theme = prefersLight ? "light" : "dark";
  function applyTheme() {
    root.setAttribute("data-theme", theme);
    sunIcon.style.display = theme === "dark" ? "block" : "none";
    moonIcon.style.display = theme === "dark" ? "none" : "block";
  }
  applyTheme();
  document.getElementById("themeToggle").addEventListener("click", function () {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
  });

  const miniArt = document.getElementById("snakeMiniArt");
  const miniCells = [];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("i");
    miniArt.appendChild(c);
    miniCells.push(c);
  }
  const minisnakeBody = [12, 13, 14, 15, 23];
  minisnakeBody.forEach((i) => miniCells[i].classList.add("on"));
  miniCells[16].classList.add("food");

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  window.showToast = showToast;

  function setView(name) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + name).classList.add("active");
  }

  window.goHub = function () {
    setView("hub");
    SnakeGame.pauseGame();
  };

  window.openGame = function (name) {
    setView(name);
    if (name === "snake") {
      SnakeGame.start();
    } else if (name === "t2048") {
      Game2048.ensureInit();
    }
  };

  const SnakeGame = (function () {
    const GRID = 20;
    const CELL = 30;
    const canvas = document.getElementById("snakeCanvas");
    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("snakeOverlay");
    const overlayTitle = document.getElementById("snakeOverlayTitle");
    const overlayText = document.getElementById("snakeOverlayText");
    const scoreEl = document.getElementById("snakeScore");
    const bestEl = document.getElementById("snakeBest");

    let snake,
      dir,
      nextDir,
      food,
      score,
      best = 0,
      running,
      paused,
      over,
      acc,
      lastTs,
      moveInterval,
      particles;

    function reset() {
      snake = [
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 },
        { x: 6, y: 10 },
      ];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      over = false;
      paused = false;
      acc = 0;
      moveInterval = 140;
      particles = [];
      food = spawnFood();
      scoreEl.textContent = "0";
      overlay.classList.remove("show");
    }

    function spawnFood() {
      let p;
      do {
        p = {
          x: Math.floor(Math.random() * GRID),
          y: Math.floor(Math.random() * GRID),
        };
      } while (snake.some((s) => s.x === p.x && s.y === p.y));
      return p;
    }

    function spawnParticles(cx, cy) {
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2.4;
        particles.push({
          x: cx * CELL + CELL / 2,
          y: cy * CELL + CELL / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: Math.random() > 0.5 ? "#ffd166" : "#3fe7c8",
        });
      }
    }

    function setDirection(dx, dy) {
      if (dx === -dir.x && dy === -dir.y) return;
      nextDir = { x: dx, y: dy };
    }
    window.snakeSetDir = setDirection;

    function update() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        return endGame();
      }
      const willEat = head.x === food.x && head.y === food.y;
      const bodyToCheck = willEat ? snake : snake.slice(0, snake.length - 1);
      if (bodyToCheck.some((s) => s.x === head.x && s.y === head.y)) {
        return endGame();
      }
      snake.unshift(head);
      if (willEat) {
        score += 10;
        scoreEl.textContent = String(score);
        spawnParticles(food.x, food.y);
        food = spawnFood();
        moveInterval = Math.max(60, 140 - Math.floor(score / 30) * 6);
      } else {
        snake.pop();
      }
    }

    function endGame() {
      over = true;
      best = Math.max(best, score);
      bestEl.textContent = String(best);
      overlayTitle.textContent = "بازی تمام شد";
      overlayText.textContent = "امتیاز نهایی: " + score;
      overlay.classList.add("show");
    }

    function drawRoundedRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function draw(ts) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle =
        getComputedStyle(document.body).getPropertyValue("--bg-soft") ||
        "#15123a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(canvas.width, i * CELL);
        ctx.stroke();
      }

      const pulse = 2 + Math.sin(ts / 180) * 2.4;
      ctx.save();
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(
        food.x * CELL + CELL / 2,
        food.y * CELL + CELL / 2,
        CELL / 2 - 3 + pulse * 0.15,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.045;
      });
      particles = particles.filter((p) => p.life > 0);
      particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const t = i / Math.max(1, snake.length - 1);
        const isHead = i === 0;
        const col1 = [63, 231, 200];
        const col2 = [18, 140, 200];
        const cr = Math.round(col1[0] + (col2[0] - col1[0]) * t);
        const cg = Math.round(col1[1] + (col2[1] - col1[1]) * t);
        const cb = Math.round(col1[2] + (col2[2] - col1[2]) * t);
        ctx.fillStyle = isHead ? "#3fe7c8" : `rgb(${cr},${cg},${cb})`;
        drawRoundedRect(
          s.x * CELL + 2,
          s.y * CELL + 2,
          CELL - 4,
          CELL - 4,
          isHead ? 9 : 7,
        );
        ctx.fill();
        if (isHead) {
          ctx.fillStyle = "#0e0c22";
          const ex = dir.x,
            ey = dir.y;
          const baseX = s.x * CELL + CELL / 2;
          const baseY = s.y * CELL + CELL / 2;
          const offX = ex * 5 + ey * 6;
          const offY = ey * 5 + ex * 6;
          ctx.beginPath();
          ctx.arc(
            baseX + offX - ey * 5,
            baseY + offY + ex * 5,
            2.6,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            baseX + offX + ey * 5,
            baseY + offY - ex * 5,
            2.6,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }

    function loop(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      if (!paused && !over) {
        acc += delta;
        while (acc >= moveInterval) {
          update();
          acc -= moveInterval;
          if (over) break;
        }
      }
      draw(ts);
      requestAnimationFrame(loop);
    }

    function start() {
      reset();
      running = true;
      lastTs = 0;
      requestAnimationFrame(loop);
    }

    function pauseGame() {
      paused = true;
    }

    function togglePause() {
      if (over) return;
      paused = !paused;
    }

    let touchStart = null;
    canvas.addEventListener("pointerdown", (e) => {
      touchStart = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointerup", (e) => {
      if (!touchStart) return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? 1 : -1, 0);
      } else {
        setDirection(0, dy > 0 ? 1 : -1);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (!document.getElementById("view-snake").classList.contains("active"))
        return;
      const k = e.key.toLowerCase();
      if (["arrowup", "w"].includes(k)) setDirection(0, -1);
      else if (["arrowdown", "s"].includes(k)) setDirection(0, 1);
      else if (["arrowleft", "a"].includes(k)) setDirection(-1, 0);
      else if (["arrowright", "d"].includes(k)) setDirection(1, 0);
      else if (k === " ") {
        e.preventDefault();
        togglePause();
      }
    });

    window.restartSnake = function () {
      reset();
    };

    return { start, pauseGame };
  })();

  const Game2048 = (function () {
    const boardEl = document.getElementById("board2048");
    const overlay = document.getElementById("t2048Overlay");
    const overlayTitle = document.getElementById("t2048OverlayTitle");
    const overlayText = document.getElementById("t2048OverlayText");
    const overlayBtn = document.getElementById("t2048OverlayBtn");
    const scoreEl = document.getElementById("t2048Score");
    const bestEl = document.getElementById("t2048Best");

    let tiles = [];
    let nextId = 1;
    let score = 0;
    let best = 0;
    let hasWon = false;
    let initialized = false;
    const elements = new Map();

    function valueClass(v) {
      if (v <= 2048) return "v" + v;
      return "v-big";
    }

    function buildBackground() {
      boardEl.querySelectorAll(".cell-bg").forEach((c) => c.remove());
      const size = boardEl.clientWidth;
      const gap =
        parseFloat(getComputedStyle(boardEl).getPropertyValue("--gap")) || 10;
      const pad = 10;
      const cell = (size - pad * 2 - gap * 3) / 4;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const div = document.createElement("div");
          div.className = "cell-bg";
          div.style.width = cell + "px";
          div.style.height = cell + "px";
          div.style.left = pad + c * (cell + gap) + "px";
          div.style.top = pad + r * (cell + gap) + "px";
          boardEl.appendChild(div);
        }
      }
    }

    function getCellMetrics() {
      const size = boardEl.clientWidth;
      const gap =
        parseFloat(getComputedStyle(boardEl).getPropertyValue("--gap")) || 10;
      const pad = 10;
      const cell = (size - pad * 2 - gap * 3) / 4;
      return { cell, gap, pad };
    }

    function positionTile(el, row, col) {
      const m = getCellMetrics();
      el.style.width = m.cell + "px";
      el.style.height = m.cell + "px";
      el.style.transform = `translate(${m.pad + col * (m.cell + m.gap)}px, ${m.pad + row * (m.cell + m.gap)}px)`;
      let fontSize = m.cell * 0.4;
      if (fontSize < 14) fontSize = 14;
      if (fontSize > 36) fontSize = 36;
      const value = parseInt(el.textContent);
      if (value >= 1000) fontSize = fontSize * 0.7;
      else if (value >= 500) fontSize = fontSize * 0.8;
      else if (value >= 100) fontSize = fontSize * 0.9;
      el.style.fontSize = fontSize + "px";
    }

    function render() {
      tiles.forEach((t) => {
        let el = elements.get(t.id);
        if (!el) {
          el = document.createElement("div");
          el.className = "tile";
          boardEl.appendChild(el);
          elements.set(t.id, el);
          if (t.isNew) {
            requestAnimationFrame(() => {
              positionTile(el, t.row, t.col);
              el.classList.add("tile-new");
            });
          }
        }
        el.className =
          "tile " + valueClass(t.value) + (t.justMerged ? " tile-merged" : "");
        el.textContent = t.value;
        positionTile(el, t.row, t.col);
      });
      elements.forEach((el, id) => {
        if (!tiles.find((t) => t.id === id)) {
          el.remove();
          elements.delete(id);
        }
      });
    }

    function buildGrid() {
      const grid = Array.from({ length: 4 }, () => Array(4).fill(null));
      tiles.forEach((t) => {
        if (!t.toRemove) grid[t.row][t.col] = t;
      });
      return grid;
    }

    function emptyCells(grid) {
      const list = [];
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) if (!grid[r][c]) list.push({ r, c });
      return list;
    }

    function spawnTile() {
      const grid = buildGrid();
      const cells = emptyCells(grid);
      if (!cells.length) return;
      const spot = cells[Math.floor(Math.random() * cells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;
      tiles.push({
        id: nextId++,
        value,
        row: spot.r,
        col: spot.c,
        isNew: true,
        toRemove: false,
        justMerged: false,
        mergedThisMove: false,
      });
    }

    function updateScoreUI() {
      scoreEl.textContent = String(score);
      bestEl.textContent = String(best);
    }

    function canMoveAnywhere(grid) {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const cur = grid[r][c];
          if (!cur) return true;
          const right = c < 3 ? grid[r][c + 1] : null;
          const down = r < 3 ? grid[r + 1][c] : null;
          if (right && right.value === cur.value) return true;
          if (down && down.value === cur.value) return true;
        }
      }
      return false;
    }

    function checkGameState() {
      const grid = buildGrid();
      if (!hasWon && tiles.some((t) => t.value >= 2048)) {
        hasWon = true;
        overlayTitle.textContent = "بردی! 🎉";
        overlayText.textContent = "به کاشی ۲۰۴۸ رسیدی، امتیاز: " + score;
        overlayBtn.textContent = "بازی جدید";
        overlay.classList.add("show");
        return;
      }
      if (!canMoveAnywhere(grid)) {
        best = Math.max(best, score);
        updateScoreUI();
        overlayTitle.textContent = "بازی تمام شد";
        overlayText.textContent = "امتیاز نهایی: " + score;
        overlayBtn.textContent = "دوباره بازی کن";
        overlay.classList.add("show");
      }
    }

    function move(direction) {
      if (overlay.classList.contains("show") && !hasWon) return false;
      const grid = buildGrid();
      let moved = false;
      let scoreGained = 0;
      const vectors = {
        up: { r: -1, c: 0 },
        down: { r: 1, c: 0 },
        left: { r: 0, c: -1 },
        right: { r: 0, c: 1 },
      };
      const v = vectors[direction];
      const rowsOrder = v.r === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
      const colsOrder = v.c === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
      tiles.forEach((t) => {
        t.justMerged = false;
        t.mergedThisMove = false;
        t.toRemove = false;
        t.isNew = false;
      });

      rowsOrder.forEach((r) => {
        colsOrder.forEach((c) => {
          const tile = grid[r][c];
          if (!tile) return;
          let curR = r,
            curC = c;
          let merged = false;
          while (true) {
            const nr = curR + v.r,
              nc = curC + v.c;
            if (nr < 0 || nr > 3 || nc < 0 || nc > 3) break;
            const occ = grid[nr][nc];
            if (!occ) {
              grid[curR][curC] = null;
              curR = nr;
              curC = nc;
              grid[curR][curC] = tile;
              moved = true;
            } else if (
              occ.value === tile.value &&
              !occ.mergedThisMove &&
              occ.id !== tile.id
            ) {
              grid[curR][curC] = null;
              occ.value *= 2;
              occ.mergedThisMove = true;
              occ.justMerged = true;
              tile.toRemove = true;
              tile.row = nr;
              tile.col = nc;
              scoreGained += occ.value;
              moved = true;
              merged = true;
              break;
            } else break;
          }
          if (!merged) {
            tile.row = curR;
            tile.col = curC;
          }
        });
      });

      if (moved) {
        score += scoreGained;
        render();
        window.setTimeout(() => {
          tiles = tiles.filter((t) => !t.toRemove);
          spawnTile();
          render();
          updateScoreUI();
          checkGameState();
        }, 150);
      }
      return moved;
    }

    function reset() {
      boardEl.querySelectorAll(".tile").forEach((t) => t.remove());
      elements.clear();
      tiles = [];
      score = 0;
      hasWon = false;
      overlay.classList.remove("show");
      buildBackground();
      spawnTile();
      spawnTile();
      render();
      updateScoreUI();
    }

    function ensureInit() {
      if (!initialized) {
        initialized = true;
        buildBackground();
        reset();
        window.addEventListener("resize", () => {
          buildBackground();
          render();
        });
        let touchStart = null;
        boardEl.addEventListener("pointerdown", (e) => {
          touchStart = { x: e.clientX, y: e.clientY };
        });
        boardEl.addEventListener("pointerup", (e) => {
          if (!touchStart) return;
          const dx = e.clientX - touchStart.x;
          const dy = e.clientY - touchStart.y;
          touchStart = null;
          if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            move(dx > 0 ? "right" : "left");
          } else {
            move(dy > 0 ? "down" : "up");
          }
        });
        window.addEventListener("keydown", (e) => {
          if (
            !document.getElementById("view-t2048").classList.contains("active")
          )
            return;
          const k = e.key.toLowerCase();
          const map = {
            arrowup: "up",
            w: "up",
            arrowdown: "down",
            s: "down",
            arrowleft: "left",
            a: "left",
            arrowright: "right",
            d: "right",
          };
          if (map[k]) {
            e.preventDefault();
            move(map[k]);
          }
        });
      } else {
        buildBackground();
        render();
      }
    }

    window.restart2048 = function () {
      reset();
    };

    return { ensureInit };
  })();
})();

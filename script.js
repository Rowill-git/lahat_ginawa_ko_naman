// ---------- State ----------
const SIZE = 4;
let grid = []; // grid[row][col] = number | null
let score = 0;
let best = Number(localStorage.getItem("2048-best")) || 0;
let gameOver = false;
let won = false;

// ---------- DOM refs ----------
const gridBg = document.getElementById("gridBg");
const tilesLayer = document.getElementById("tilesLayer");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlayMessage");
const newGameBtn = document.getElementById("newGameBtn");
const overlayBtn = document.getElementById("overlayBtn");

// ---------- Setup ----------
function buildBackgroundCells() {
  gridBg.innerHTML = "";
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    gridBg.appendChild(cell);
  }
}

function createEmptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function startNewGame() {
  grid = createEmptyGrid();
  score = 0;
  gameOver = false;
  won = false;
  overlay.hidden = true;
  // #region agent log
  {
    const cs = overlay ? getComputedStyle(overlay) : null;
    fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'A',location:'script.js:startNewGame',message:'startNewGame after overlay.hidden=true',data:{overlayExists:!!overlay,hiddenProp:overlay&&overlay.hidden,hasHiddenAttr:overlay&&overlay.hasAttribute('hidden'),computedDisplay:cs&&cs.display,computedVisibility:cs&&cs.visibility,computedOpacity:cs&&cs.opacity,computedBg:cs&&cs.backgroundColor,offsetHeight:overlay&&overlay.offsetHeight},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
  spawnTile();
  spawnTile();
  render();
}

// ---------- Spawning ----------
function spawnTile() {
  const empties = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === null) empties.push([r, c]);
    }
  }
  if (empties.length === 0) return;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

// ---------- Rendering ----------
function render() {
  tilesLayer.innerHTML = "";
  const cellSize = getCellSize();
  const gap = getGap();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (value === null) continue;

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.value = value >= 2048 ? "2048" : String(value);
      tile.textContent = value;
      tile.style.top = `${r * (cellSize + gap)}px`;
      tile.style.left = `${c * (cellSize + gap)}px`;
      tilesLayer.appendChild(tile);
    }
  }

  scoreEl.textContent = score;
  bestEl.textContent = best;
}

function getCellSize() {
  return parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--cell-size"),
  );
}

function getGap() {
  return parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--gap"),
  );
}

// ---------- Move logic ----------
// Slides + merges a single row to the left. Returns { row, gained }.
function slideRowLeft(row) {
  const values = row.filter((v) => v !== null);
  const merged = [];
  let gained = 0;

  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const mergedValue = values[i] * 2;
      merged.push(mergedValue);
      gained += mergedValue;
      i++; // skip the tile we just merged into this one
    } else {
      merged.push(values[i]);
    }
  }

  while (merged.length < SIZE) merged.push(null);
  return { row: merged, gained };
}

function rotateGridClockwise(g) {
  const result = createEmptyGrid();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      result[c][SIZE - 1 - r] = g[r][c];
    }
  }
  return result;
}

// Normalizes any direction to "move left" by rotating, then rotates back.
function move(direction) {
  if (gameOver) return;

  let rotations = 0;
  if (direction === "up") rotations = 3;
  if (direction === "right") rotations = 2;
  if (direction === "down") rotations = 1;

  let working = grid;
  for (let i = 0; i < rotations; i++) working = rotateGridClockwise(working);

  let moved = false;
  let gainedTotal = 0;
  const newGrid = [];

  for (let r = 0; r < SIZE; r++) {
    const { row, gained } = slideRowLeft(working[r]);
    if (!rowsEqual(row, working[r])) moved = true;
    gainedTotal += gained;
    newGrid.push(row);
  }

  working = newGrid;
  const remainingRotations = (4 - rotations) % 4;
  for (let i = 0; i < remainingRotations; i++)
    working = rotateGridClockwise(working);

  if (!moved) return;

  grid = working;
  score += gainedTotal;
  if (score > best) {
    best = score;
    localStorage.setItem("2048-best", String(best));
  }

  spawnTile();
  render();
  checkWin();
  checkGameOver();
}

function rowsEqual(a, b) {
  return a.every((val, i) => val === b[i]);
}

// ---------- End states ----------
function checkWin() {
  if (won) return;
  const hasWinningTile = grid.some((row) => row.some((v) => v === 2048));
  if (hasWinningTile) {
    won = true;
    showOverlay("you win!");
  }
}

function checkGameOver() {
  const hasEmpty = grid.some((row) => row.some((v) => v === null));
  if (hasEmpty) return;

  const canMerge = grid.some((row, r) =>
    row.some((v, c) => {
      const right = grid[r][c + 1];
      const down = r + 1 < SIZE ? grid[r + 1][c] : undefined;
      return v === right || v === down;
    }),
  );

  if (!canMerge) {
    gameOver = true;
    showOverlay("game over");
  }
}

function showOverlay(message) {
  overlayMessage.textContent = message;
  overlay.hidden = false;
  // #region agent log
  {
    const cs = overlay ? getComputedStyle(overlay) : null;
    fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'B',location:'script.js:showOverlay',message:'showOverlay called',data:{message,hiddenProp:overlay&&overlay.hidden,hasHiddenAttr:overlay&&overlay.hasAttribute('hidden'),computedDisplay:cs&&cs.display,computedBg:cs&&cs.backgroundColor,gameOver,won},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
}

// ---------- Input: keyboard ----------
const KEY_TO_DIRECTION = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

document.addEventListener("keydown", (e) => {
  const direction = KEY_TO_DIRECTION[e.key];
  if (!direction) return;
  e.preventDefault();
  move(direction);
});

// ---------- Input: swipe ----------
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;

document.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'F',location:'script.js:touchstart',message:'touchstart',data:{scrollY:window.scrollY,targetTag:e.target&&e.target.tagName,targetClass:e.target&&e.target.className,defaultPrevented:e.defaultPrevented},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
});

document.addEventListener("touchmove", (e) => {
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'F',location:'script.js:touchmove',message:'touchmove page still scrolling',data:{scrollY:window.scrollY,cancelable:e.cancelable,defaultPrevented:e.defaultPrevented},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
});

document.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'G',location:'script.js:touchend',message:'touchend after swipe',data:{dx,dy,scrollY:window.scrollY,scrollHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight,bodyOverflow:getComputedStyle(document.body).overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow,boardTouchAction:getComputedStyle(document.querySelector('.board-wrap')).touchAction},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? "right" : "left");
  } else {
    move(dy > 0 ? "down" : "up");
  }
});

// ---------- Buttons ----------
newGameBtn.addEventListener("click", () => {
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'C',location:'script.js:newGameBtn',message:'newGameBtn clicked',data:{gameOver,won,overlayHiddenBefore:overlay&&overlay.hidden},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  startNewGame();
});
overlayBtn.addEventListener("click", () => {
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'D',location:'script.js:overlayBtn',message:'try again clicked',data:{gameOver,won,overlayHiddenBefore:overlay&&overlay.hidden},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  startNewGame();
});

// ---------- Init ----------
buildBackgroundCells();
startNewGame();
// #region agent log
{
  const cs = overlay ? getComputedStyle(overlay) : null;
  fetch('http://127.0.0.1:7523/ingest/6578738d-4ffa-45d7-89b1-cb0875f45209',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a0adb6'},body:JSON.stringify({sessionId:'a0adb6',runId:'pre-fix',hypothesisId:'E',location:'script.js:init',message:'init overlay and viewport',data:{hiddenProp:overlay&&overlay.hidden,computedDisplay:cs&&cs.display,computedBg:cs&&cs.backgroundColor,clientWidth:overlay&&overlay.clientWidth,clientHeight:overlay&&overlay.clientHeight,scrollHeight:document.documentElement.scrollHeight,innerHeight:window.innerHeight,bodyOverflow:getComputedStyle(document.body).overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow,boardTouchAction:getComputedStyle(document.querySelector('.board-wrap')).touchAction,overscrollBehavior:getComputedStyle(document.body).overscrollBehavior},timestamp:Date.now()})}).catch(()=>{});
}
// #endregion

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const jumpButton = document.getElementById("jumpButton");
const slideButton = document.getElementById("slideButton");

const W = canvas.width;
const H = canvas.height;
const GROUND_Y = 286;
const STORAGE_KEY = "mike-dash-high-score";

const spriteSheet = new Image();
spriteSheet.src = "assets/mike-chan-sprite.png";

const SPRITES = {
  run: [
    { x: 36, y: 194, w: 180, h: 127 },
    { x: 239, y: 200, w: 166, h: 114 },
    { x: 437, y: 194, w: 157, h: 124 },
    { x: 625, y: 205, w: 157, h: 119 },
    { x: 800, y: 194, w: 162, h: 119 },
    { x: 988, y: 194, w: 168, h: 119 },
    { x: 1181, y: 197, w: 152, h: 120 },
    { x: 1360, y: 205, w: 153, h: 119 }
  ],
  jump: [
    { x: 55, y: 461, w: 159, h: 125 },
    { x: 252, y: 469, w: 143, h: 108 },
    { x: 431, y: 473, w: 165, h: 117 }
  ],
  land: { x: 703, y: 459, w: 182, h: 125 },
  slide: { x: 1015, y: 490, w: 209, h: 90 },
  idle: { x: 56, y: 700, w: 152, h: 124 },
  gameOver: { x: 330, y: 731, w: 213, h: 89 },
  blink: [
    { x: 651, y: 726, w: 158, h: 99 },
    { x: 856, y: 726, w: 157, h: 99 }
  ]
};

const OBSTACLE_SPRITES = {
  cactus: { x: 68, y: 902, w: 71, h: 88 },
  smallCactus: { x: 205, y: 920, w: 89, h: 70 },
  bird: { x: 351, y: 915, w: 82, h: 63 },
  yarn: { x: 494, y: 917, w: 58, h: 59 },
  box: { x: 621, y: 907, w: 84, h: 83 },
  dog: { x: 762, y: 898, w: 92, h: 92 }
};

const player = {
  x: 92,
  y: GROUND_Y,
  w: 82,
  h: 62,
  vy: 0,
  onGround: true,
  sliding: false,
  slideMs: 0,
  runFrame: 0,
  animMs: 0
};

let state = "title";
let lastTime = 0;
let score = 0;
let displayScore = 0;
let highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
let speed = 240;
let spawnMs = 0;
let nextSpawnMs = 1400;
let obstacles = [];
let clouds = [];
let groundOffset = 0;
let blinkMs = 0;

highScoreEl.textContent = padScore(highScore);
scoreEl.textContent = padScore(0);

function resetGame() {
  state = "playing";
  score = 0;
  displayScore = 0;
  speed = 240;
  spawnMs = 0;
  nextSpawnMs = 1350;
  obstacles = [];
  clouds = makeClouds();
  groundOffset = 0;
  Object.assign(player, {
    y: GROUND_Y,
    vy: 0,
    onGround: true,
    sliding: false,
    slideMs: 0,
    runFrame: 0,
    animMs: 0
  });
}

function makeClouds() {
  return [
    { x: 210, y: 84, w: 54 },
    { x: 520, y: 52, w: 76 },
    { x: 820, y: 104, w: 46 }
  ];
}

function update(dt) {
  if (state !== "playing") {
    blinkMs += dt * 1000;
    return;
  }

  const seconds = dt;
  score += seconds * 10;
  displayScore = Math.floor(score);
  speed = 240 + Math.min(180, score * 0.55);
  const bgSpeed = speed * (0.35 + Math.min(0.25, Math.floor(score / 100) * 0.03));
  groundOffset = (groundOffset + bgSpeed * seconds) % 32;

  scoreEl.textContent = padScore(displayScore);

  player.animMs += dt * 1000;
  const runRate = Math.max(68, 120 - score * 0.12);
  if (player.animMs >= runRate) {
    player.runFrame = (player.runFrame + 1) % SPRITES.run.length;
    player.animMs = 0;
  }

  if (!player.onGround) {
    player.vy += 1280 * seconds;
    player.y += player.vy * seconds;
    if (player.y >= GROUND_Y) {
      player.y = GROUND_Y;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.sliding) {
    player.slideMs -= dt * 1000;
    if (player.slideMs <= 0) {
      player.sliding = false;
    }
  }

  spawnMs += dt * 1000;
  if (spawnMs >= nextSpawnMs) {
    spawnObstacle();
    spawnMs = 0;
    const minGap = Math.max(760, 1260 - score * 2.2);
    const maxGap = Math.max(1000, 1700 - score * 2.6);
    nextSpawnMs = rand(minGap, maxGap);
  }

  for (const cloud of clouds) {
    cloud.x -= bgSpeed * 0.22 * seconds;
    if (cloud.x + cloud.w < 0) {
      cloud.x = W + rand(30, 180);
      cloud.y = rand(48, 122);
      cloud.w = rand(42, 78);
    }
  }

  for (const obstacle of obstacles) {
    obstacle.x -= speed * seconds;
  }
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.w > -30);

  const playerHit = getPlayerHitbox();
  for (const obstacle of obstacles) {
    if (intersects(playerHit, getObstacleHitbox(obstacle))) {
      gameOver();
      break;
    }
  }
}

function spawnObstacle() {
  const pool = [
    { type: "cactus", score: 0 },
    { type: "smallCactus", score: 0 },
    { type: "box", score: 80 },
    { type: "bird", score: 150 },
    { type: "dog", score: 240 },
    { type: "yarn", score: 320 }
  ].filter((item) => score >= item.score);

  const picked = pool[Math.floor(Math.random() * pool.length)].type;
  const base = {
    cactus: { w: 46, h: 62, y: GROUND_Y - 62 },
    smallCactus: { w: 38, h: 44, y: GROUND_Y - 44 },
    box: { w: 46, h: 42, y: GROUND_Y - 42 },
    bird: { w: 48, h: 36, y: GROUND_Y - rand(100, 142) },
    dog: { w: 58, h: 44, y: GROUND_Y - 44 },
    yarn: { w: 38, h: 38, y: GROUND_Y - 38 }
  }[picked];

  obstacles.push({
    type: picked,
    x: W + 20,
    w: base.w,
    h: base.h,
    y: base.y
  });
}

function gameOver() {
  state = "gameover";
  highScore = Math.max(highScore, displayScore);
  localStorage.setItem(STORAGE_KEY, String(highScore));
  highScoreEl.textContent = padScore(highScore);
}

function jump() {
  if (state === "title" || state === "gameover") {
    resetGame();
    return;
  }
  if (state !== "playing" || !player.onGround) return;

  player.sliding = false;
  player.vy = -590;
  player.onGround = false;
}

function slide(active = true) {
  if (state !== "playing" || !active || !player.onGround) return;
  player.sliding = true;
  player.slideMs = 430;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  drawClouds();
  drawGround();
  if (state === "gameover") {
    for (const obstacle of obstacles) drawObstacle(obstacle);
    drawPlayer();
  } else {
    drawPlayer();
    for (const obstacle of obstacles) drawObstacle(obstacle);
  }

  if (state === "title") {
    drawCenterText("Mike Dash", "Press Space or Tap to Start");
  } else if (state === "gameover") {
    drawCenterText("Game Over", "Press Space or Tap to Restart");
  }
}

function drawPlayer() {
  let frame = SPRITES.idle;
  let dw = player.w;
  let dh = player.h;
  let dy = player.y - dh;

  if (state === "gameover") {
    frame = SPRITES.gameOver;
    dw = 96;
    dh = 44;
    dy = GROUND_Y - dh + 2;
  } else if (player.sliding) {
    frame = SPRITES.slide;
    dw = 102;
    dh = 46;
    dy = GROUND_Y - dh + 4;
  } else if (!player.onGround) {
    frame = player.vy < -120 ? SPRITES.jump[0] : player.vy < 160 ? SPRITES.jump[1] : SPRITES.jump[2];
  } else if (state === "playing") {
    frame = SPRITES.run[player.runFrame];
  } else if (Math.floor(blinkMs / 650) % 5 === 4) {
    frame = SPRITES.blink[0];
  }

  drawSprite(frame, player.x, dy, dw, dh);
}

function drawObstacle(obstacle) {
  const frame = OBSTACLE_SPRITES[obstacle.type];
  if (frame) {
    drawSprite(frame, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    return;
  }

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;
  ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
}

function drawSprite(frame, x, y, w, h) {
  if (!spriteSheet.complete) {
    ctx.strokeStyle = "#333";
    ctx.strokeRect(x, y, w, h);
    return;
  }
  ctx.drawImage(spriteSheet, frame.x, frame.y, frame.w, frame.h, x, y, w, h);
}

function drawGround() {
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 1);
  ctx.lineTo(W, GROUND_Y + 1);
  ctx.stroke();

  ctx.fillStyle = "#bbb";
  for (let x = -groundOffset; x < W; x += 32) {
    if (Math.floor((x + groundOffset) / 32) % 3 !== 1) {
      ctx.fillRect(x, GROUND_Y + 12, 12, 2);
    }
  }
}

function drawClouds() {
  ctx.strokeStyle = "#c6c6c6";
  ctx.lineWidth = 2;
  for (const cloud of clouds.length ? clouds : makeClouds()) {
    ctx.beginPath();
    ctx.moveTo(cloud.x, cloud.y + 14);
    ctx.lineTo(cloud.x + cloud.w, cloud.y + 14);
    ctx.stroke();
  }
}

function drawCenterText(title, subtitle) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.font = "700 44px ui-monospace, monospace";
  ctx.fillText(title, W / 2, 128);
  ctx.font = "18px ui-monospace, monospace";
  ctx.fillStyle = "#666";
  ctx.fillText(subtitle, W / 2, 166);
  ctx.restore();
}

function getPlayerHitbox() {
  if (player.sliding) {
    return { x: player.x + 16, y: GROUND_Y - 32, w: 74, h: 26 };
  }
  return { x: player.x + 14, y: player.y - player.h + 10, w: 52, h: 46 };
}

function getObstacleHitbox(obstacle) {
  const insetX = obstacle.type === "bird" ? 9 : 7;
  const insetY = obstacle.type === "smallCactus" ? 5 : 8;
  return {
    x: obstacle.x + insetX,
    y: obstacle.y + insetY,
    w: obstacle.w - insetX * 2,
    h: obstacle.h - insetY * 1.5
  };
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function padScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(5, "0");
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function frame(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  } else if (event.code === "ArrowDown") {
    event.preventDefault();
    slide(true);
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown") {
    player.sliding = false;
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
});

jumpButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
});

slideButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  slide(true);
});

slideButton.addEventListener("pointerup", () => {
  player.sliding = false;
});

spriteSheet.addEventListener("load", draw);
clouds = makeClouds();
requestAnimationFrame(frame);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

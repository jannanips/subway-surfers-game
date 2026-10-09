const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('overlayTitle');
const textEl = document.getElementById('overlayText');
const startButton = document.getElementById('startButton');
const controlButtons = document.querySelectorAll('.control-btn');

const laneX = [canvas.width * 0.32, canvas.width * 0.5, canvas.width * 0.68];
const playerBaseY = canvas.height - 110;
const gravity = 0.7;

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem('subway-best') || 0),
  speed: 6,
  spawnTimer: 1200,
  coinTimer: 850,
  lastFrame: 0,
};

const player = {
  lane: 1,
  jumpOffset: 0,
  jumpVel: 0,
  sliding: false,
  slideTimer: 0,
};

const obstacles = [];
const coins = [];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setBest() {
  bestEl.textContent = Math.floor(state.best);
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  setBest();
}

function showOverlay(title, message, buttonText = 'Start Run') {
  titleEl.textContent = title;
  textEl.textContent = message;
  startButton.textContent = buttonText;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.speed = 6;
  state.spawnTimer = 900;
  state.coinTimer = 850;
  state.lastFrame = 0;

  player.lane = 1;
  player.jumpOffset = 0;
  player.jumpVel = 0;
  player.sliding = false;
  player.slideTimer = 0;

  obstacles.length = 0;
  coins.length = 0;

  hideOverlay();
  updateHud();
}

function moveLane(direction) {
  if (!state.running) return;
  player.lane = clamp(player.lane + direction, 0, 2);
}

function jump() {
  if (!state.running || player.jumpOffset > 0 || player.sliding) return;
  player.jumpVel = 11.5;
}

function slide() {
  if (!state.running || player.jumpOffset > 0) return;
  player.sliding = true;
  player.slideTimer = 34;
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * 3);
  const roll = Math.random();

  let type = 'barrier';
  if (roll < 0.35) type = 'barrier';
  else if (roll < 0.7) type = 'train';
  else type = 'lowbar';

  obstacles.push({
    lane,
    type,
    y: -120,
    w: type === 'train' ? 86 : 74,
    h: type === 'train' ? 120 : type === 'lowbar' ? 38 : 70,
  });
}

function spawnCoin() {
  const lane = Math.floor(Math.random() * 3);
  coins.push({
    lane,
    y: -30,
    r: 12,
  });
}

function handleCollisions() {
  const playerY = playerBaseY - player.jumpOffset;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    const obsY = obs.y + obs.h * 0.5;

    if (Math.abs(obsY - playerY) < 42 && obs.lane === player.lane) {
      const safeJump = obs.type === 'barrier' && player.jumpOffset > 42;
      const safeSlide = obs.type === 'lowbar' && player.sliding;
      const safeTrain = obs.type === 'train' && player.jumpOffset > 52;

      if (!(safeJump || safeSlide || safeTrain)) {
        state.running = false;
        state.best = Math.max(state.best, Math.floor(state.score));
        localStorage.setItem('subway-best', String(state.best));
        updateHud();
        showOverlay('Crash!', `You scored ${Math.floor(state.score)}. Hit restart to run again.`, 'Restart Run');
        return;
      }
    }
  }

  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    const coinY = coin.y;
    if (coin.lane === player.lane && Math.abs(coinY - playerY) < 30) {
      coins.splice(i, 1);
      state.score += 10;
      updateHud();
    }
  }
}

function update(delta) {
  if (!state.running) return;

  state.score += delta * 0.7;
  state.speed = Math.min(15, 6 + state.score / 150);
  state.spawnTimer -= delta * 16;
  state.coinTimer -= delta * 16;

  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = 1000 - Math.min(350, state.score * 0.7) + Math.random() * 200;
  }

  if (state.coinTimer <= 0) {
    spawnCoin();
    state.coinTimer = 700 + Math.random() * 460;
  }

  if (player.jumpVel !== 0 || player.jumpOffset > 0) {
    player.jumpOffset += player.jumpVel * delta;
    player.jumpVel -= gravity * delta;

    if (player.jumpOffset <= 0) {
      player.jumpOffset = 0;
      player.jumpVel = 0;
    }
  }

  if (player.sliding) {
    player.slideTimer -= delta;
    if (player.slideTimer <= 0) {
      player.sliding = false;
    }
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.y += (state.speed + 1.2) * delta;

    if (obs.y > canvas.height + 120) {
      obstacles.splice(i, 1);
    }
  }

  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.y += (state.speed + 0.8) * delta;

    if (coin.y > canvas.height + 40) {
      coins.splice(i, 1);
    }
  }

  handleCollisions();
  updateHud();
}

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#7cc8ff');
  sky.addColorStop(0.38, '#dfeeff');
  sky.addColorStop(1, '#f7efd7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 80;
    const y = 70 + ((i % 2) * 30);
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.arc(x + 18, y + 8, 24, 0, Math.PI * 2);
    ctx.arc(x - 18, y + 8, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(100, 122, 166, 0.22)';
  for (let i = 0; i < 8; i++) {
    const x = 20 + i * 52;
    const h = 90 + (i % 3) * 45;
    ctx.fillRect(x, canvas.height - 220 - h, 24, h);
    ctx.fillRect(x + 8, canvas.height - 240 - h, 6, 18);
  }
}

function drawRoad() {
  ctx.fillStyle = '#2e3144';
  ctx.beginPath();
  ctx.moveTo(120, 110);
  ctx.lineTo(300, 110);
  ctx.lineTo(420, 700);
  ctx.lineTo(0, 700);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1d212d';
  ctx.fillRect(0, 680, canvas.width, 20);

  for (let i = 1; i < 3; i++) {
    const x = (laneX[i] - laneX[0]) * (i / 3) + 30;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120 + i * 60, 110);
    ctx.lineTo(420 * (i / 3), 700);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 7; i++) {
    const y = 120 + i * 75;
    ctx.beginPath();
    ctx.moveTo(120, y);
    ctx.lineTo(300, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  const x = laneX[player.lane];
  const y = playerBaseY - player.jumpOffset;

  ctx.save();
  ctx.translate(x, y);

  if (player.sliding) {
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(-22, 14, 44, 16);
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(-18, -8, 36, 22);
  } else {
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(-16, -10, 32, 18);
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(-20, -28, 40, 32);
    ctx.fillStyle = '#f7f7ff';
    ctx.fillRect(-8, -34, 16, 12);
  }

  ctx.fillStyle = '#111';
  ctx.fillRect(-24, 18, 10, 26);
  ctx.fillRect(14, 18, 10, 26);

  if (!player.sliding) {
    ctx.fillRect(-18, -42, 12, 18);
    ctx.fillRect(6, -42, 12, 18);
  }

  ctx.restore();
}

function drawBarrier(obs) {
  const x = laneX[obs.lane];
  const y = obs.y;

  ctx.fillStyle = '#ff5c73';
  ctx.fillRect(x - 30, y, 60, obs.h);
  ctx.fillStyle = '#c92c46';
  ctx.fillRect(x - 28, y + 8, 56, 10);
  ctx.fillRect(x - 28, y + obs.h - 18, 56, 10);
}

function drawTrain(obs) {
  const x = laneX[obs.lane];
  const y = obs.y;

  ctx.fillStyle = '#2ec4b6';
  ctx.fillRect(x - 38, y, 76, obs.h);
  ctx.fillStyle = '#1d9e95';
  ctx.fillRect(x - 30, y + 18, 60, 16);
  ctx.fillStyle = '#e9f1ff';
  ctx.fillRect(x - 18, y + 12, 36, 10);
  ctx.fillRect(x - 18, y + 56, 36, 10);
}

function drawLowBar(obs) {
  const x = laneX[obs.lane];
  const y = obs.y + 10;

  ctx.fillStyle = '#f7bf4d';
  ctx.fillRect(x - 40, y, 80, 12);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x - 36, y - 10, 72, 8);
}

function drawCoin(coin) {
  const x = laneX[coin.lane];
  const y = coin.y;

  ctx.fillStyle = '#ffd766';
  ctx.beginPath();
  ctx.arc(x, y, coin.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f7b500';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, coin.r - 3, 0, Math.PI * 2);
  ctx.stroke();
}

function draw() {
  drawSky();
  drawRoad();

  for (const coin of coins) drawCoin(coin);
  for (const obs of obstacles) {
    if (obs.type === 'barrier') drawBarrier(obs);
    if (obs.type === 'train') drawTrain(obs);
    if (obs.type === 'lowbar') drawLowBar(obs);
  }

  drawPlayer();
}

function gameLoop(timestamp) {
  const delta = Math.min(2.4, (timestamp - state.lastFrame || 16.7) / 16.7);
  state.lastFrame = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

startButton.addEventListener('click', resetGame);

controlButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'left') moveLane(-1);
    if (action === 'right') moveLane(1);
    if (action === 'jump') jump();
    if (action === 'slide') slide();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') moveLane(-1);
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') moveLane(1);
  if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' || event.code === 'Space') {
    event.preventDefault();
    if (!state.running) {
      resetGame();
    } else {
      jump();
    }
  }
  if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') slide();
});

setBest();
showOverlay('Subway Suffer', 'Use arrows or buttons to dodge trains and grab coins.');
requestAnimationFrame(gameLoop);

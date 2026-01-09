// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY_BASE = 0.5;
const JUMP_FORCE = -12;
const PLAYER_SPEED = 5;
const LIVES_START = 3;

// Canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// UI elements
const levelIndicator = document.getElementById('level-indicator');
const livesCounter = document.getElementById('lives-counter');
const scoreCounter = document.getElementById('score-counter');
const gameOverScreen = document.getElementById('game-over-screen');
const levelCompleteScreen = document.getElementById('level-complete-screen');
const restartBtn = document.getElementById('restart-btn');
const nextLevelBtn = document.getElementById('next-level-btn');

// Controls
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const jumpBtn = document.getElementById('jump-btn');

// Game state
let gameState = 'playing'; // 'playing', 'gameOver', 'levelComplete'
let currentLevel = 1;
let lives = LIVES_START;
let score = 0;
let shake = 0; // Screen shake intensity
let particles = []; // Particle effects

// Player
let player = {
    x: 100,
    y: 500,
    width: 32,
    height: 32,
    vx: 0,
    vy: 0,
    onGround: false
};

// Levels data (simplified: platforms, enemies, portal)
const levels = [
    // Level 1: Warm Up
    {
        platforms: [{x: 0, y: 550, width: 200, height: 50}, {x: 300, y: 450, width: 200, height: 50}, {x: 600, y: 350, width: 200, height: 50}],
        enemies: [{x: 400, y: 400, width: 32, height: 32, vx: 1}],
        portal: {x: 700, y: 300, width: 50, height: 50},
        gravity: GRAVITY_BASE,
        chaos: 0
    },
    // Level 2: Moving Hell
    {
        platforms: [{x: 0, y: 550, width: 200, height: 50, vx: 2}, {x: 300, y: 450, width: 200, height: 50, vx: -1}, {x: 600, y: 350, width: 200, height: 50, vx: 1}],
        enemies: [{x: 400, y: 400, width: 32, height: 32, vx: 2}],
        portal: {x: 700, y: 300, width: 50, height: 50},
        gravity: GRAVITY_BASE,
        chaos: 1
    },
    // Level 3: Falling Trap
    {
        platforms: [{x: 0, y: 550, width: 200, height: 50, falling: false}, {x: 300, y: 450, width: 200, height: 50, falling: false}, {x: 600, y: 350, width: 200, height: 50, falling: false}],
        enemies: [{x: 400, y: 400, width: 32, height: 32, vx: 3}],
        portal: {x: 700, y: 300, width: 50, height: 50},
        gravity: GRAVITY_BASE + 0.1,
        chaos: 2
    },
    // Level 4: Chaos Mode
    {
        platforms: [{x: 0, y: 550, width: 200, height: 50, vx: Math.random() * 4 - 2}, {x: 300, y: 450, width: 200, height: 50, vx: Math.random() * 4 - 2}, {x: 600, y: 350, width: 200, height: 50, vx: Math.random() * 4 - 2}],
        enemies: [{x: 400, y: 400, width: 32, height: 32, vx: 4}, {x: 200, y: 500, width: 32, height: 32, vx: -3}],
        portal: {x: 700, y: 300, width: 50, height: 50},
        gravity: GRAVITY_BASE + 0.2,
        chaos: 3
    },
    // Level 5: Final Madness
    {
        platforms: [{x: 0, y: 550, width: 150, height: 50, vx: Math.random() * 6 - 3, falling: false}, {x: 300, y: 450, width: 150, height: 50, vx: Math.random() * 6 - 3, falling: false}, {x: 600, y: 350, width: 150, height: 50, vx: Math.random() * 6 - 3, falling: false}],
        enemies: [{x: 400, y: 400, width: 32, height: 32, vx: 5}, {x: 200, y: 500, width: 32, height: 32, vx: -4}, {x: 500, y: 300, width: 32, height: 32, vx: 3}],
        portal: {x: 700, y: 250, width: 50, height: 50},
        gravity: GRAVITY_BASE + 0.3,
        chaos: 4
    }
];

// Input handling
let leftPressed = false;
let rightPressed = false;
let jumpPressed = false;

leftBtn.addEventListener('touchstart', () => leftPressed = true);
leftBtn.addEventListener('touchend', () => leftPressed = false);
rightBtn.addEventListener('touchstart', () => rightPressed = true);
rightBtn.addEventListener('touchend', () => rightPressed = false);
jumpBtn.addEventListener('touchstart', () => jumpPressed = true);
jumpBtn.addEventListener('touchend', () => jumpPressed = false);

// Audio (optional, muted by default)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let muted = true; // Muted by default

function playSound(frequency, duration) {
    if (muted) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Particle system
function createParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + Math.random() * 20 - 10,
            y: y,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * -4,
            life: 30
        });
    }
}

// Collision detection
function collides(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Update game
function update() {
    if (gameState !== 'playing') return;

    const level = levels[currentLevel - 1];

    // Player input
    player.vx = 0;
    if (leftPressed) player.vx = -PLAYER_SPEED;
    if (rightPressed) player.vx = PLAYER_SPEED;
    if (jumpPressed && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        playSound(440, 0.1); // Jump sound
        createParticles(player.x + player.width / 2, player.y + player.height, 5);
    }

    // Apply gravity
    player.vy += level.gravity;
    player.x += player.vx;
    player.y += player.vy;

    // Platform collision
    player.onGround = false;
    level.platforms.forEach(platform => {
        if (platform.vx) platform.x += platform.vx;
        if (collides(player, platform)) {
            if (player.vy > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.vy = 0;
                player.onGround = true;
                shake = 5; // Screen shake
                if (platform.falling) platform.falling = true;
            }
        }
        if (platform.falling) platform.y += 5;
    });

    // Enemy collision and movement
    level.enemies.forEach(enemy => {
        enemy.x += enemy.vx;
        if (enemy.x < 0 || enemy.x > CANVAS_WIDTH - enemy.width) enemy.vx *= -1;
        if (level.chaos > 0 && Math.random() < 0.01) enemy.vx *= -1; // Random direction change
        if (collides(player, enemy)) {
            loseLife();
        }
    });

    // Portal collision
    if (collides(player, level.portal)) {
        levelComplete();
    }

    // Fall off screen
    if (player.y > CANVAS_HEIGHT) {
        loseLife();
    }

    // Particles
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);

    // Screen shake decay
    if (shake > 0) shake -= 0.5;
}

// Render game
function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Screen shake
    ctx.save();
    ctx.translate(Math.random() * shake - shake / 2, Math.random() * shake - shake / 2);

    const level = levels[currentLevel - 1];

    // Draw platforms
    ctx.fillStyle = '#00ff00';
    level.platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));

    // Draw enemies
    ctx.fillStyle = '#ff0000';
    level.enemies.forEach(e => ctx.fillRect(e.x, e.y, e.width, e.height));

    // Draw portal
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(level.portal.x, level.portal.y, level.portal.width, level.portal.height);

    // Draw player
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw particles
    ctx.fillStyle = '#ffffff';
    particles.forEach(p => ctx.fillRect(p.x, p.y, 2, 2));

    ctx.restore();
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Lose life
function loseLife() {
    lives--;
    shake = 10;
    playSound(220, 0.3); // Death sound
    createParticles(player.x + player.width / 2, player.y + player.height, 10);
    if (lives <= 0) {
        gameOver();
    } else {
        resetPlayer();
    }
}

// Reset player
function resetPlayer() {
    player.x = 100;
    player.y = 500;
    player.vx = 0;
    player.vy = 0;
}

// Game over
function gameOver() {
    gameState = 'gameOver';
    document.getElementById('final-score').textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Level complete
function levelComplete() {
    gameState = 'levelComplete';
    score += 100 * currentLevel;
    levelCompleteScreen.classList.remove('hidden');
    playSound(880, 0.5); // Level complete sound
}

// Restart
restartBtn.addEventListener('click', () => {
    currentLevel = 1;
    lives = LIVES_START;
    score = 0;
    resetPlayer();
    gameState = 'playing';
    gameOverScreen.classList.add('hidden');
    updateUI();
});

// Next level
nextLevelBtn.addEventListener('click', () => {
    if (currentLevel < 5) {
        currentLevel++;
        resetPlayer();
        gameState = 'playing';
        levelCompleteScreen.classList.add('hidden');
        updateUI();
    } else {
        gameOver(); // Win the game
    }
});

// Update UI
function updateUI() {
    levelIndicator.textContent = `Level: ${currentLevel}`;
    livesCounter.textContent = `Lives: ${lives}`;
    scoreCounter.textContent = `Score: ${score}`;
}

// Initialize
updateUI();
gameLoop();

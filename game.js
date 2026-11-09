const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const livesDisplay = document.getElementById('lives-display');
const levelDisplay = document.getElementById('level-display');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const victoryScreen = document.getElementById('victory-screen');

const bombsDisplay = document.getElementById('bombs-display');
const bombsElement = document.getElementById('bombs');
const bombBtn = document.getElementById('bomb-btn');
const audioToggle = document.getElementById('audio-toggle');

// --- Feature F-04 / F-06 / F-07: Image Assets ---
const images = {
    player: new Image(),
    enemy: new Image(),
    boss: new Image(),
    boss2: new Image(),
    boss3: new Image(),
    boss4: new Image(),
    boss5: new Image(),
    itemWeapon: new Image(),
    itemHealth: new Image(),
    itemBomb: new Image(),
    itemShieldBlue: new Image(),
    itemShieldRed: new Image(),
    itemHoming: new Image(),
    itemLaser: new Image(),
    itemSpread: new Image()
};

let imagesLoaded = 0;
function processImage(src, callback) {
    let raw = new Image();
    raw.src = src + '?v=' + Date.now();
    raw.onload = () => {
        let tempCanvas = document.createElement('canvas');
        tempCanvas.width = raw.width;
        tempCanvas.height = raw.height;
        let tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(raw, 0, 0);
        let imgData = tCtx.getImageData(0, 0, raw.width, raw.height);
        let data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            // Remove pure white/near-white backgrounds from AI generation
            if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) data[i+3] = 0;
        }
        tCtx.putImageData(imgData, 0, 0);
        let processedImg = new Image();
        processedImg.onload = callback;
        processedImg.src = tempCanvas.toDataURL('image/png');
    };
}

startBtn.innerText = "加载中...";
startBtn.disabled = true;

processImage('assets/player.png', e => { images.player = e.target; checkImages(); });
processImage('assets/enemy.png', e => { images.enemy = e.target; checkImages(); });
processImage('assets/boss.png', e => { images.boss = e.target; checkImages(); });
processImage('assets/boss2.png', e => { images.boss2 = e.target; checkImages(); });
processImage('assets/boss3.png', e => { images.boss3 = e.target; checkImages(); });
processImage('assets/boss4.png', e => { images.boss4 = e.target; checkImages(); });
processImage('assets/boss5.png', e => { images.boss5 = e.target; checkImages(); });
processImage('assets/item_weapon.png', e => { images.itemWeapon = e.target; checkImages(); });
processImage('assets/item_health.png', e => { images.itemHealth = e.target; checkImages(); });
processImage('assets/item_bomb.png', e => { images.itemBomb = e.target; checkImages(); });
processImage('assets/item_shield_blue.png', e => { images.itemShieldBlue = e.target; checkImages(); });
processImage('assets/item_shield_red.png', e => { images.itemShieldRed = e.target; checkImages(); });
processImage('assets/item_homing.png', e => { images.itemHoming = e.target; checkImages(); });
processImage('assets/item_laser.png', e => { images.itemLaser = e.target; checkImages(); });
processImage('assets/item_spread.png', e => { images.itemSpread = e.target; checkImages(); });

function checkImages() {
    imagesLoaded++;
    if(imagesLoaded === 15) {
        startBtn.innerText = "开始游戏";
        startBtn.disabled = false;
    }
}

// --- Feature F-10: Web Audio API Sound Effects & BGM ---
let audioEnabled = false;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    audioToggle.innerText = audioEnabled ? "🔊 音乐: 开" : "🔊 音乐: 关";
    if (audioEnabled) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        startBGM();
    } else {
        stopBGM();
    }
});

let bgmInterval;
function startBGM() {
    if (bgmInterval) return;
    let step = 0;
    const arp = [110, 130.81, 164.81, 196]; // A2, C3, E3, G3
    bgmInterval = setInterval(() => {
        if (!audioEnabled || gameState !== 'PLAYING') return;
        if (step % 4 === 0) playTone(60, 'sine', 0.1, 0.2);
        playTone(arp[step % arp.length] * 2, 'square', 0.1, 0.05);
        step++;
    }, 200);
}
function stopBGM() {
    clearInterval(bgmInterval);
    bgmInterval = null;
}

function playTone(freq, type, duration, vol=0.1) {
    if (!audioEnabled || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    if (type === 'noise') {
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    shoot: () => playTone(800, 'square', 0.1, 0.03),
    enemyShoot: () => playTone(300, 'sawtooth', 0.1, 0.03),
    explode: () => playTone(100, 'noise', 0.3, 0.08),
    shieldHit: () => playTone(600, 'sine', 0.2, 0.1),
    hit: () => playTone(150, 'square', 0.1, 0.05),
    powerup: () => {
        playTone(400, 'sine', 0.1, 0.05);
        setTimeout(() => playTone(800, 'sine', 0.1, 0.05), 100);
    },
    bossExplode: () => playTone(50, 'noise', 1.0, 0.15),
    bombExplode: () => {
        playTone(50, 'noise', 1.5, 0.3);
        setTimeout(() => playTone(100, 'noise', 1.0, 0.2), 200);
    }
};

// --- Game State Vars ---
let gameState = 'START';
let score = 0;
let lastTime = 0;
let animationId;
let currentLevel = 1;
let enemiesKilledThisLevel = 0;
let bossActive = false;
let enemySpawnTimer = 0;
let enemySpawnInterval = 1000;
let highScore = localStorage.getItem('starAssaultHighScore') || 0;
let flashAlpha = 0; // Flash screen effect for Bomb

// Input Handling
let mouseX = canvas.width / 2;
let mouseY = canvas.height - 60;
let isPointerDown = false;

canvas.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    updatePointer(e);
    if (audioCtx.state === 'suspended') audioCtx.resume(); // Chrome policy
});
canvas.addEventListener('pointermove', (e) => {
    if (gameState === 'PLAYING') updatePointer(e);
});
canvas.addEventListener('pointerup', () => isPointerDown = false);
canvas.addEventListener('pointerleave', () => isPointerDown = false);

window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        e.preventDefault();
        triggerBomb();
    }
});
bombBtn.addEventListener('click', triggerBomb);

function updatePointer(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
}
canvas.style.touchAction = 'none';

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// --- Feature F-02: True Object Pooling ---
class ObjectPool {
    constructor(createFn, size) {
        this.pool = Array.from({length: size}, createFn);
    }
    get() {
        return this.pool.find(item => !item.active);
    }
    update(deltaTime) {
        this.pool.forEach(item => { if (item.active) item.update(deltaTime); });
    }
    draw(ctx) {
        this.pool.forEach(item => { if (item.active) item.draw(ctx); });
    }
    clear() {
        this.pool.forEach(item => item.active = false);
    }
}

// --- Entities ---
class Player {
    constructor() {
        this.width = 60; this.height = 60;
        this.speed = 300; this.color = '#0ff';
        this.init();
    }
    init() {
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.lives = 3;
        this.weaponLevel = 1;
        this.weaponType = 'default';
        this.bombs = 3;
        this.shieldType = null;
        this.shieldTimer = 0;
        this.lastShotTime = 0;
        this.cooldown = 150;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
    }
    update(deltaTime) {
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }
        
        if (this.shieldType === 'invincible') {
            this.shieldTimer -= deltaTime;
            if (this.shieldTimer <= 0) this.shieldType = null;
        }

        let targetX = mouseX - this.width / 2;
        let targetY = mouseY - this.height / 2;
        this.x = Math.max(0, Math.min(canvas.width - this.width, targetX));
        this.y = Math.max(0, Math.min(canvas.height - this.height, targetY));
        
        if (performance.now() - this.lastShotTime > this.cooldown) {
            this.shoot();
            this.lastShotTime = performance.now();
        }
    }
    shoot() {
        sfx.shoot();
        if (this.weaponType === 'default') {
            if (this.weaponLevel === 1) {
                let b = bulletsPool.get(); if (b) b.init(this.x + this.width / 2, this.y);
            } else if (this.weaponLevel === 2) {
                let b1 = bulletsPool.get(); if (b1) b1.init(this.x + this.width * 0.25, this.y);
                let b2 = bulletsPool.get(); if (b2) b2.init(this.x + this.width * 0.75, this.y);
            } else {
                let b1 = bulletsPool.get(); if (b1) b1.init(this.x + this.width * 0.25, this.y, -100);
                let b2 = bulletsPool.get(); if (b2) b2.init(this.x + this.width / 2, this.y);
                let b3 = bulletsPool.get(); if (b3) b3.init(this.x + this.width * 0.75, this.y, 100);
            }
        } else if (this.weaponType === 'homing') {
            let count = this.weaponLevel === 1 ? 2 : (this.weaponLevel === 2 ? 3 : 5);
            for(let i=0; i<count; i++) {
                let hb = homingBulletsPool.get();
                if (hb) hb.init(this.x + this.width/2 + (i - (count-1)/2)*15, this.y);
            }
        } else if (this.weaponType === 'laser') {
            let lb = laserBulletsPool.get();
            if (lb) lb.init(this.x + this.width/2, this.y, this.weaponLevel);
        } else if (this.weaponType === 'spread') {
            let count = this.weaponLevel === 1 ? 3 : (this.weaponLevel === 2 ? 5 : 7);
            let spreadAngle = 70 * (Math.PI / 180);
            let startA = - spreadAngle / 2;
            let step = spreadAngle / (count - 1);
            for(let i=0; i<count; i++) {
                let sb = spreadBulletsPool.get();
                let angle = startA + step * i;
                let speed = 600;
                if (sb) sb.init(this.x + this.width/2, this.y, Math.sin(angle)*speed, -Math.cos(angle)*speed);
            }
        }
    }
    draw(ctx) {
        if (this.invulnerable && Math.floor(performance.now() / 100) % 2 === 0) return;
        
        let dx = Math.floor(this.x);
        let dy = Math.floor(this.y);

        if (this.shieldType === 'energy') {
            ctx.beginPath();
            ctx.arc(dx + this.width/2, dy + this.height/2, this.width + 5, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fill();
        } else if (this.shieldType === 'invincible') {
            ctx.beginPath();
            let pulse = Math.sin(performance.now() / 100) * 5 + 5;
            ctx.arc(dx + this.width/2, dy + this.height/2, this.width + 10 + pulse, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fill();
        }
        
        ctx.drawImage(images.player, dx - 10, dy - 10, this.width + 20, this.height + 20);
        
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.moveTo(dx + this.width / 2 - 10, dy + this.height - 5);
        ctx.lineTo(dx + this.width / 2 + 10, dy + this.height - 5);
        let flamePulse = Math.sin(performance.now() / 50) * 5 + 5;
        ctx.lineTo(dx + this.width / 2, dy + this.height + 15 + flamePulse);
        ctx.closePath();
        ctx.fill();
    }
}

class Bullet {
    constructor() { this.active = false; }
    init(x, y, vx = 0) {
        this.x = x; this.y = y; this.vx = vx;
        this.width = 4; this.height = 15;
        this.speed = 600; this.color = '#ff0';
        this.active = true;
    }
    update(deltaTime) {
        this.y -= this.speed * deltaTime / 1000;
        this.x += this.vx * deltaTime / 1000;
        if (this.y < -this.height || this.x < -this.width || this.x > canvas.width) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    }
}

class HomingBullet {
    constructor() { this.active = false; }
    init(x, y) {
        this.x = x; this.y = y; this.vx = 0; this.vy = -400;
        this.width = 6; this.height = 15;
        this.speed = 500; this.color = '#f0f';
        this.active = true;
        this.target = null;
    }
    update(deltaTime) {
        if (!this.target || !this.target.active) {
            let closestDst = Infinity;
            this.target = null;
            enemiesPool.pool.forEach(e => {
                if(e.active) {
                    let dst = Math.hypot(e.x - this.x, e.y - this.y);
                    if(dst < closestDst) { closestDst = dst; this.target = e; }
                }
            });
            bossesPool.pool.forEach(b => {
                if(b.active) {
                    let dst = Math.hypot(b.x - this.x, b.y - this.y);
                    if(dst < closestDst) { closestDst = dst; this.target = b; }
                }
            });
        }
        
        if (this.target && this.target.active) {
            let tx = this.target.x + this.target.width/2;
            let ty = this.target.y + this.target.height/2;
            let angle = Math.atan2(ty - this.y, tx - this.x);
            let desiredVx = Math.cos(angle) * this.speed;
            let desiredVy = Math.sin(angle) * this.speed;
            this.vx += (desiredVx - this.vx) * 5 * (deltaTime/1000);
            this.vy += (desiredVy - this.vy) * 5 * (deltaTime/1000);
            let currentSpeed = Math.hypot(this.vx, this.vy);
            if (currentSpeed > 0) {
                this.vx = (this.vx / currentSpeed) * this.speed;
                this.vy = (this.vy / currentSpeed) * this.speed;
            }
        }
        
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        if (this.y < -this.height || this.x < -this.width || this.x > canvas.width || this.y > canvas.height) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(Math.floor(this.x), Math.floor(this.y));
        ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI/2);
        ctx.fillRect(-this.width/2, -this.height, this.width, this.height);
        ctx.restore();
    }
}

class LaserBullet {
    constructor() { this.active = false; }
    init(x, y, level) {
        this.x = x; this.y = y;
        this.width = level === 1 ? 6 : (level === 2 ? 12 : 20);
        this.height = canvas.height;
        this.color = '#0ff';
        this.active = true;
        this.life = 0.1;
    }
    update(deltaTime) {
        this.life -= deltaTime / 1000;
        if (this.life <= 0) this.active = false;
        if (player) {
            this.x = player.x + player.width / 2;
            this.y = player.y; 
        }
    }
    draw(ctx) {
        let dx = Math.floor(this.x);
        let dy = Math.floor(this.y);
        ctx.fillStyle = `rgba(0, 255, 255, ${Math.min(1.0, this.life * 10)})`;
        ctx.fillRect(Math.floor(dx - this.width/2), 0, this.width, dy);
    }
}

class SpreadBullet {
    constructor() { this.active = false; }
    init(x, y, vx, vy) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.width = 8; this.height = 8;
        this.color = '#0f0';
        this.active = true;
    }
    update(deltaTime) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        if (this.y < -this.height || this.x < -this.width || this.x > canvas.width || this.y > canvas.height) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(Math.floor(this.x), Math.floor(this.y), this.width/2, 0, Math.PI*2);
        ctx.fill();
    }
}

class EnemyBullet {
    constructor() { this.active = false; }
    init(x, y, vx, vy) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.width = 6; this.color = '#f90';
        this.active = true;
    }
    update(deltaTime) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        if (this.y > canvas.height || this.x < 0 || this.x > canvas.width) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width, 0, Math.PI*2);
        ctx.fill();
    }
}

class Enemy {
    constructor() { this.active = false; }
    init() {
        this.width = 60; this.height = 60;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = Math.random() * 100 + 100;
        this.color = '#f00';
        this.angle = 0;
        this.angleSpeed = Math.random() * 0.03 + 0.01;
        this.curve = Math.random() * 0.5;
        this.active = true;
    }
    update(deltaTime) {
        this.y += this.speed * deltaTime / 1000;
        this.x += Math.sin(this.angle) * this.curve * (deltaTime / 16);
        this.angle += this.angleSpeed * (deltaTime / 16);
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
        if (this.y > canvas.height) this.active = false;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(Math.floor(this.x + this.width / 2), Math.floor(this.y + this.height / 2));
        // Removed rotation because the new image natively points downwards
        ctx.drawImage(images.enemy, Math.floor(-this.width / 2 - 10), Math.floor(-this.height / 2 - 10), this.width + 20, this.height + 20);
        ctx.restore();
    }
}

class Boss {
    constructor() { this.active = false; }
    init(level) {
        this.width = 100; this.height = 80;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -this.height;
        this.hp = 50 + level * 50;
        this.maxHp = this.hp;
        this.speedX = 150; this.speedY = 100;
        this.color = '#f00';
        this.state = 'entering';
        this.lastShotTime = 0;
        this.cooldown = Math.max(500, 2000 - level * 200);
        this.level = level;
        this.active = true;
    }
    update(deltaTime) {
        if (this.state === 'entering') {
            this.y += this.speedY * deltaTime / 1000;
            if (this.y >= 50) this.state = 'moving';
        } else if (this.state === 'moving') {
            this.x += this.speedX * deltaTime / 1000;
            if (this.x <= 0 || this.x + this.width >= canvas.width) this.speedX *= -1;
            
            if (performance.now() - this.lastShotTime > this.cooldown) {
                this.shoot();
                this.lastShotTime = performance.now();
            }
        }
    }
    shoot() {
        sfx.enemyShoot();
        const numBullets = 3 + Math.min(4, Math.floor(this.level / 2));
        const startRadian = Math.PI / 4;
        const endRadian = Math.PI * 3 / 4;
        const step = (endRadian - startRadian) / (numBullets - 1);
        for (let i = 0; i < numBullets; i++) {
            let angle = startRadian + step * i;
            let speed = 300;
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            let eb = enemyBulletsPool.get();
            if (eb) eb.init(this.x + this.width / 2, this.y + this.height, vx, vy);
        }
    }
    draw(ctx) {
        let dx = Math.floor(this.x);
        let dy = Math.floor(this.y);
        ctx.save();
        ctx.translate(dx + this.width / 2, dy + this.height / 2);
        ctx.rotate(Math.PI);
        
        let bossImg = images.boss;
        if (this.level === 2) bossImg = images.boss2;
        if (this.level === 3) bossImg = images.boss3;
        if (this.level === 4) bossImg = images.boss4;
        if (this.level >= 5) bossImg = images.boss5;
        
        let scale = this.level === 5 ? 2.0 : 1.5;
        
        ctx.drawImage(bossImg, Math.floor(-this.width / 2 * scale), Math.floor(-this.height / 2 * scale), Math.floor(this.width * scale), Math.floor(this.height * scale));
        ctx.restore();
        
        ctx.fillStyle = '#333';
        ctx.fillRect(dx, Math.floor(dy - 10), Math.floor(this.width), 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(dx, Math.floor(dy - 10), Math.floor(this.width * (this.hp / this.maxHp)), 5);
    }
}

class Item {
    constructor() { this.active = false; }
    init(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.width = 40; this.height = 40;
        this.speed = 100;
        this.pulseAngle = 0;
        this.active = true;
    }
    update(deltaTime) {
        this.y += this.speed * deltaTime / 1000;
        this.pulseAngle += 5 * deltaTime / 1000;
        if (this.y > canvas.height) this.active = false;
    }
    draw(ctx) {
        let scale = 1 + Math.sin(this.pulseAngle) * 0.15;
        ctx.save();
        ctx.translate(Math.floor(this.x + this.width / 2), Math.floor(this.y + this.height / 2));
        ctx.scale(scale, scale);
        
        let targetImg = images.itemWeapon;
        if (this.type === 'health') targetImg = images.itemHealth;
        if (this.type === 'bomb') targetImg = images.itemBomb;
        if (this.type === 'shield_blue') targetImg = images.itemShieldBlue;
        if (this.type === 'shield_red') targetImg = images.itemShieldRed;
        if (this.type === 'homing') targetImg = images.itemHoming;
        if (this.type === 'laser') targetImg = images.itemLaser;
        if (this.type === 'spread') targetImg = images.itemSpread;
        
        ctx.drawImage(targetImg, Math.floor(-this.width / 2 - 5), Math.floor(-this.height / 2 - 5), this.width + 10, this.height + 10);
        ctx.restore();
    }
}

class Particle {
    constructor() { this.active = false; }
    init(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 200;
        this.speedY = (Math.random() - 0.5) * 200;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.active = true;
    }
    update(deltaTime) {
        this.x += this.speedX * deltaTime / 1000;
        this.y += this.speedY * deltaTime / 1000;
        this.life -= this.decay * (deltaTime / 16);
        if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        let p = particlesPool.get();
        if (p) p.init(x, y, color);
    }
}

// Pool instantiation
let player = new Player();
let bulletsPool = new ObjectPool(() => new Bullet(), 100);
let homingBulletsPool = new ObjectPool(() => new HomingBullet(), 150);
let laserBulletsPool = new ObjectPool(() => new LaserBullet(), 5);
let spreadBulletsPool = new ObjectPool(() => new SpreadBullet(), 200);
let enemiesPool = new ObjectPool(() => new Enemy(), 100);
let particlesPool = new ObjectPool(() => new Particle(), 300);
let itemsPool = new ObjectPool(() => new Item(), 20);
let enemyBulletsPool = new ObjectPool(() => new EnemyBullet(), 200);
let bossesPool = new ObjectPool(() => new Boss(), 5);

const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5, speed: Math.random() * 0.05 + 0.01
    });
}

// --- Main Engine ---
function initGame() {
    score = 0;
    currentLevel = 1;
    enemiesKilledThisLevel = 0;
    bossActive = false;
    flashAlpha = 0;
    updateScore();
    updateLevel();
    highScoreElement.innerText = highScore;
    
    player.init();
    updateLives();
    updateBombs();
    
    bulletsPool.clear();
    homingBulletsPool.clear();
    laserBulletsPool.clear();
    spreadBulletsPool.clear();
    enemiesPool.clear();
    particlesPool.clear();
    itemsPool.clear();
    enemyBulletsPool.clear();
    bossesPool.clear();
    
    enemySpawnTimer = 0;
    enemySpawnInterval = 1000;
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function startGame() {
    initGame();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    livesDisplay.classList.remove('hidden');
    levelDisplay.classList.remove('hidden');
    bombsDisplay.classList.remove('hidden');
    bombBtn.classList.remove('hidden');
    audioToggle.classList.remove('hidden');
    
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    if (audioEnabled) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        startBGM();
    }
    gameLoop(lastTime);
}

function gameOver() {
    gameState = 'GAMEOVER';
    finalScoreElement.innerText = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('starAssaultHighScore', highScore);
        highScoreElement.innerText = highScore;
    }
    stopBGM();
    gameOverScreen.classList.remove('hidden');
    victoryScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
    livesDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    bombsDisplay.classList.add('hidden');
    bombBtn.classList.add('hidden');
    cancelAnimationFrame(animationId);
}

function victory() {
    gameState = 'VICTORY';
    document.getElementById('victory-score').innerText = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('starAssaultHighScore', highScore);
        highScoreElement.innerText = highScore;
    }
    stopBGM();
    victoryScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
    livesDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    bombsDisplay.classList.add('hidden');
    bombBtn.classList.add('hidden');
    cancelAnimationFrame(animationId);
}

function updateScore() { scoreElement.innerText = score; }
function updateLives() { livesElement.innerText = player.lives; }
function updateLevel() { levelElement.innerText = currentLevel; }
function updateBombs() { bombsElement.innerText = player.bombs; }

function checkCollision(obj1, obj2) {
    let w1 = obj1.width || 12; let h1 = obj1.height || 12;
    let x1 = obj1.x; let y1 = obj1.y;
    if (obj1.vx !== undefined && obj1.width === 6) { x1 -= 3; y1 -= 3; w1=6; h1=6; }
    
    let w2 = obj2.width || 12; let h2 = obj2.height || 12;
    let x2 = obj2.x; let y2 = obj2.y;
    return (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2);
}

function dealBossDamage(boss, damage) {
    boss.hp -= damage;
    sfx.hit();
    createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, '#ff0', 5);
    
    if (boss.hp <= 0 && boss.active) {
        boss.active = false;
        score += currentLevel * 1000;
        updateScore();
        sfx.bossExplode();
        createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, '#f00', 100);
        
        for(let i=0; i<3; i++) {
             let roll = Math.random();
             let type = 'health';
             if (roll > 0.95) type = 'shield_red';
             else if (roll > 0.85) type = 'shield_blue';
             else if (roll > 0.75) type = 'bomb';
             else if (roll > 0.50) type = 'homing';
             else if (roll > 0.25) type = 'laser';
             else if (roll > 0.0) type = 'spread';
             
             let item = itemsPool.get();
             if (item) item.init(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height, type);
        }
        
        if (currentLevel >= 5) {
            victory();
        } else {
            currentLevel++;
            updateLevel();
            enemiesKilledThisLevel = 0;
            bossActive = false;
            enemySpawnInterval = Math.max(300, 1000 - currentLevel * 100);
            if (player.lives < 5) {
                player.lives++;
                updateLives();
            }
        }
    }
}

function triggerBomb() {
    if (gameState !== 'PLAYING' || player.bombs <= 0 || flashAlpha > 0) return;
    
    player.bombs--;
    updateBombs();
    
    flashAlpha = 1.0;
    sfx.bombExplode();
    
    let killedCount = 0;
    enemiesPool.pool.forEach(enemy => {
        if (enemy.active) {
            enemy.active = false;
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f00', 20);
            score += 10;
            killedCount++;
        }
    });
    enemiesKilledThisLevel += killedCount;
    updateScore();
    
    enemyBulletsPool.clear();
    
    bossesPool.pool.forEach(boss => {
        if (boss.active) {
            dealBossDamage(boss, 200);
        }
    });
}

function takeDamage() {
    if (player.shieldType === 'invincible') return;
    
    if (player.shieldType === 'energy') {
        player.shieldType = null;
        sfx.shieldHit();
        createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#0ff', 40);
        player.invulnerable = true;
        player.invulnerableTimer = 1000;
        return;
    }
    
    player.lives -= 1;
    updateLives();
    sfx.explode();
    createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#0ff', 30);
    
    if (player.lives <= 0) {
        gameOver();
    } else {
        player.invulnerable = true;
        player.invulnerableTimer = 2000;
        player.weaponLevel = Math.max(1, player.weaponLevel - 1);
    }
}

function handleCollisions() {
    let standardBullets = [bulletsPool.pool, homingBulletsPool.pool, spreadBulletsPool.pool];
    standardBullets.forEach(pool => {
        pool.forEach(bullet => {
            if (!bullet.active) return;
            
            enemiesPool.pool.forEach(enemy => {
                if (!enemy.active) return;
                if (checkCollision(bullet, enemy)) {
                    bullet.active = false;
                    enemy.active = false;
                    score += 10;
                    enemiesKilledThisLevel++;
                    updateScore();
                    sfx.explode();
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f00', 15);
                    
                    if (Math.random() < 0.25) {
                        let roll = Math.random();
                        let type = 'weapon';
                        if (roll > 0.95) type = 'shield_red';
                        else if (roll > 0.85) type = 'shield_blue';
                        else if (roll > 0.75) type = 'bomb';
                        else if (roll > 0.50) type = 'homing';
                        else if (roll > 0.25) type = 'laser';
                        else if (roll > 0.0) type = 'spread';
                        let item = itemsPool.get();
                        if (item) {
                            console.log("DROPPED ITEM:", type);
                            item.init(enemy.x + enemy.width / 2 - 10, enemy.y + enemy.height / 2 - 10, type);
                        }
                    }
                }
            });
            
            bossesPool.pool.forEach(boss => {
                if (!boss.active) return;
                if (checkCollision(bullet, boss)) {
                    bullet.active = false;
                    dealBossDamage(boss, 10);
                }
            });
        });
    });

    laserBulletsPool.pool.forEach(laser => {
        if (!laser.active) return;
        let laserBox = { x: laser.x - laser.width/2, y: 0, width: laser.width, height: player.y };
        
        enemiesPool.pool.forEach(enemy => {
            if (!enemy.active) return;
            if (checkCollision(laserBox, enemy)) {
                enemy.active = false;
                score += 10;
                enemiesKilledThisLevel++;
                updateScore();
                sfx.explode();
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f00', 15);
                
                if (Math.random() < 0.15) {
                    let roll = Math.random();
                    let type = 'weapon';
                    if (roll > 0.95) type = 'shield_red';
                    else if (roll > 0.85) type = 'shield_blue';
                    else if (roll > 0.75) type = 'bomb';
                    else if (roll > 0.6) type = 'homing';
                    else if (roll > 0.45) type = 'laser';
                    else if (roll > 0.3) type = 'spread';
                    else if (roll > 0.1) type = 'health';
                    let item = itemsPool.get();
                    if (item) item.init(enemy.x + enemy.width / 2 - 10, enemy.y + enemy.height / 2 - 10, type);
                }
            }
        });
        
        bossesPool.pool.forEach(boss => {
            if (!boss.active) return;
            if (checkCollision(laserBox, boss)) {
                dealBossDamage(boss, 1.5);
            }
        });
    });

    if (!player.invulnerable || player.shieldType === 'invincible') {
        enemiesPool.pool.forEach(enemy => {
            if (!enemy.active) return;
            if (checkCollision(player, enemy)) {
                if (player.shieldType === 'invincible') {
                    enemy.active = false;
                    score += 10;
                    enemiesKilledThisLevel++;
                    updateScore();
                    sfx.explode();
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f00', 15);
                } else {
                    enemy.active = false;
                    takeDamage();
                }
            }
        });
        
        bossesPool.pool.forEach(boss => {
            if (boss.active && checkCollision(player, boss)) {
                if (player.shieldType === 'invincible') {
                    dealBossDamage(boss, 5);
                } else {
                    takeDamage();
                }
            }
        });
        
        enemyBulletsPool.pool.forEach(eb => {
            if (!eb.active) return;
            if (checkCollision(player, eb)) {
                eb.active = false;
                if (player.shieldType !== 'invincible') {
                    takeDamage();
                } else {
                    createExplosion(eb.x, eb.y, '#f90', 5);
                }
            }
        });
    }

    itemsPool.pool.forEach(item => {
        if (!item.active) return;
        if (checkCollision(player, item)) {
            item.active = false;
            sfx.powerup();
            if (item.type === 'weapon') {
                if (player.weaponType === 'default') {
                    if (player.weaponLevel < 3) player.weaponLevel++;
                } else {
                    player.weaponType = 'default';
                    player.weaponLevel = 2;
                }
            } else if (item.type === 'homing') {
                if (player.weaponType !== 'homing') player.weaponLevel = 1;
                player.weaponType = 'homing';
                if (player.weaponLevel < 3) player.weaponLevel++;
            } else if (item.type === 'laser') {
                if (player.weaponType !== 'laser') player.weaponLevel = 1;
                player.weaponType = 'laser';
                if (player.weaponLevel < 3) player.weaponLevel++;
            } else if (item.type === 'spread') {
                if (player.weaponType !== 'spread') player.weaponLevel = 1;
                player.weaponType = 'spread';
                if (player.weaponLevel < 3) player.weaponLevel++;
            } else if (item.type === 'health') {
                if (player.lives < 5) {
                    player.lives++;
                    updateLives();
                }
            } else if (item.type === 'bomb') {
                player.bombs++;
                updateBombs();
            } else if (item.type === 'shield_blue') {
                player.shieldType = 'energy';
            } else if (item.type === 'shield_red') {
                player.shieldType = 'invincible';
                player.shieldTimer = 5000;
            }
            score += 50;
            updateScore();
        }
    });
}

function update(deltaTime) {
    player.update(deltaTime);
    
    let targetKills = currentLevel * 10;
    if (enemiesKilledThisLevel >= targetKills && !bossActive) {
        let noEnemies = !enemiesPool.pool.some(e => e.active);
        if (noEnemies) {
            bossActive = true;
            let b = bossesPool.get();
            if (b) b.init(currentLevel);
        }
    } else if (!bossActive) {
        if (flashAlpha < 0.5) {
            enemySpawnTimer += deltaTime;
            if (enemySpawnTimer > enemySpawnInterval) {
                let e = enemiesPool.get();
                if (e) e.init();
                enemySpawnTimer = 0;
            }
        }
    }
    
    bulletsPool.update(deltaTime);
    homingBulletsPool.update(deltaTime);
    laserBulletsPool.update(deltaTime);
    spreadBulletsPool.update(deltaTime);
    enemiesPool.update(deltaTime);
    bossesPool.update(deltaTime);
    enemyBulletsPool.update(deltaTime);
    particlesPool.update(deltaTime);
    itemsPool.update(deltaTime);
    
    handleCollisions();
}

function render(deltaTime) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        star.y += star.speed * deltaTime;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = star.size / 2.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    itemsPool.draw(ctx);
    particlesPool.draw(ctx);
    bulletsPool.draw(ctx);
    homingBulletsPool.draw(ctx);
    laserBulletsPool.draw(ctx);
    spreadBulletsPool.draw(ctx);
    enemyBulletsPool.draw(ctx);
    enemiesPool.draw(ctx);
    bossesPool.draw(ctx);
    player.draw(ctx);
    
    if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashAlpha -= deltaTime / 1000;
        if (flashAlpha < 0) flashAlpha = 0;
    }
}

function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    update(deltaTime);
    render(deltaTime);
    
    animationId = requestAnimationFrame(gameLoop);
}

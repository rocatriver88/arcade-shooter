const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const livesDisplay = document.getElementById('lives-display');
const levelDisplay = document.getElementById('level-display');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let lastTime = 0;
let animationId;

let player;
let bullets = [];
let enemySpawnTimer = 0;
let enemySpawnInterval = 1000;
let particles = [];
let items = [];

let currentLevel = 1;
let enemiesKilledThisLevel = 0;
let bossActive = false;
let bosses = [];
let enemyBullets = [];

// Input Handling
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false // Space
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key) || e.key === ' ') {
        keys[e.key] = true;
        // Prevent default scrolling for Space and Arrows
        if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1) {
            e.preventDefault();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key) || e.key === ' ') {
        keys[e.key] = false;
    }
});

// Mouse/Touch Handling
let mouseX = canvas.width / 2;
let mouseY = canvas.height - 60;
let isPointerDown = false;

// We use pointer events for both mouse and touch
canvas.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    updatePointer(e);
});

canvas.addEventListener('pointermove', (e) => {
    if (gameState === 'PLAYING') {
        updatePointer(e);
    }
});

canvas.addEventListener('pointerup', (e) => {
    isPointerDown = false;
});

canvas.addEventListener('pointerleave', (e) => {
    isPointerDown = false;
});

function updatePointer(e) {
    const rect = canvas.getBoundingClientRect();
    // Scale pointer coordinates if the canvas is rendered at a different size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
}

// Ensure the default touch actions don't scroll the page on canvas
canvas.style.touchAction = 'none';

// Setup Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.speed = 300; // pixels per second
        this.color = '#0ff';
        this.lastShotTime = 0;
        this.cooldown = 150; // ms
        this.lives = 3;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.weaponLevel = 1;
    }
    
    update(deltaTime) {
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // Direct Mouse/Pointer control (the player lerps/moves towards the pointer directly)
        // Adjust for center of player
        let targetX = mouseX - this.width / 2;
        let targetY = mouseY - this.height / 2;
        
        // Clamp to screen bounds
        this.x = Math.max(0, Math.min(canvas.width - this.width, targetX));
        this.y = Math.max(0, Math.min(canvas.height - this.height, targetY));
        
        // Auto-shoot continuously while playing
        if (performance.now() - this.lastShotTime > this.cooldown) {
            this.shoot();
            this.lastShotTime = performance.now();
        }
    }
    
    shoot() {
        if (this.weaponLevel === 1) {
            bullets.push(new Bullet(this.x + this.width / 2, this.y));
        } else if (this.weaponLevel === 2) {
            bullets.push(new Bullet(this.x + this.width * 0.25, this.y));
            bullets.push(new Bullet(this.x + this.width * 0.75, this.y));
        } else {
            // Level 3 or more: Triple shot
            bullets.push(new Bullet(this.x + this.width * 0.25, this.y, -100)); // Angled left
            bullets.push(new Bullet(this.x + this.width / 2, this.y)); // Center
            bullets.push(new Bullet(this.x + this.width * 0.75, this.y, 100)); // Angled right
        }
    }
    
    draw(ctx) {
        if (this.invulnerable && Math.floor(performance.now() / 100) % 2 === 0) {
            return; // blink effect
        }
        
        // 飞船主体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // 推进器火焰
        if (keys['ArrowUp'] || keys['w']) {
            ctx.fillStyle = '#f90';
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2 - 10, this.y + this.height);
            ctx.lineTo(this.x + this.width / 2 + 10, this.y + this.height);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height + 15 + Math.random() * 10);
            ctx.closePath();
            ctx.fill();
        }
    }
}

class Bullet {
    constructor(x, y, vx = 0) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 15;
        this.speed = 600;
        this.vx = vx;
        this.color = '#ff0';
        this.markedForDeletion = false;
    }
    update(deltaTime) {
        this.y -= this.speed * deltaTime / 1000;
        this.x += this.vx * deltaTime / 1000;
        if (this.y < -this.height || this.x < -this.width || this.x > canvas.width) {
            this.markedForDeletion = true;
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = Math.random() * 100 + 100; // 100-200 px/s
        this.color = '#f00';
        this.markedForDeletion = false;
        
        // Sine wave movement parameters
        this.angle = 0;
        this.angleSpeed = Math.random() * 0.2 + 0.1;
        this.curve = Math.random() * 2;
    }
    
    update(deltaTime) {
        this.y += this.speed * deltaTime / 1000;
        this.x += Math.sin(this.angle) * this.curve * (deltaTime / 16);
        this.angle += this.angleSpeed * (deltaTime / 16);
        
        // Keep in bounds
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
        
        if (this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 200;
        this.speedY = (Math.random() - 0.5) * 200;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.markedForDeletion = false;
    }
    
    update(deltaTime) {
        this.x += this.speedX * deltaTime / 1000;
        this.y += this.speedY * deltaTime / 1000;
        this.life -= this.decay * (deltaTime / 16);
        if (this.life <= 0) {
            this.markedForDeletion = true;
        }
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

class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type; // 'weapon' or 'health'
        this.speed = 100; // moves down slowly
        this.color = type === 'weapon' ? '#f0f' : '#0f0';
        this.markedForDeletion = false;
        this.pulseAngle = 0;
    }
    
    update(deltaTime) {
        this.y += this.speed * deltaTime / 1000;
        this.pulseAngle += 5 * deltaTime / 1000;
        if (this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        
        let scale = 1 + Math.sin(this.pulseAngle) * 0.2;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(scale, scale);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.type === 'weapon') {
            ctx.fillText('W', 0, 0);
        } else {
            ctx.fillText('H', 0, 0);
        }
        
        ctx.restore();
    }
}

class Boss {
    constructor(level) {
        this.width = 100;
        this.height = 80;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -this.height;
        this.hp = 50 + level * 50;
        this.maxHp = this.hp;
        this.speedX = 150;
        this.speedY = 100;
        this.color = '#f00';
        this.markedForDeletion = false;
        
        this.state = 'entering';
        this.lastShotTime = 0;
        this.cooldown = Math.max(500, 2000 - level * 200);
        this.level = level;
    }
    
    update(deltaTime) {
        if (this.state === 'entering') {
            this.y += this.speedY * deltaTime / 1000;
            if (this.y >= 50) {
                this.state = 'moving';
            }
        } else if (this.state === 'moving') {
            this.x += this.speedX * deltaTime / 1000;
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.speedX *= -1;
            }
            
            if (performance.now() - this.lastShotTime > this.cooldown) {
                this.shoot();
                this.lastShotTime = performance.now();
            }
        }
    }
    
    shoot() {
        const numBullets = 3 + Math.min(4, Math.floor(this.level / 2));
        const startRadian = Math.PI / 4;
        const endRadian = Math.PI * 3 / 4;
        const step = (endRadian - startRadian) / (numBullets - 1);
        
        for (let i = 0; i < numBullets; i++) {
            let angle = startRadian + step * i;
            let speed = 300;
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;
            enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height, vx, vy));
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2 + 10, 15, 0, Math.PI*2);
        ctx.fill();
        
        // HP Bar
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.hp / this.maxHp), 5);
    }
}

class EnemyBullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 6;
        this.color = '#f90';
        this.markedForDeletion = false;
    }
    update(deltaTime) {
        this.x += this.vx * deltaTime / 1000;
        this.y += this.vy * deltaTime / 1000;
        if (this.y > canvas.height || this.x < 0 || this.x > canvas.width) {
            this.markedForDeletion = true;
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width, 0, Math.PI*2);
        ctx.fill();
    }
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function initGame() {
    score = 0;
    currentLevel = 1;
    enemiesKilledThisLevel = 0;
    bossActive = false;
    updateScore();
    updateLevel();
    player = new Player();
    updateLives();
    bullets = [];
    enemies = [];
    particles = [];
    items = [];
    bosses = [];
    enemyBullets = [];
    enemySpawnTimer = 0;
    enemySpawnInterval = 1000;
}

function startGame() {
    initGame();
    gameState = 'PLAYING';
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    livesDisplay.classList.remove('hidden');
    levelDisplay.classList.remove('hidden');
    
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    gameLoop(lastTime);
}

function gameOver() {
    gameState = 'GAMEOVER';
    finalScoreElement.innerText = score;
    
    gameOverScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    livesDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    cancelAnimationFrame(animationId);
}

function updateScore() {
    scoreElement.innerText = score;
}

function updateLives() {
    livesElement.innerText = player.lives;
}

function updateLevel() {
    levelElement.innerText = currentLevel;
}

function checkCollision(obj1, obj2) {
    // If it's a circle (like enemy bullet), approximate aabb
    let w1 = obj1.width || obj1.radius * 2 || 12;
    let h1 = obj1.height || obj1.radius * 2 || 12;
    let x1 = obj1.x; let y1 = obj1.y;
    // For bullets drawn from center:
    if (obj1.vx !== undefined && obj1.width === 6) { x1 -= 6/2; y1 -= 6/2; w1=6; h1=6; }
    
    let w2 = obj2.width || obj2.radius * 2 || 12;
    let h2 = obj2.height || obj2.radius * 2 || 12;
    let x2 = obj2.x; let y2 = obj2.y;
    
    return (
        x1 < x2 + w2 &&
        x1 + w1 > x2 &&
        y1 < y2 + h2 &&
        y1 + h1 > y2
    );
}

function update(deltaTime) {
    if (player) player.update(deltaTime);
    
    bullets.forEach(bullet => bullet.update(deltaTime));
    bullets = bullets.filter(bullet => !bullet.markedForDeletion);
    
    enemies.forEach(enemy => enemy.update(deltaTime));
    enemies = enemies.filter(enemy => !enemy.markedForDeletion);
    
    // Spawn enemies or boss
    let targetKills = currentLevel * 10;
    if (enemiesKilledThisLevel >= targetKills && !bossActive) {
        if (enemies.length === 0) {
            bossActive = true;
            bosses.push(new Boss(currentLevel));
        }
    } else if (!bossActive) {
        enemySpawnTimer += deltaTime;
        if (enemySpawnTimer > enemySpawnInterval) {
            enemies.push(new Enemy());
            enemySpawnTimer = 0;
        }
    }
    
    // Update boss & enemy bullets
    bosses.forEach(boss => boss.update(deltaTime));
    bosses = bosses.filter(boss => !boss.markedForDeletion);
    
    enemyBullets.forEach(eb => eb.update(deltaTime));
    enemyBullets = enemyBullets.filter(eb => !eb.markedForDeletion);
    
    // Update particles
    particles.forEach(particle => particle.update(deltaTime));
    particles = particles.filter(particle => !particle.markedForDeletion);
    
    // Update items
    items.forEach(item => item.update(deltaTime));
    items = items.filter(item => !item.markedForDeletion);
    
    // Collision: Bullets vs Enemies
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (!bullet.markedForDeletion && !enemy.markedForDeletion && checkCollision(bullet, enemy)) {
                bullet.markedForDeletion = true;
                enemy.markedForDeletion = true;
                score += 10;
                enemiesKilledThisLevel++;
                updateScore();
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f00', 15);
                
                // Item drop config
                if (Math.random() < 0.15) { // 15% drop chance
                    let type = Math.random() > 0.6 ? 'health' : 'weapon';
                    items.push(new Item(enemy.x + enemy.width / 2 - 10, enemy.y + enemy.height / 2 - 10, type));
                }
            }
        });
        
        // Bullet vs Bosses
        bosses.forEach(boss => {
            if (!bullet.markedForDeletion && !boss.markedForDeletion && checkCollision(bullet, boss)) {
                bullet.markedForDeletion = true;
                boss.hp -= 10;
                createExplosion(bullet.x, bullet.y, '#ff0', 5);
                if (boss.hp <= 0) {
                    boss.markedForDeletion = true;
                    score += currentLevel * 1000;
                    updateScore();
                    createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, '#f00', 100);
                    
                    // Drop multiple items
                    for(let i=0; i<3; i++) {
                         let type = Math.random() > 0.5 ? 'health' : 'weapon';
                         items.push(new Item(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height, type));
                    }
                    
                    // Level Up
                    currentLevel++;
                    updateLevel();
                    enemiesKilledThisLevel = 0;
                    bossActive = false;
                    enemySpawnInterval = Math.max(300, 1000 - currentLevel * 100);
                    // Heal player
                    if (player.lives < 5) {
                        player.lives++;
                        updateLives();
                    }
                }
            }
        });
    });

    // Collision: Player vs Enemies
    if (player && !player.invulnerable) {
        enemies.forEach(enemy => {
            if (!enemy.markedForDeletion && checkCollision(player, enemy)) {
                enemy.markedForDeletion = true;
                player.lives -= 1;
                updateLives();
                createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#0ff', 30);
                
                if (player.lives <= 0) {
                    gameOver();
                } else {
                    player.invulnerable = true;
                    player.invulnerableTimer = 2000; // 2 seconds of invulnerability
                    player.weaponLevel = Math.max(1, player.weaponLevel - 1);
                }
            }
        });
        
        // Player vs Boss / EnemyBullets
        bosses.forEach(boss => {
            if (!boss.markedForDeletion && checkCollision(player, boss)) {
                player.lives -= 1;
                updateLives();
                createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#0ff', 30);
                if (player.lives <= 0) gameOver();
                else {
                    player.invulnerable = true;
                    player.invulnerableTimer = 2000;
                    player.weaponLevel = Math.max(1, player.weaponLevel - 1);
                }
            }
        });
        
        enemyBullets.forEach(eb => {
            if (!eb.markedForDeletion && checkCollision(player, eb)) {
                eb.markedForDeletion = true;
                player.lives -= 1;
                updateLives();
                createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#0ff', 30);
                if (player.lives <= 0) gameOver();
                else {
                    player.invulnerable = true;
                    player.invulnerableTimer = 2000;
                    player.weaponLevel = Math.max(1, player.weaponLevel - 1);
                }
            }
        });
        
        // Collision: Player vs Items
        items.forEach(item => {
            if (!item.markedForDeletion && checkCollision(player, item)) {
                item.markedForDeletion = true;
                if (item.type === 'weapon') {
                    if (player.weaponLevel < 3) player.weaponLevel++;
                } else if (item.type === 'health') {
                    player.lives++;
                    updateLives();
                }
                score += 50;
                updateScore();
            }
        });
    }
}

// Background Stars
const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.05 + 0.01
    });
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render stars
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        star.y += star.speed * (lastTime % 100); // Simple trick, will fix in deltaTime loop
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = star.size / 2.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1; // Reset alpha
    
    // TODO: Render game entities
    items.forEach(item => item.draw(ctx));
    particles.forEach(particle => particle.draw(ctx));
    bullets.forEach(bullet => bullet.draw(ctx));
    enemyBullets.forEach(eb => eb.draw(ctx));
    enemies.forEach(enemy => enemy.draw(ctx));
    bosses.forEach(boss => boss.draw(ctx));
    if (player) player.draw(ctx);
}

function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    update(deltaTime);
    
    // Fix star logic to use deltaTime correctly
    stars.forEach(star => {
        star.y += star.speed * deltaTime;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    render();
    
    animationId = requestAnimationFrame(gameLoop);
}

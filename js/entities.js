/**
 * ==========================================================================
 * NEON STICK: CYBER ARENA - ENTIDADES, JUGADOR, ENEMIGOS Y ARMAS
 * ==========================================================================
 */

// Catalogo de armas disponibles en la armería
const WEAPONS = {
    dagger: {
        id: 'dagger',
        name: 'DAGGER NEON',
        price: 750,
        damageMult: 0.85,
        reachMult: 0.75,
        speed: 1.45,
        color: '#00ffcc',
        desc: 'Súper rápida, bajo consumo y velocidad de ráfaga.'
    },
    sword: {
        id: 'sword',
        name: 'NEON SWORD',
        price: 1500,
        damageMult: 1.5,
        reachMult: 1.35,
        speed: 1.0,
        color: '#00f3ff',
        desc: '+50% Daño, +35% Alcance, hoja de plasma equilibrada.'
    },
    plasma: {
        id: 'plasma',
        name: 'PLASMA BLADE',
        price: 3000,
        damageMult: 2.2,
        reachMult: 1.6,
        speed: 1.1,
        color: '#ff00aa',
        desc: 'Daño devastador con ráfagas y estela de partículas.'
    },
    hammer: {
        id: 'hammer',
        name: 'VOID HAMMER',
        price: 5000,
        damageMult: 3.5,
        reachMult: 1.85,
        speed: 0.65,
        color: '#b000ff',
        desc: 'Poder cósmico destructor y onda expansiva colosal.'
    }
};

/**
 * Clase Partícula para efectos visuales neón
 */
class Particle {
    constructor(x, y, vx, vy, color, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.96;
        this.vy *= 0.96;
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        const progress = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = progress;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Texto flotante para daño, curación y monedas
 */
class FloatingText {
    constructor(x, y, text, color, size = 20) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.vy = -1.6;
        this.life = 45;
        this.maxLife = 45;
    }

    update() {
        this.y += this.vy;
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.font = `900 ${this.size}px 'Orbitron', sans-serif`;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

/**
 * Proyectiles hostiles y especiales
 */
class Projectile {
    constructor(x, y, vx, vy, color, isHostile = true, damage = 5) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.isHostile = isHostile;
        this.damage = damage;
        this.radius = isHostile ? 6 : 9;
        this.active = true;
    }

    update(width) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -60 || this.x > width + 60) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Estela brillante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Clase Jugador (Stickman Neón)
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 30;
        this.height = 65;
        this.hp = 100;
        this.maxHp = 100;
        this.energy = 0;
        this.maxEnergy = 100;

        this.isGrounded = false;
        this.facingRight = true;
        this.isAttacking = false;
        this.attackType = null; // 'light', 'heavy', 'special'
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.hitEnemies = new Set(); // Evita daño múltiple por frame en un solo swing

        this.invulnerableTimer = 0;
        this.animFrame = 0;
        this.weapon = WEAPONS.sword;

        // Articulaciones para animación cinemática
        this.legAngle = 0;
        this.armAngle = 0;
    }

    update(keys, platforms, floorY, arenaWidth) {
        const speed = 5.6;
        this.vx = 0;

        // Movimiento horizontal
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
            this.vx = -speed;
            this.facingRight = false;
        }
        if (keys['d'] || keys['D'] || keys['ArrowRight']) {
            this.vx = speed;
            this.facingRight = true;
        }

        // Salto (W, Flecha Arriba o Barra Espaciadora)
        if ((keys['w'] || keys['W'] || keys['ArrowUp'] || keys[' '] || keys['Space']) && this.isGrounded) {
            this.vy = -13.0;
            this.isGrounded = false;
            sound.playJump();
        }

        // Gravedad e integración física
        this.vy += 0.58;
        this.x += this.vx;
        this.y += this.vy;

        // Límites horizontales de la arena (No salir de pantalla)
        const margin = 25;
        if (this.x < margin) this.x = margin;
        if (this.x > arenaWidth - margin) this.x = arenaWidth - margin;

        // Colisión con el piso
        if (this.y + this.height / 2 >= floorY) {
            this.y = floorY - this.height / 2;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Colisión con plataformas flotantes
        platforms.forEach(p => {
            if (this.vy >= 0 &&
                this.x + 18 > p.x && this.x - 18 < p.x + p.w &&
                this.y + this.height / 2 >= p.y && this.y + this.height / 2 <= p.y + 16) {
                this.y = p.y - this.height / 2;
                this.vy = 0;
                this.isGrounded = true;
            }
        });

        // Decaimiento de invulnerabilidad
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // Temporizador de ataque
        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.hitEnemies.clear();
            }
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Ciclo de animación de caminar
        if (Math.abs(this.vx) > 0.1 && this.isGrounded) {
            this.animFrame += 0.22;
            this.legAngle = Math.sin(this.animFrame) * 0.65;
            this.armAngle = -Math.sin(this.animFrame) * 0.65;
        } else {
            this.legAngle = 0;
            this.armAngle = 0;
        }
    }

    attack(type) {
        if (this.attackCooldown > 0 || this.isAttacking) return false;

        const wSpeed = this.weapon ? this.weapon.speed : 1.0;

        if (type === 'special') {
            if (this.energy < 100) return false;
            this.energy = 0;
            sound.playSpecial();
        } else if (type === 'heavy') {
            sound.playHeavySlash();
        } else {
            sound.playSlash();
        }

        this.isAttacking = true;
        this.attackType = type;
        this.hitEnemies.clear();

        // Duración y enfriamiento calibrados
        this.attackTimer = Math.round(15 / wSpeed);
        this.attackCooldown = Math.round(22 / wSpeed);
        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Parpadeo de invulnerabilidad
        if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }

        const dir = this.facingRight ? 1 : -1;
        const cyan = '#00f3ff';

        ctx.strokeStyle = cyan;
        ctx.shadowColor = cyan;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Cabeza con aura
        ctx.beginPath();
        ctx.arc(0, -22, 9, 0, Math.PI * 2);
        ctx.stroke();

        // Ojo neón estilo visor
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3 * dir, -22, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Torso
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(0, 10);
        ctx.stroke();

        // Piernas articuladas
        const legLen = 18;
        ctx.beginPath();
        // Pierna Izquierda
        ctx.moveTo(0, 10);
        ctx.lineTo(-Math.sin(this.legAngle) * legLen * dir, 10 + Math.cos(this.legAngle) * legLen);
        // Pierna Derecha
        ctx.moveTo(0, 10);
        ctx.lineTo(Math.sin(this.legAngle) * legLen * dir, 10 + Math.cos(this.legAngle) * legLen);
        ctx.stroke();

        // Brazos articulados
        const armX = Math.cos(this.armAngle) * 16 * dir;
        const armY = -7 + Math.sin(this.armAngle) * 10;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(armX, armY);
        ctx.stroke();

        // Renderizado del arma equipada y su estela
        const wColor = this.weapon ? this.weapon.color : cyan;
        const reach = 32 * (this.weapon ? this.weapon.reachMult : 1);

        if (this.isAttacking) {
            ctx.strokeStyle = wColor;
            ctx.shadowColor = wColor;
            ctx.shadowBlur = 24;
            ctx.lineWidth = this.attackType === 'heavy' ? 7 : (this.attackType === 'special' ? 9 : 5);

            const swingRatio = this.attackTimer / 15;
            const slashAngle = swingRatio * Math.PI;
            const wx = armX + Math.cos(slashAngle) * reach * dir;
            const wy = armY - Math.sin(slashAngle) * reach;

            // Hoja del arma
            ctx.beginPath();
            ctx.moveTo(armX, armY);
            ctx.lineTo(wx, wy);
            ctx.stroke();

            // Arco de corte luminoso con estela
            ctx.fillStyle = wColor;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(armX, armY, reach, -Math.PI / 2, Math.PI / 2, !this.facingRight);
            ctx.fill();

            // Onda de choque para ataque especial
            if (this.attackType === 'special') {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(armX, armY, reach * 1.3, -Math.PI / 3, Math.PI / 3, !this.facingRight);
                ctx.stroke();
            }
        } else {
            // Posición de guardia / reposo del arma
            ctx.strokeStyle = wColor;
            ctx.shadowColor = wColor;
            ctx.shadowBlur = 12;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(armX, armY);
            ctx.lineTo(armX + 14 * dir, armY + 12);
            ctx.stroke();
        }

        ctx.restore();
    }
}

/**
 * Clase Enemigo con IA por tipos
 */
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'basic', 'fast', 'heavy', 'special', 'boss'
        this.vx = 0;
        this.vy = 0;
        this.isDead = false;
        this.facingRight = true;
        this.attackCooldown = Math.floor(Math.random() * 20);
        this.isAttacking = false;
        this.attackAnim = 0;

        // Configuración específica según especificaciones y balance
        if (type === 'basic') {
            this.hp = 50; this.maxHp = 50; this.speed = 2.4; this.color = '#ff0055';
            this.width = 25; this.height = 60; this.score = 10;
        } else if (type === 'fast') {
            this.hp = 35; this.maxHp = 35; this.speed = 3.9; this.color = '#ffcc00';
            this.width = 22; this.height = 55; this.score = 10;
        } else if (type === 'heavy') {
            this.hp = 100; this.maxHp = 100; this.speed = 1.35; this.color = '#b000ff';
            this.width = 35; this.height = 75; this.score = 10;
        } else if (type === 'special') {
            this.hp = 70; this.maxHp = 70; this.speed = 2.0; this.color = '#00ff88';
            this.width = 28; this.height = 60; this.score = 10;
        } else if (type === 'boss') {
            this.hp = 400; this.maxHp = 400; this.speed = 2.3; this.color = '#ff00aa';
            this.width = 50; this.height = 110; this.score = 100; this.phase = 1;
        }

        this.animFrame = Math.random() * 10;
    }

    update(player, projectiles, floorY, arenaWidth, onMeleeDamage) {
        if (this.isDead) return;

        const dx = player.x - this.x;
        this.facingRight = dx > 0;
        const dist = Math.abs(dx);

        // Fases del jefe supremo
        if (this.type === 'boss') {
            const ratio = this.hp / this.maxHp;
            if (ratio <= 0.3) this.phase = 3;
            else if (ratio <= 0.6) this.phase = 2;
            else this.phase = 1;

            if (this.phase === 3) this.speed = 3.2;
            else if (this.phase === 2) this.speed = 2.7;
        }

        // Rango de ataque por tipo de enemigo
        const attackRange = (this.type === 'boss') ? 70 : (this.type === 'special' ? 240 : 44);

        if (dist > attackRange) {
            this.vx = this.facingRight ? this.speed : -this.speed;
        } else {
            this.vx = 0;

            // Lógica de ataque cuando está a distancia
            if (this.attackCooldown <= 0) {
                if (this.type === 'special' || (this.type === 'boss' && Math.random() < 0.45)) {
                    // Disparo de plasma a distancia
                    const pSpeed = this.facingRight ? 7.5 : -7.5;
                    projectiles.push(new Projectile(this.x, this.y - 12, pSpeed, 0, this.color, true, 5));
                    this.attackCooldown = this.type === 'boss' ? 40 : 65;
                } else {
                    // Ataque cuerpo a cuerpo telegrafiado
                    this.isAttacking = true;
                    this.attackAnim = 14;
                    this.attackCooldown = this.type === 'fast' ? 40 : (this.type === 'heavy' ? 65 : 50);

                    // Si el jugador está dentro del rango al golpear, recibe daño exacto de 5 HP
                    if (onMeleeDamage && Math.abs(player.x - this.x) < 48) {
                        onMeleeDamage(5);
                    }
                }
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackAnim > 0) {
            this.attackAnim--;
            if (this.attackAnim <= 0) this.isAttacking = false;
        }

        // Gravedad y posición
        this.vy += 0.58;
        this.x += this.vx;
        this.y += this.vy;

        // Límites de pantalla
        const margin = 20;
        if (this.x < margin) this.x = margin;
        if (this.x > arenaWidth - margin) this.x = arenaWidth - margin;

        // Suelo
        if (this.y + this.height / 2 >= floorY) {
            this.y = floorY - this.height / 2;
            this.vy = 0;
        }

        this.animFrame += 0.16;
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        const dir = this.facingRight ? 1 : -1;
        const c = this.type === 'boss' && this.phase === 3 ? '#ff0033' : this.color;

        ctx.strokeStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = this.type === 'boss' ? 22 : 12;
        ctx.lineWidth = this.type === 'heavy' || this.type === 'boss' ? 5 : 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const scale = this.type === 'boss' ? 1.6 : (this.type === 'heavy' ? 1.25 : (this.type === 'fast' ? 0.9 : 1.0));
        const legAngle = Math.sin(this.animFrame) * 0.45;

        // Aura de furia del Jefe en Fase 3
        if (this.type === 'boss' && this.phase === 3) {
            ctx.fillStyle = 'rgba(255, 0, 50, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cabeza
        ctx.beginPath();
        ctx.arc(0, -20 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Ojo amenazante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3 * scale * dir, -20 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Torso
        ctx.beginPath();
        ctx.moveTo(0, -12 * scale);
        ctx.lineTo(0, 10 * scale);
        ctx.stroke();

        // Piernas
        ctx.beginPath();
        ctx.moveTo(0, 10 * scale);
        ctx.lineTo(-Math.sin(legAngle) * 15 * scale * dir, (10 + 15) * scale);
        ctx.moveTo(0, 10 * scale);
        ctx.lineTo(Math.sin(legAngle) * 15 * scale * dir, (10 + 15) * scale);
        ctx.stroke();

        // Brazos y arma / ataque
        ctx.beginPath();
        ctx.moveTo(0, -8 * scale);
        const armReach = (this.isAttacking ? 22 : 13) * scale;
        ctx.lineTo(armReach * dir, (this.isAttacking ? -3 : 2) * scale);
        ctx.stroke();

        // Barra de vida superior para Boss
        if (this.type === 'boss') {
            ctx.restore();
            ctx.save();
            const bWidth = 120;
            const bHeight = 8;
            const barX = this.x - bWidth / 2;
            const barY = this.y - this.height - 24;

            ctx.fillStyle = 'rgba(5, 5, 15, 0.85)';
            ctx.fillRect(barX, barY, bWidth, bHeight);

            ctx.fillStyle = c;
            ctx.shadowColor = c;
            ctx.shadowBlur = 10;
            ctx.fillRect(barX, barY, Math.max(0, (this.hp / this.maxHp)) * bWidth, bHeight);

            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, bWidth, bHeight);
        }

        ctx.restore();
    }
}

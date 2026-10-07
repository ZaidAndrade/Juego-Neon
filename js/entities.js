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
    constructor(x, y, vx, vy, color, isHostile = true, damage = 5, isFalling = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.isHostile = isHostile;
        this.damage = damage;
        this.radius = isHostile ? (isFalling ? 8 : 6) : 9;
        this.active = true;
        this.isFalling = isFalling;
    }

    update(width, floorY = 9999) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -60 || this.x > width + 60 || this.y > floorY + 30 || this.y < -150) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        // Estela vertical si es proyectil meteórico / lluvia de plasma
        if (this.isFalling) {
            const grad = ctx.createLinearGradient(this.x, this.y - 36, this.x, this.y);
            grad.addColorStop(0, 'rgba(255, 0, 85, 0)');
            grad.addColorStop(1, 'rgba(255, 0, 85, 0.7)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius * 1.3, this.y);
            ctx.lineTo(this.x + this.radius * 1.3, this.y);
            ctx.lineTo(this.x, this.y - 38);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isFalling ? 22 : 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Estela brillante interna
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Clase Jugador (Stickman Neón)
 */
class Player {
    constructor(x, y, playerId = 'P1') {
        this.x = x;
        this.y = y;
        this.playerId = playerId;
        this.vx = 0;
        this.vy = 0;
        this.width = 30;
        this.height = 65;
        this.hp = 100;
        this.maxHp = 100;
        this.energy = 0;
        this.maxEnergy = 100;

        this.isGrounded = false;
        this.isCrouching = false;
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

    update(actions, platforms, floorY, arenaWidth) {
        const speed = 5.6;
        this.vx = 0;

        // Movimiento horizontal
        if (actions.moveLeft) {
            this.vx = -speed;
            this.facingRight = false;
        }
        if (actions.moveRight) {
            this.vx = speed;
            this.facingRight = true;
        }

        if (actions.jump && this.isGrounded) {
            this.vy = -13.0;
            this.isGrounded = false;
            sound.playJump();
        }
        this.isCrouching = actions.crouch;

        // Gravedad e integración física
        this.vy += 0.58;
        this.x += this.vx;
        this.y += this.vy;

        // Límites horizontales de la arena (No salir de pantalla)
        const margin = 25;
        if (this.x < margin) this.x = margin;
        if (this.x > arenaWidth - margin) this.x = arenaWidth - margin;

        this.feetOffset = 28;

        // Colisión con el piso base
        if (this.y + this.feetOffset >= floorY) {
            this.y = floorY - this.feetOffset;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Colisión con plataformas flotantes
        platforms.forEach(p => {
            if (this.vy >= 0 &&
                this.x + 18 > p.x && this.x - 18 < p.x + p.w &&
                this.y + this.feetOffset >= p.y && this.y + this.feetOffset <= p.y + 16) {
                this.y = p.y - this.feetOffset;
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
        if (this.isCrouching) {
            ctx.translate(0, 5);
            ctx.scale(1, 0.8);
        }

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

        ctx.save();
        ctx.font = "700 14px 'Orbitron', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = this.playerId === 'P2' ? '#ff00aa' : '#00f3ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillText(this.playerId, this.x, this.y - 43);
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
        this.attackCooldown = Math.floor(Math.random() * 15);
        this.isAttacking = false;
        this.attackAnim = 0;

        // Configuración calibrada de enemigos y jefes con mayor dinamismo
        if (type === 'basic') {
            this.hp = 50; this.maxHp = 50; this.speed = 2.8; this.color = '#ff0055';
            this.width = 25; this.scale = 1.0; this.score = 10;
        } else if (type === 'fast') {
            this.hp = 35; this.maxHp = 35; this.speed = 4.3; this.color = '#ffcc00';
            this.width = 22; this.scale = 0.9; this.score = 10;
        } else if (type === 'heavy') {
            this.hp = 100; this.maxHp = 100; this.speed = 1.6; this.color = '#b000ff';
            this.width = 35; this.scale = 1.25; this.score = 10;
        } else if (type === 'special') {
            this.hp = 70; this.maxHp = 70; this.speed = 2.4; this.color = '#00ff88';
            this.width = 28; this.scale = 1.0; this.score = 10;
        } else if (type === 'boss') {
            this.hp = 400; this.maxHp = 400; this.speed = 2.8; this.color = '#ff00aa';
            this.width = 50; this.scale = 1.6; this.score = 100; this.phase = 1;
            // Estados avanzados de ataque para Jefes: Salto y caída directa al jugador
            this.slamState = 'idle'; // 'idle', 'charge', 'rising', 'falling', 'recovery'
            this.slamTimer = 0;
            this.slamCooldown = 75; // Salto y caída agresiva y rápida
            this.slamTargetX = 0;
            this.slamTargetY = 0;
            this.shockwaveRadius = 0;
            this.meteorCooldown = 110; // Lluvia orbital de plasma más frecuente
        }

        // Medida exacta de los pies respecto al centro geométrico: 25 * scale
        // Esto garantiza que toquen el suelo base de forma 100% matemática sin flotar
        this.feetOffset = 25 * this.scale;
        this.height = this.feetOffset * 2;

        this.animFrame = Math.random() * 10;
    }

    update(player, projectiles, floorY, arenaWidth, onMeleeDamage, platforms = [], particles = null, onScreenShake = null) {
        if (this.isDead) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        this.facingRight = dx > 0;
        const dist = Math.abs(dx);
        const vertDist = Math.abs(dy);

        // =========================================================================
        // MECÁNICAS AVANZADAS DE JEFE SUPREMO
        // =========================================================================
        if (this.type === 'boss') {
            const ratio = this.hp / this.maxHp;
            if (ratio <= 0.3) this.phase = 3;
            else if (ratio <= 0.6) this.phase = 2;
            else this.phase = 1;

            if (this.phase === 3) this.speed = 3.6;
            else if (this.phase === 2) this.speed = 3.1;

            // Decaimiento del efecto visual de onda expansiva en el suelo
            if (this.shockwaveRadius > 0) {
                this.shockwaveRadius += 8.5;
                if (this.shockwaveRadius > 125) {
                    this.shockwaveRadius = 0;
                }
            }

            // -----------------------------------------------------------------
            // ATAQUE DE LLUVIA DE PLASMA QUE CAE DIRECTAMENTE AL JUGADOR
            // -----------------------------------------------------------------
            if (this.meteorCooldown > 0) this.meteorCooldown--;
            if (this.meteorCooldown <= 0 && this.slamState === 'idle') {
                this.meteorCooldown = this.phase === 3 ? 80 : (this.phase === 2 ? 100 : 120);
                sound.playBossAlert();

                // Proyectil que cae verticalmente desde el cielo apuntado al jugador
                const mX = player.x + (Math.random() - 0.5) * 30;
                projectiles.push(new Projectile(mX, -30, (Math.random() - 0.5) * 1.5, 10, '#ff0055', true, 5, true));

                if (this.phase >= 2) {
                    setTimeout(() => {
                        projectiles.push(new Projectile(player.x, -30, 0, 10.5, '#ff0055', true, 5, true));
                    }, 200);
                }
            }

            // -----------------------------------------------------------------
            // ATAQUE DE SALTO Y CAÍDA DIRECTA DEL JEFE SOBRE EL JUGADOR (BOSS SLAM)
            // -----------------------------------------------------------------
            if (this.slamCooldown > 0) this.slamCooldown--;

            // Si el jugador está subido en una plataforma alta, el jefe prepara su caída de inmediato
            if (player.y < this.y - 65 && this.slamCooldown > 20 && this.slamState === 'idle') {
                this.slamCooldown = 18;
            }

            // Iniciar ataque de caída directa
            if (this.slamCooldown <= 0 && this.slamState === 'idle') {
                this.slamState = 'charge';
                this.slamTimer = 16; // Carga telegrafiada rápida
                this.slamTargetX = player.x;
                this.slamTargetY = player.y;
                this.vx = 0;
                sound.playBossCharge();
            }

            // 1. FASE DE CARGA TELEGRAFIADA (Retícula en la posición del jugador)
            if (this.slamState === 'charge') {
                this.slamTimer--;
                this.vx = 0;
                this.slamTargetX = player.x;
                this.slamTargetY = player.y;

                if (particles && Math.random() < 0.7) {
                    particles.push(new Particle(
                        this.x + (Math.random() - 0.5) * 40,
                        this.y + this.feetOffset,
                        (Math.random() - 0.5) * 4, -Math.random() * 6,
                        '#ff0055', 3.5, 18
                    ));
                }

                if (this.slamTimer <= 0) {
                    this.slamState = 'rising';
                    this.vy = -19; // Gran impulso vertical ascendente
                    sound.playJump();
                }
                return;
            }

            // 2. FASE ASCENDENTE (Vuela hacia la posición vertical del jugador)
            if (this.slamState === 'rising') {
                const targetDx = this.slamTargetX - this.x;
                this.vx = targetDx * 0.16;

                if (particles && Math.random() < 0.5) {
                    particles.push(new Particle(this.x, this.y + 40, (Math.random() - 0.5) * 3, 4, '#ff00aa', 4, 16));
                }

                // Cúspide del salto o salida superior de pantalla
                if (this.vy >= -1 || this.y < 80) {
                    this.slamState = 'falling';
                    this.slamTargetX = player.x; // Bloquea la coordenada exacta del jugador
                    this.slamTargetY = player.y;
                    this.x = this.slamTargetX; // Cae directamente alineado al jugador
                    this.vx = 0;
                    this.vy = 25; // Caída meteórica súper veloz
                }
            }

            // 3. FASE DE CAÍDA DIRECTA EN PICADA SOBRE EL JUGADOR
            if (this.slamState === 'falling') {
                this.vx = 0;
                this.vy = 25;

                if (particles) {
                    for (let p = 0; p < 2; p++) {
                        particles.push(new Particle(
                            this.x + (Math.random() - 0.5) * 28,
                            this.y - 25,
                            (Math.random() - 0.5) * 2, -5,
                            '#ff0055', 4.5, 14
                        ));
                    }
                }

                // Aterriza en el suelo base alineado con exactitud
                let landed = false;
                if (this.y + this.feetOffset >= floorY) {
                    this.y = floorY - this.feetOffset;
                    this.vy = 0;
                    landed = true;
                }

                if (landed) {
                    // ¡IMPACTO CONTUNDENTE DIRECTO TRAS LA CAÍDA EN SUELO BASE!
                    this.slamState = 'recovery';
                    this.slamTimer = 12;
                    this.slamCooldown = this.phase === 3 ? 55 : (this.phase === 2 ? 70 : 85);
                    this.shockwaveRadius = 15;
                    sound.playBossSlam();
                    if (onScreenShake) onScreenShake(20);

                    if (particles) {
                        for (let k = 0; k < 26; k++) {
                            const pAng = (k / 26) * Math.PI * 2;
                            particles.push(new Particle(
                                this.x, floorY - 2,
                                Math.cos(pAng) * (5 + Math.random() * 8),
                                Math.sin(pAng) * (2 + Math.random() * 5) - 3,
                                '#ff0055', 4, 30
                            ));
                        }
                    }

                    // DAÑO POR CAÍDA DIRECTA:
                    // Si el jugador no esquivó a tiempo y está en la zona de choque
                    const hitX = Math.abs(player.x - this.x) < 90;
                    const hitY = Math.abs(player.y - this.y) < 60;
                    if (hitX && hitY && onMeleeDamage) {
                        onMeleeDamage(5);
                    }
                    return;
                }
            }

            // 4. FASE DE RECUPERACIÓN TRAS EL IMPACTO
            if (this.slamState === 'recovery') {
                this.slamTimer--;
                this.vx = 0;
                if (this.slamTimer <= 0) {
                    this.slamState = 'idle';
                }
                return;
            }
        }

        // =========================================================================
        // MOVIMIENTO Y ATAQUE VELOZ DE ENEMIGOS
        // =========================================================================
        const attackRange = (this.type === 'boss') ? 80 : (this.type === 'special' ? 240 : 46);

        // Si el jugador está en una plataforma alta fuera del alcance vertical de cuerpo a cuerpo
        const playerOutOfVerticalReach = vertDist > 55 && this.type !== 'special' && this.type !== 'boss';

        if (dist > attackRange || playerOutOfVerticalReach) {
            if (playerOutOfVerticalReach && dist < 50) {
                // Merodear bajo la plataforma sin congelarse en el suelo base
                this.vx = Math.sin(this.animFrame * 0.6) * (this.speed * 0.7);
            } else {
                this.vx = this.facingRight ? this.speed : -this.speed;
            }
        } else {
            this.vx = 0;

            // Lógica de ataque con VELOCIDAD INCREMENTADA
            if (this.attackCooldown <= 0) {
                if (this.type === 'special' || (this.type === 'boss' && Math.random() < 0.45)) {
                    // Disparo de plasma apuntado en 2D a alta velocidad
                    const pSpeed = 9.5;
                    const pDist = Math.hypot(dx, dy) || 1;
                    const pVx = (dx / pDist) * pSpeed;
                    const pVy = (dy / pDist) * pSpeed;
                    projectiles.push(new Projectile(this.x, this.y - 12 * this.scale, pVx, pVy, this.color, true, 5));
                    // Velocidad de recarga acelerada
                    this.attackCooldown = this.type === 'boss' ? 24 : 34;
                } else {
                    // Ataque cuerpo a cuerpo rápido y contundente
                    this.isAttacking = true;
                    this.attackAnim = this.type === 'fast' ? 7 : (this.type === 'heavy' ? 11 : 9);
                    // Cooldowns reducidos a la mitad para mayor velocidad de ataque
                    this.attackCooldown = this.type === 'fast' ? 20 : (this.type === 'heavy' ? 38 : (this.type === 'boss' ? 24 : 28));

                    // =========================================================================
                    // CORRECCIÓN DEFINITIVA DE DAÑO FALSO EN PLATAFORMAS:
                    // Verificación estricta de distancia horizontal Y VERTICAL.
                    // Si el jugador está sobre una plataforma elevada, vertDist superará
                    // el alcance del golpe y no recibirá ningún daño falso.
                    // =========================================================================
                    const maxMeleeX = this.type === 'boss' ? 80 : 50;
                    const maxMeleeY = this.type === 'boss' ? 65 : 40;

                    if (onMeleeDamage && dist < maxMeleeX && vertDist < maxMeleeY) {
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

        // =========================================================================
        // SUELO BASE PRINCIPAL: Todos los enemigos y jefes se alinean perfectamente
        // al suelo base, eliminando cualquier espacio de flotación o anclaje no deseado.
        // =========================================================================
        if (this.y + this.feetOffset >= floorY) {
            this.y = floorY - this.feetOffset;
            this.vy = 0;
        }

        this.animFrame += 0.20;
    }

    draw(ctx) {
        if (this.isDead) return;

        // 1. Dibujar retícula de impacto y advertencia en el suelo/plataforma en coordenadas de mundo
        if (this.type === 'boss' && (this.slamState === 'charge' || this.slamState === 'falling')) {
            ctx.save();
            ctx.strokeStyle = '#ff0055';
            ctx.fillStyle = 'rgba(255, 0, 85, 0.22)';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 2.5;

            const targetY = this.slamTargetY ? this.slamTargetY + 30 : this.y;

            ctx.beginPath();
            ctx.ellipse(this.slamTargetX, targetY, 44, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Cruz de mira láser
            ctx.beginPath();
            ctx.moveTo(this.slamTargetX - 25, targetY);
            ctx.lineTo(this.slamTargetX + 25, targetY);
            ctx.moveTo(this.slamTargetX, targetY - 12);
            ctx.lineTo(this.slamTargetX, targetY + 12);
            ctx.stroke();

            // Texto de advertencia parpadeante
            ctx.font = "900 13px 'Orbitron', sans-serif";
            ctx.fillStyle = '#ff0055';
            ctx.textAlign = 'center';
            ctx.fillText("⚠ IMPACTO ⚠", this.slamTargetX, targetY - 20);
            ctx.restore();
        }

        // 2. Onda expansiva tras el impacto en el suelo base
        if (this.type === 'boss' && this.shockwaveRadius > 0) {
            ctx.save();
            const alpha = Math.max(0, 1 - (this.shockwaveRadius / 125));
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 18;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + this.feetOffset, this.shockwaveRadius, this.shockwaveRadius * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Dibujo de la figura del enemigo perfectamente alineada a sus pies
        ctx.save();
        ctx.translate(this.x, this.y);

        const dir = this.facingRight ? 1 : -1;
        const c = this.type === 'boss' && this.phase === 3 ? '#ff0033' : this.color;

        ctx.strokeStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = this.type === 'boss' ? (this.slamState === 'charge' ? 32 : 22) : 12;
        ctx.lineWidth = this.type === 'heavy' || this.type === 'boss' ? 5 : 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const scale = this.scale || (this.type === 'boss' ? 1.6 : (this.type === 'heavy' ? 1.25 : (this.type === 'fast' ? 0.9 : 1.0)));
        const legAngle = Math.sin(this.animFrame) * 0.45;

        // Aura de furia o carga del Jefe
        if (this.type === 'boss' && (this.phase === 3 || this.slamState === 'charge')) {
            ctx.fillStyle = this.slamState === 'charge' ? 'rgba(255, 0, 85, 0.35)' : 'rgba(255, 0, 50, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, 65, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pose de caída meteórica
        const isDiving = this.type === 'boss' && this.slamState === 'falling';

        // Cabeza
        ctx.beginPath();
        ctx.arc(0, isDiving ? -12 * scale : -20 * scale, 8 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Ojo amenazante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3 * scale * dir, isDiving ? -12 * scale : -20 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Torso
        ctx.beginPath();
        ctx.moveTo(0, isDiving ? -4 * scale : -12 * scale);
        ctx.lineTo(0, isDiving ? 16 * scale : 10 * scale);
        ctx.stroke();

        // Piernas (Las puntas de los pies tocan exactamente 25 * scale)
        ctx.beginPath();
        if (isDiving) {
            // Piernas replegadas hacia atrás en pose de caída aerodinámica
            ctx.moveTo(0, 16 * scale);
            ctx.lineTo(-6 * scale * dir, 6 * scale);
            ctx.moveTo(0, 16 * scale);
            ctx.lineTo(6 * scale * dir, 6 * scale);
        } else {
            ctx.moveTo(0, 10 * scale);
            ctx.lineTo(-Math.sin(legAngle) * 15 * scale * dir, 25 * scale);
            ctx.moveTo(0, 10 * scale);
            ctx.lineTo(Math.sin(legAngle) * 15 * scale * dir, 25 * scale);
        }
        ctx.stroke();

        // Brazos y arma / ataque
        ctx.beginPath();
        if (isDiving) {
            // Brazos apuntando directamente hacia abajo
            ctx.moveTo(0, 0);
            ctx.lineTo(-10 * scale * dir, 25 * scale);
            ctx.moveTo(0, 0);
            ctx.lineTo(10 * scale * dir, 25 * scale);
        } else {
            ctx.moveTo(0, -8 * scale);
            const armReach = (this.isAttacking ? 22 : 13) * scale;
            ctx.lineTo(armReach * dir, (this.isAttacking ? -3 : 2) * scale);
        }
        ctx.stroke();

        // Barra de vida superior para Boss
        if (this.type === 'boss') {
            ctx.restore();
            ctx.save();
            const bWidth = 140;
            const bHeight = 8;
            const barX = this.x - bWidth / 2;
            const barY = this.y - 30 * scale - 24;

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

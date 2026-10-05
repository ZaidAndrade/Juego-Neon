/**
 * ==========================================================================
 * NEON STICK: CYBER ARENA - MOTOR PRINCIPAL DE JUEGO (GAME ENGINE)
 * ==========================================================================
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
        this.previousState = 'MENU';

        this.currentZone = 1; // 1: Cyber City, 2: Neon Factory, 3: Void District, 4: Core of Darkness
        this.currentWave = 1;
        this.maxWaves = 5;

        // Carga de datos persistentes desde localStorage
        this.loadProgress();

        this.orientationDismissed = false;

        // Entidades principales
        this.player = new Player(Math.min(150, this.width * 0.25), this.getFloorY() - 70);
        this.player.weapon = WEAPONS[this.equippedWeapon] || WEAPONS.sword;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.platforms = [];

        // Estado de controles y efectos
        this.keys = {};
        this.screenShake = 0;
        this.damageFlash = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.gameTime = 0;
        this.bossActive = false;

        // Inicialización de subsistemas
        this.initResize();
        this.initInput();
        this.initUI();
        this.setupZonePlatforms();
        this.updateHUD();
    }

    /**
     * Calcula la altura del suelo de manera adaptativa según la pantalla
     */
    getFloorY() {
        if (this.height < 520) {
            // Dispositivos móviles en horizontal: suelo ligeramente más alto para no solapar controles
            return Math.round(this.height - 65);
        } else if (this.width < 600) {
            // Dispositivos móviles en vertical: elevar la arena para dar espacio a los controles táctiles
            return Math.round(this.height * 0.76);
        }
        return this.height - 80;
    }

    /**
     * Respuesta háptica por vibración para celulares
     */
    vibrate(duration = 15) {
        if (window.navigator && window.navigator.vibrate) {
            try { window.navigator.vibrate(duration); } catch (e) {}
        }
    }

    /**
     * Activa o desactiva el modo Pantalla Completa
     */
    toggleFullscreen() {
        const elem = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(() => {});
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    /**
     * Verifica la orientación en dispositivos móviles y muestra sugerencia
     */
    checkOrientation() {
        const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 768);
        const isPortrait = window.innerHeight > window.innerWidth;
        const overlay = document.getElementById('orientation-overlay');
        if (!overlay) return;

        if (isMobile && isPortrait && !this.orientationDismissed) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Ajuste responsivo de la resolución de pantalla
     */
    initResize() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            this.setupZonePlatforms();
            this.checkOrientation();
            this.updateHUD();
        };

        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => {
            setTimeout(resize, 120);
        });

        document.addEventListener('fullscreenchange', () => {
            resize();
            this.updateHUD();
        });

        resize();
    }

    /**
     * Gestión de entradas (Teclado y Táctil Multi-touch)
     */
    initInput() {
        window.addEventListener('keydown', e => {
            // Prevenir scroll involuntario del navegador
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }

            this.keys[e.key] = true;
            this.keys[e.code] = true;

            if (this.state === 'PLAYING') {
                if (e.key === 'j' || e.key === 'J') this.player.attack('light');
                if (e.key === 'k' || e.key === 'K') this.player.attack('heavy');
                if (e.key === 'l' || e.key === 'L') this.player.attack('special');
                if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.pauseGame();
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
            this.keys[e.code] = false;
        });

        // Desbloquear AudioContext al primer toque (imprescindible en iOS Safari y Android Chrome)
        const unlockAudio = () => {
            sound.init();
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('click', unlockAudio);
        };
        window.addEventListener('touchstart', unlockAudio, { passive: true });
        window.addEventListener('click', unlockAudio, { passive: true });

        // SISTEMA MULTI-TOUCH ERGONÓMICO PARA D-PAD HORIZONTAL (Deslizar o pulsar)
        const dpad = document.querySelector('.touch-dpad-horizontal');
        const btnLeft = document.getElementById('btn-touch-left');
        const btnRight = document.getElementById('btn-touch-right');

        const updateDpadTouch = (clientX, clientY) => {
            if (!dpad) return;
            const rect = dpad.getBoundingClientRect();
            // Verificar si el toque está en el D-pad o zona cercana con tolerancia para pulgares
            if (clientX >= rect.left - 20 && clientX <= rect.right + 20 &&
                clientY >= rect.top - 25 && clientY <= rect.bottom + 30) {
                const midX = rect.left + rect.width / 2;
                if (clientX < midX) {
                    this.keys['ArrowLeft'] = true;
                    this.keys['ArrowRight'] = false;
                    btnLeft?.classList.add('active');
                    btnRight?.classList.remove('active');
                } else {
                    this.keys['ArrowRight'] = true;
                    this.keys['ArrowLeft'] = false;
                    btnRight?.classList.add('active');
                    btnLeft?.classList.remove('active');
                }
            }
        };

        const releaseDpad = () => {
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
            btnLeft?.classList.remove('active');
            btnRight?.classList.remove('active');
        };

        if (dpad) {
            let activeDpadTouchId = null;

            dpad.addEventListener('touchstart', e => {
                e.preventDefault();
                sound.init();
                const touch = e.changedTouches[0];
                activeDpadTouchId = touch.identifier;
                updateDpadTouch(touch.clientX, touch.clientY);
                this.vibrate(10);
            }, { passive: false });

            window.addEventListener('touchmove', e => {
                if (activeDpadTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    if (t.identifier === activeDpadTouchId) {
                        updateDpadTouch(t.clientX, t.clientY);
                        break;
                    }
                }
            }, { passive: false });

            const handleDpadEnd = e => {
                if (activeDpadTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeDpadTouchId) {
                        activeDpadTouchId = null;
                        releaseDpad();
                        break;
                    }
                }
            };

            window.addEventListener('touchend', handleDpadEnd, { passive: true });
            window.addEventListener('touchcancel', handleDpadEnd, { passive: true });
        }

        // Configuración de botones de acción táctiles (Salto izquierdo/derecho, Rápido, Pesado, Especial)
        const setupActionTouch = (id, key, actionType) => {
            const el = document.getElementById(id);
            if (!el) return;

            const handleStart = (e) => {
                e.preventDefault();
                sound.init();
                el.classList.add('active');
                this.keys[key] = true;
                this.vibrate(15);

                if (actionType && this.state === 'PLAYING') {
                    this.player.attack(actionType);
                    this.updateHUD();
                }
            };

            const handleEnd = (e) => {
                e.preventDefault();
                el.classList.remove('active');
                this.keys[key] = false;
            };

            el.addEventListener('touchstart', handleStart, { passive: false });
            el.addEventListener('touchend', handleEnd, { passive: false });
            el.addEventListener('touchcancel', handleEnd, { passive: false });

            // Soporte de ratón para pruebas en PC
            el.addEventListener('mousedown', handleStart);
            el.addEventListener('mouseup', handleEnd);
            el.addEventListener('mouseleave', handleEnd);
        };

        // Salto izquierdo y Salto alternativo en mano derecha
        setupActionTouch('btn-touch-jump', 'ArrowUp', null);
        setupActionTouch('btn-touch-jump-alt', 'ArrowUp', null);

        // Botones de Ataque
        setupActionTouch('btn-touch-light', 'j', 'light');
        setupActionTouch('btn-touch-heavy', 'k', 'heavy');
        setupActionTouch('btn-touch-special', 'l', 'special');
    }

    /**
     * Vinculación de botones de la interfaz gráfica
     */
    initUI() {
        // Menú principal
        document.getElementById('btn-play').onclick = () => { sound.init(); this.startGame(); };
        document.getElementById('btn-shop').onclick = () => { sound.init(); this.openShop(); };
        document.getElementById('btn-controls').onclick = () => { sound.init(); this.showOverlay('controls-overlay'); };
        document.getElementById('btn-progress').onclick = () => { sound.init(); this.openProgress(); };
        document.getElementById('btn-reset').onclick = () => { sound.init(); this.resetProgress(); };
        document.getElementById('btn-fullscreen-menu').onclick = () => { sound.init(); this.toggleFullscreen(); };

        // Botones de cierre de ventanas modales
        document.getElementById('btn-close-shop').onclick = () => this.closeShop();
        document.getElementById('btn-close-controls').onclick = () => this.showOverlay('menu-overlay');
        document.getElementById('btn-close-progress').onclick = () => this.showOverlay('menu-overlay');

        // Botones del overlay de sugerencia de rotación
        document.getElementById('btn-orientation-fullscreen').onclick = () => {
            sound.init();
            this.toggleFullscreen();
            this.orientationDismissed = true;
            this.checkOrientation();
        };
        document.getElementById('btn-orientation-continue').onclick = () => {
            sound.init();
            this.orientationDismissed = true;
            this.checkOrientation();
        };

        // Controles de pausa y HUD
        document.getElementById('btn-pause-hud').onclick = () => this.pauseGame();
        document.getElementById('btn-resume').onclick = () => this.resumeGame();
        document.getElementById('btn-fullscreen-hud').onclick = () => this.toggleFullscreen();
        document.getElementById('btn-pause-shop').onclick = () => {
            this.previousState = 'PAUSED';
            this.openShop();
        };
        document.getElementById('btn-quit').onclick = () => {
            sound.stopBGM();
            this.showOverlay('menu-overlay');
            this.state = 'MENU';
        };

        // Reintentos y finalizaciones
        document.getElementById('btn-retry').onclick = () => this.startGame();
        document.getElementById('btn-gameover-menu').onclick = () => {
            sound.stopBGM();
            this.showOverlay('menu-overlay');
            this.state = 'MENU';
        };
        document.getElementById('btn-victory-menu').onclick = () => {
            sound.stopBGM();
            this.showOverlay('menu-overlay');
            this.state = 'MENU';
        };

        // Conmutador de Sonido
        const soundBtn = document.getElementById('btn-sound-toggle');
        soundBtn.onclick = () => {
            sound.init();
            const isEnabled = sound.toggleSound();
            this.updateHUD();
            if (isEnabled && this.state === 'PLAYING') {
                sound.startBGM();
            }
        };
    }

    /**
     * Muestra u oculta overlays de interfaz
     */
    showOverlay(id, hideOthers = true) {
        if (hideOthers) {
            document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        }
        if (id) {
            const target = document.getElementById(id);
            if (target) target.classList.remove('hidden');
        }
    }

    /**
     * Carga de datos persistentes del jugador
     */
    loadProgress() {
        this.coins = parseInt(localStorage.getItem('playerCoins')) || 0;
        try {
            this.purchasedWeapons = JSON.parse(localStorage.getItem('purchasedWeapons')) || ['sword'];
        } catch (e) {
            this.purchasedWeapons = ['sword'];
        }
        this.equippedWeapon = localStorage.getItem('equippedWeapon') || 'sword';
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.totalKills = parseInt(localStorage.getItem('totalEnemiesDefeated')) || 0;
        this.totalBosses = parseInt(localStorage.getItem('totalBossesDefeated')) || 0;
    }

    /**
     * Guarda el progreso en localStorage
     */
    saveProgress() {
        localStorage.setItem('playerCoins', this.coins);
        localStorage.setItem('purchasedWeapons', JSON.stringify(this.purchasedWeapons));
        localStorage.setItem('equippedWeapon', this.equippedWeapon);
        localStorage.setItem('bestScore', this.bestScore);
        localStorage.setItem('totalEnemiesDefeated', this.totalKills);
        localStorage.setItem('totalBossesDefeated', this.totalBosses);
        this.updateHUD();
    }

    /**
     * Reinicio seguro del progreso
     */
    resetProgress() {
        if (confirm("¿Estás seguro de que deseas reiniciar todo tu progreso de juego?")) {
            localStorage.removeItem('playerCoins');
            localStorage.removeItem('purchasedWeapons');
            localStorage.removeItem('equippedWeapon');
            localStorage.removeItem('bestScore');
            localStorage.removeItem('totalEnemiesDefeated');
            localStorage.removeItem('totalBossesDefeated');

            this.coins = 0;
            this.purchasedWeapons = ['sword'];
            this.equippedWeapon = 'sword';
            this.bestScore = 0;
            this.totalKills = 0;
            this.totalBosses = 0;

            if (this.player) {
                this.player.weapon = WEAPONS.sword;
            }

            this.saveProgress();
            alert("Progreso reiniciado correctamente.");
        }
    }

    /**
     * Apertura de la Tienda de Armas Neón
     */
    openShop() {
        const container = document.getElementById('shop-container');
        container.innerHTML = '';
        document.getElementById('shop-coins').innerText = `🪙 ${this.coins}`;

        Object.values(WEAPONS).forEach(w => {
            const isBought = this.purchasedWeapons.includes(w.id);
            const isEquipped = this.equippedWeapon === w.id;

            const card = document.createElement('div');
            card.className = `shop-item ${isEquipped ? 'equipped' : ''}`;
            card.innerHTML = `
                <div class="shop-item-title" style="color:${w.color};">${w.name}</div>
                <div class="shop-item-stats">
                    ${w.desc}
                    <div class="stat-bars-container">
                        <div class="stat-row">
                            <span>Daño:</span>
                            <div class="stat-mini-bar">
                                <div class="stat-mini-fill" style="width: ${(w.damageMult / 3.5) * 100}%; background: ${w.color};"></div>
                            </div>
                        </div>
                        <div class="stat-row">
                            <span>Velocidad:</span>
                            <div class="stat-mini-bar">
                                <div class="stat-mini-fill" style="width: ${(w.speed / 1.5) * 100}%; background: ${w.color};"></div>
                            </div>
                        </div>
                        <div class="stat-row">
                            <span>Alcance:</span>
                            <div class="stat-mini-bar">
                                <div class="stat-mini-fill" style="width: ${(w.reachMult / 2) * 100}%; background: ${w.color};"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="shop-item-price">${isBought ? (isEquipped ? 'EN USO' : 'DESBLOQUEADA') : `🪙 ${w.price}`}</div>
                <button class="btn ${isEquipped ? 'btn-green' : (isBought ? '' : 'btn-magenta')}" style="padding: 8px 12px; font-size: 0.85rem; margin-top: 5px;">
                    ${isEquipped ? 'EQUIPADA' : (isBought ? 'EQUIPAR' : 'COMPRAR')}
                </button>
            `;

            card.querySelector('button').onclick = () => {
                sound.init();
                if (isBought) {
                    this.equippedWeapon = w.id;
                    this.player.weapon = w;
                    this.saveProgress();
                    this.openShop();
                } else {
                    if (this.coins >= w.price) {
                        this.coins -= w.price;
                        this.purchasedWeapons.push(w.id);
                        this.equippedWeapon = w.id;
                        this.player.weapon = w;
                        this.saveProgress();
                        sound.playCoin();
                        this.openShop();
                    } else {
                        const msg = document.getElementById('shop-msg');
                        msg.innerText = "¡MONEDAS INSUFICIENTES!";
                        setTimeout(() => { msg.innerText = ""; }, 2200);
                    }
                }
            };

            container.appendChild(card);
        });

        this.showOverlay('shop-overlay');
    }

    /**
     * Cierra la tienda y regresa al estado previo correspondiente (Pausa o Menú)
     */
    closeShop() {
        if (this.state === 'PAUSED' || this.previousState === 'PAUSED') {
            this.showOverlay('pause-overlay');
        } else {
            this.showOverlay('menu-overlay');
        }
    }

    /**
     * Muestra las estadísticas de progreso acumuladas
     */
    openProgress() {
        const stats = document.getElementById('progress-stats');
        stats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-box-title">Monedas Actuales</div>
                    <div class="stat-box-val" style="color: #ffcc00;">${this.coins} 🪙</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-title">Enemigos Eliminados</div>
                    <div class="stat-box-val">${this.totalKills} ⚔️</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-title">Jefes Derrotados</div>
                    <div class="stat-box-val" style="color: #ff0055;">${this.totalBosses} 👑</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-title">Arsenal Desbloqueado</div>
                    <div class="stat-box-val" style="color: #00ff88;">${this.purchasedWeapons.length} / ${Object.keys(WEAPONS).length} 🗡️</div>
                </div>
            </div>
        `;
        this.showOverlay('progress-overlay');
    }

    /**
     * Configuración de plataformas flotantes por zona
     */
    setupZonePlatforms() {
        this.platforms = [];
        const floorY = this.getFloorY();
        const platW = Math.min(200, Math.max(120, this.width * 0.24));

        if (this.currentZone === 3) {
            // Zona 3: Void District (2 plataformas flotantes)
            this.platforms.push({ x: this.width * 0.16, y: floorY - 120, w: platW, h: 14 });
            this.platforms.push({ x: this.width * 0.60, y: floorY - 120, w: platW, h: 14 });
        } else if (this.currentZone === 4) {
            // Zona 4: Core of Darkness (3 plataformas multinivel)
            this.platforms.push({ x: this.width * 0.12, y: floorY - 120, w: platW, h: 14 });
            this.platforms.push({ x: this.width * 0.40, y: floorY - 190, w: platW, h: 14 });
            this.platforms.push({ x: this.width * 0.68, y: floorY - 120, w: platW, h: 14 });
        }
    }

    /**
     * Inicia una nueva partida
     */
    startGame() {
        const floorY = this.getFloorY();
        this.player = new Player(Math.min(150, this.width * 0.25), floorY - 70);
        this.player.weapon = WEAPONS[this.equippedWeapon] || WEAPONS.sword;
        this.currentZone = 1;
        this.currentWave = 1;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.combo = 0;
        this.gameTime = 0;
        this.bossActive = false;

        this.setupZonePlatforms();
        this.startWave();

        this.showOverlay(null);
        document.getElementById('hud').classList.remove('hidden');
        this.state = 'PLAYING';
        this.previousState = 'PLAYING';

        sound.startBGM();
    }

    /**
     * Pausar el juego
     */
    pauseGame() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.previousState = 'PAUSED';
            sound.pauseBGM();
            this.showOverlay('pause-overlay', false);
        }
    }

    /**
     * Reanudar el juego
     */
    resumeGame() {
        if (this.state === 'PAUSED') {
            this.showOverlay(null);
            this.state = 'PLAYING';
            this.previousState = 'PLAYING';
            if (sound.enabled) {
                sound.startBGM();
            }
        }
    }

    /**
     * Comienza una nueva oleada dentro de la zona actual
     */
    startWave() {
        this.enemies = [];
        this.projectiles = [];
        this.bossActive = false;

        // Distribución equilibrada de oleadas (1 a 4 normales, 5ta es Jefe de Zona)
        if (this.currentWave < this.maxWaves) {
            if (this.currentZone === 1) {
                if (this.currentWave === 1) this.spawnEnemies({ basic: 3 });
                else if (this.currentWave === 2) this.spawnEnemies({ basic: 4, fast: 1 });
                else if (this.currentWave === 3) this.spawnEnemies({ basic: 4, heavy: 1 });
                else if (this.currentWave === 4) this.spawnEnemies({ basic: 5, fast: 2, special: 1 });
            } else {
                this.spawnEnemies({
                    basic: 3 + this.currentZone,
                    fast: this.currentWave,
                    heavy: Math.floor(this.currentWave / 2),
                    special: Math.floor(this.currentZone / 2)
                });
            }
        } else {
            // Oleada 5: Jefe de Zona
            const bossNames = [
                'NEON OVERLORD PRECURSOR',
                'CYBER SENTINEL MK-II',
                'VOID HARVESTER PRIME',
                'NEON OVERLORD SUPREME'
            ];
            this.startBoss(bossNames[this.currentZone - 1] || 'CYBER BOSS');
        }

        this.updateHUD();
    }

    /**
     * Genera enemigos distribuidos estratégicamente
     */
    spawnEnemies(counts) {
        const floorY = this.getFloorY();
        Object.keys(counts).forEach(type => {
            for (let i = 0; i < counts[type]; i++) {
                // Aparecen a los extremos para evitar spawn camp sobre el jugador
                const spawnX = Math.random() < 0.5 
                    ? Math.max(25, Math.random() * (this.width * 0.22))
                    : Math.min(this.width - 25, this.width - Math.random() * (this.width * 0.22));
                this.enemies.push(new Enemy(spawnX, floorY - 50, type));
            }
        });
    }

    /**
     * Invoca al Jefe de la Zona
     */
    startBoss(name) {
        this.bossActive = true;
        const floorY = this.getFloorY();
        const bossX = Math.max(120, this.width - Math.min(220, this.width * 0.3));
        const boss = new Enemy(bossX, floorY - 100, 'boss');

        // Jefe final de Zona 4 tiene vida aumentada a 700 HP
        if (this.currentZone === 4) {
            boss.hp = 700;
            boss.maxHp = 700;
        }

        this.enemies.push(boss);
        sound.playBossAlert();
        this.vibrate(40);
        this.floatingTexts.push(new FloatingText(this.width / 2, this.height / 3, `⚠ BOSS: ${name} ⚠`, '#ff0055', 28));
    }

    /**
     * REGLA OBLIGATORIA DE DAÑO: Exactamente 5 HP por impacto recibido
     */
    damagePlayer(amount = 5) {
        if (this.player.invulnerableTimer > 0 || this.state !== 'PLAYING') return;

        this.player.hp = Math.max(0, this.player.hp - 5);
        this.player.invulnerableTimer = 34; // ~550ms de invulnerabilidad

        sound.playDamage();
        this.vibrate(35);
        this.screenShake = 14;
        this.damageFlash = 12;

        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 32, '-5', '#ff0055', 24));

        // Empuje ligero
        this.player.vx = this.player.facingRight ? -7 : 7;
        this.player.vy = -3.5;

        this.updateHUD();

        if (this.player.hp <= 0) {
            this.triggerGameOver();
        }
    }

    /**
     * REGLA OBLIGATORIA DE CURACIÓN: Límite máximo estricto de 100 HP
     */
    healPlayer(amount, x, y) {
        if (this.player.hp < 100) {
            const actualHeal = Math.min(amount, 100 - this.player.hp);
            this.player.hp = Math.min(100, this.player.hp + amount);
            sound.playHeal();
            this.floatingTexts.push(new FloatingText(x, y - 42, `+${actualHeal} ❤️`, '#00ff88', 22));
            this.updateHUD();
        }
    }

    /**
     * REGLA OBLIGATORIA DE MONEDAS: Acumulación y persistencia
     */
    addCoins(amount, x, y) {
        this.coins += amount;
        sound.playCoin();
        this.floatingTexts.push(new FloatingText(x, y - 22, `+${amount} 🪙`, '#ffcc00', 20));
        this.saveProgress();
    }

    /**
     * Detección de colisiones de combate y registro de ataques
     */
    checkCombatCollisions() {
        const p = this.player;
        const w = p.weapon || WEAPONS.sword;
        const reach = 44 * w.reachMult;

        // Ataque del Jugador hacia los Enemigos
        if (p.isAttacking) {
            this.enemies.forEach(e => {
                if (e.isDead || p.hitEnemies.has(e)) return;

                const dx = e.x - p.x;
                const inDirection = p.facingRight ? dx > 0 : dx < 0;
                const dist = Math.abs(dx);

                if (inDirection && dist < reach + e.width) {
                    p.hitEnemies.add(e); // Marca al enemigo como golpeado en este swing

                    let dmg = 15 * w.damageMult;
                    if (p.attackType === 'heavy') dmg *= 1.8;
                    if (p.attackType === 'special') dmg *= 3.5;

                    e.hp -= dmg;
                    p.energy = Math.min(100, p.energy + 10);
                    this.updateHUD();

                    // Incremento de combo
                    this.combo++;
                    this.comboTimer = 90;
                    sound.playHit();

                    // Texto de daño
                    this.floatingTexts.push(new FloatingText(
                        e.x, e.y - 30,
                        Math.round(dmg).toString(),
                        p.attackType === 'special' ? '#ffffff' : w.color,
                        p.attackType === 'special' ? 26 : 20
                    ));

                    // Partículas de impacto neón
                    for (let k = 0; k < 7; k++) {
                        this.particles.push(new Particle(
                            e.x, e.y - 15,
                            (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8,
                            w.color, 3.5, 22
                        ));
                    }

                    // Comprobación de muerte del enemigo
                    if (e.hp <= 0 && !e.isDead) {
                        e.isDead = true;
                        this.totalKills++;

                        // Explosión de partículas al morir
                        for (let k = 0; k < 18; k++) {
                            this.particles.push(new Particle(
                                e.x, e.y - 20,
                                (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12,
                                e.color, 4, 35
                            ));
                        }

                        if (e.type === 'boss') {
                            this.totalBosses++;
                            this.addCoins(100, e.x, e.y);
                            this.healPlayer(50, p.x, p.y);
                        } else {
                            // REGLA OBLIGATORIA DE RECOMPENSA: +10 Monedas y +40 HP por enemigo
                            this.addCoins(10, e.x, e.y);
                            this.healPlayer(40, p.x, p.y);
                        }

                        this.saveProgress();
                    }
                }
            });
        }

        // Colisión de Proyectiles Hostiles con el Jugador
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const pr = this.projectiles[i];
            pr.update(this.width);

            if (pr.isHostile) {
                const dist = Math.hypot(pr.x - p.x, pr.y - p.y);
                if (dist < 26) {
                    this.damagePlayer(5);
                    pr.active = false;
                }
            }

            if (!pr.active) this.projectiles.splice(i, 1);
        }
    }

    /**
     * Actualización de la barra de estado (HUD)
     */
    updateHUD() {
        const hpBar = document.getElementById('hp-bar');
        const hpPercent = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
        hpBar.style.width = `${hpPercent}%`;

        // Gradiente dinámico de la barra de vida
        if (hpPercent >= 60) {
            hpBar.style.background = 'linear-gradient(90deg, #00ff88, #00f3ff)';
            hpBar.style.boxShadow = '0 0 12px rgba(0, 243, 255, 0.6)';
        } else if (hpPercent >= 30) {
            hpBar.style.background = 'linear-gradient(90deg, #ffcc00, #ff8800)';
            hpBar.style.boxShadow = '0 0 12px rgba(255, 204, 0, 0.6)';
        } else {
            hpBar.style.background = 'linear-gradient(90deg, #ff0055, #ff0000)';
            hpBar.style.boxShadow = '0 0 15px rgba(255, 0, 85, 0.9)';
        }

        document.getElementById('hp-text').innerText = `❤️ ${Math.round(this.player.hp)} / 100`;

        // Barra de energía
        const energyBar = document.getElementById('energy-bar');
        energyBar.style.width = `${this.player.energy}%`;
        const energyText = document.getElementById('energy-text');

        if (this.player.energy >= 100) {
            energyBar.classList.add('energy-full');
            energyText.innerText = '⚡ [L] ESPECIAL LISTO!';
        } else {
            energyBar.classList.remove('energy-full');
            energyText.innerText = `⚡ ENERGÍA: ${Math.round(this.player.energy)} / 100`;
        }

        // Monedas, Zona y Oleadas
        document.getElementById('hud-coins').innerText = `🪙 ${this.coins}`;
        const zoneNames = ['CYBER CITY', 'NEON FACTORY', 'VOID DISTRICT', 'CORE OF DARKNESS'];
        document.getElementById('hud-zone').innerText = `ZONA ${this.currentZone}: ${zoneNames[this.currentZone - 1]}`;
        document.getElementById('hud-wave').innerText = this.bossActive 
            ? '⚠ COMBATE DE JEFE' 
            : `OLEADA ${this.currentWave} / ${this.maxWaves}`;

        // Contador de Combo
        const comboEl = document.getElementById('combo-display');
        if (this.combo > 1) {
            comboEl.classList.add('combo-active');
            comboEl.innerText = `COMBO x${this.combo}`;
        } else {
            comboEl.classList.remove('combo-active');
        }

        // Botón especial en controles táctiles (brillo pulsante al estar listo)
        const specialBtn = document.getElementById('btn-touch-special');
        if (specialBtn) {
            if (this.player.energy >= 100) {
                specialBtn.classList.add('energy-ready');
            } else {
                specialBtn.classList.remove('energy-ready');
            }
        }

        // Botón de sonido adaptado a iconos en móvil
        const soundBtn = document.getElementById('btn-sound-toggle');
        if (soundBtn) {
            const isCompact = window.innerWidth <= 768;
            soundBtn.innerText = isCompact ? (sound.enabled ? '🔊' : '🔇') : `🔊 SONIDO: ${sound.enabled ? 'ON' : 'OFF'}`;
        }

        // Botón de pantalla completa en HUD
        const fsBtn = document.getElementById('btn-fullscreen-hud');
        if (fsBtn) {
            fsBtn.innerText = (document.fullscreenElement || document.webkitFullscreenElement) ? '🗗' : '⛶';
        }
    }

    /**
     * Pantalla de Fin de Juego (Game Over)
     */
    triggerGameOver() {
        this.state = 'GAMEOVER';
        sound.stopBGM();
        document.getElementById('hud').classList.add('hidden');

        const stats = document.getElementById('gameover-stats');
        stats.innerHTML = `
            <div class="result-stats-card">
                <p>Oleada Alcanzada: <strong>${this.currentWave} / ${this.maxWaves}</strong> (Zona ${this.currentZone})</p>
                <p>Monedas Totales: <strong style="color: #ffcc00;">${this.coins} 🪙</strong></p>
                <p>Enemigos Eliminados: <strong>${this.totalKills}</strong></p>
            </div>
        `;
        this.showOverlay('gameover-overlay');
    }

    /**
     * Pantalla de Victoria Absoluta
     */
    triggerVictory() {
        this.state = 'VICTORY';
        sound.stopBGM();
        document.getElementById('hud').classList.add('hidden');

        const stats = document.getElementById('victory-stats');
        stats.innerHTML = `
            <div class="result-stats-card" style="border-color: #00ff88;">
                <p style="color: #00ff88; font-size: 1.3rem;">¡Has conquistado todas las arenas Cyberpunk!</p>
                <p>Monedas Finales: <strong style="color: #ffcc00;">${this.coins} 🪙</strong></p>
                <p>Jefes Derrotados: <strong>${this.totalBosses} 👑</strong></p>
            </div>
        `;
        this.showOverlay('victory-overlay');
    }

    /**
     * Ciclo de actualización lógica (Update)
     */
    update() {
        if (this.state !== 'PLAYING') return;

        const floorY = this.getFloorY();
        this.gameTime++;

        // Actualizar jugador
        this.player.update(this.keys, this.platforms, floorY, this.width);

        // Actualizar enemigos
        let allDead = true;
        this.enemies.forEach(e => {
            e.update(this.player, this.projectiles, floorY, this.width, (dmg) => {
                this.damagePlayer(dmg);
            });
            if (!e.isDead) allDead = false;
        });

        // Comprobación de final de oleada
        if (allDead && this.enemies.length > 0) {
            if (this.bossActive) {
                // Jefe Derrotado: Avanzar a siguiente zona o ganar el juego
                if (this.currentZone < 4) {
                    this.currentZone++;
                    this.currentWave = 1;
                    this.setupZonePlatforms();
                    this.startWave();
                } else {
                    this.triggerVictory();
                }
            } else {
                // Oleada normal superada
                this.currentWave++;
                this.startWave();
            }
        }

        this.checkCombatCollisions();

        // Decaimiento del contador de combo
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.updateHUD();
            }
        }

        // Actualización de partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }

        // Actualización de textos flotantes
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update();
            if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
        }

        if (this.screenShake > 0) this.screenShake--;
        if (this.damageFlash > 0) this.damageFlash--;
    }

    /**
     * Renderizado gráfico completo (Canvas Draw)
     */
    draw() {
        this.ctx.save();

        // Efecto de vibración de pantalla (Screen Shake)
        if (this.screenShake > 0) {
            const rx = (Math.random() - 0.5) * this.screenShake;
            const ry = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(rx, ry);
        }

        // Fondo degradado temático según la zona
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        const zoneGradients = [
            ['#03040c', '#090e24'], // Zona 1: Azul Cyber
            ['#0a0804', '#201205'], // Zona 2: Ámbar Industrial
            ['#0a0312', '#1a0826'], // Zona 3: Vacío Púrpura
            ['#120306', '#26040a']  // Zona 4: Núcleo Carmesí
        ];
        const colors = zoneGradients[this.currentZone - 1] || zoneGradients[0];
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Cuadrícula cyberpunk animada en el suelo
        const floorY = this.getFloorY();
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 45) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, floorY);
            this.ctx.stroke();
        }

        // Siluetas de rascacielos al fondo
        this.ctx.fillStyle = 'rgba(5, 8, 18, 0.6)';
        for (let bx = 0; bx < this.width; bx += 80) {
            const bHeight = 120 + ((bx * 37) % 180);
            this.ctx.fillRect(bx, floorY - bHeight, 60, bHeight);

            // Ventanas iluminadas
            this.ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';
            for (let wy = floorY - bHeight + 15; wy < floorY - 15; wy += 25) {
                this.ctx.fillRect(bx + 15, wy, 8, 12);
                this.ctx.fillRect(bx + 35, wy, 8, 12);
            }
            this.ctx.fillStyle = 'rgba(5, 8, 18, 0.6)';
        }

        // Línea Neón del Piso
        const floorColors = ['#00f3ff', '#ffcc00', '#b000ff', '#ff0055'];
        const currentFloorColor = floorColors[this.currentZone - 1] || '#00f3ff';
        this.ctx.strokeStyle = currentFloorColor;
        this.ctx.shadowColor = currentFloorColor;
        this.ctx.shadowBlur = 18;
        this.ctx.lineWidth = 3.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, floorY);
        this.ctx.lineTo(this.width, floorY);
        this.ctx.stroke();

        // Renderizado de plataformas flotantes
        this.ctx.strokeStyle = '#ff00aa';
        this.ctx.shadowColor = '#ff00aa';
        this.ctx.shadowBlur = 14;
        this.ctx.lineWidth = 2.5;
        this.platforms.forEach(p => {
            this.ctx.fillStyle = 'rgba(255, 0, 170, 0.15)';
            this.ctx.fillRect(p.x, p.y, p.w, p.h);
            this.ctx.strokeRect(p.x, p.y, p.w, p.h);
        });

        // Renderizado de entidades durante la partida
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
            this.player.draw(this.ctx);
            this.enemies.forEach(e => e.draw(this.ctx));
            this.projectiles.forEach(pr => pr.draw(this.ctx));
            this.particles.forEach(pt => pt.draw(this.ctx));
            this.floatingTexts.forEach(ft => ft.draw(this.ctx));
        } else if (this.state === 'MENU') {
            // Partículas flotantes de ambiente para el Menú
            if (Math.random() < 0.25) {
                this.particles.push(new Particle(
                    Math.random() * this.width, this.height + 10,
                    (Math.random() - 0.5) * 1.5, -Math.random() * 2.5,
                    '#00f3ff', 2.5, 90
                ));
            }
            this.particles.forEach(pt => { pt.update(); pt.draw(this.ctx); });
        }

        // Flash de daño rojo al recibir golpe
        if (this.damageFlash > 0) {
            this.ctx.fillStyle = 'rgba(255, 0, 85, 0.22)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        this.ctx.restore();
    }

    /**
     * Bucle de animación continuo (Game Loop)
     */
    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// Inicialización automática tras cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.loop();
});

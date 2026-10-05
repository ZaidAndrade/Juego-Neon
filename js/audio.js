/**
 * ==========================================================================
 * NEON STICK: CYBER ARENA - MOTOR DE AUDIO Y SINTETIZADOR BGM
 * Síntesis de sonido en tiempo real con Web Audio API (Sin dependencias externas)
 * ==========================================================================
 */

class SoundFX {
    constructor() {
        this.enabled = true;
        this.musicEnabled = true;
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;

        // Propiedades de la pista musical sintética
        this.bgmTimer = null;
        this.bgmPlaying = false;
        this.bgmStep = 0;
        this.tempo = 124; // BPM Cyberpunk

        // Patrón de bajo Cyberpunk (Frecuencias en Hz)
        // Secuencia en C Menor / Eb / Bb / G:
        this.bassNotes = [
            65.41, 65.41, 130.81, 65.41,  // C2, C2, C3, C2
            77.78, 77.78, 155.56, 77.78,  // Eb2
            58.27, 58.27, 116.54, 58.27,  // Bb1
            49.00, 49.00, 98.00, 49.00    // G1
        ];

        // Secuencia melódica de arpegios neón
        this.arpNotes = [
            261.63, 311.13, 392.00, 523.25, // C4, Eb4, G4, C5
            311.13, 392.00, 523.25, 622.25, // Eb4, G4, C5, Eb5
            233.08, 293.66, 349.23, 466.16, // Bb3, D4, F4, Bb4
            196.00, 246.94, 293.66, 392.00  // G3, B3, D4, G4
        ];
    }

    /**
     * Inicializa el AudioContext tras la primera interacción del usuario.
     */
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();

                // Nodos de ganancia organizados
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
                this.sfxGain.connect(this.masterGain);

                this.musicGain = this.ctx.createGain();
                this.musicGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
                this.musicGain.connect(this.masterGain);
            }
        }

        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Alterna el estado del sonido general y de la música
     */
    toggleSound() {
        this.enabled = !this.enabled;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.enabled ? 0.8 : 0.0, this.ctx.currentTime);
        }
        const audioElement = document.getElementById('bg-music');
        if (audioElement) {
            audioElement.muted = !this.enabled;
        }
        if (!this.enabled && this.bgmPlaying) {
            this.pauseBGM();
        }
        return this.enabled;
    }

    // ==========================================================================
    // EFECTOS DE SONIDO (SFX)
    // ==========================================================================

    playHit() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playSlash() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.13);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.13);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.13);
    }

    playHeavySlash() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    }

    playJump() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(170, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.14);
    }

    playDamage() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, this.ctx.currentTime);
        osc.frequency.setValueAtTime(60, this.ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    }

    playCoin() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.28);
    }

    playHeal() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.26);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.26);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.26);
    }

    playSpecial() {
        if (!this.enabled || !this.ctx) return;
        // Efecto láser expansivo
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.25);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playBossAlert() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, this.ctx.currentTime);
        osc.frequency.setValueAtTime(260, this.ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(130, this.ctx.currentTime + 0.3);
        osc.frequency.setValueAtTime(320, this.ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.65);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.65);
    }

    playBossCharge() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(420, this.ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }

    playBossSlam() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    // ==========================================================================
    // MÚSICA DE FONDO CYBERPUNK SINTETIZADA EN TIEMPO REAL
    // ==========================================================================

    startBGM() {
        if (!this.enabled || !this.musicEnabled) return;
        this.init();
        if (this.bgmPlaying) return;

        // Reproducir la canción "Elton John - I'm Still Standing"
        const audioElement = document.getElementById('bg-music');
        if (audioElement) {
            audioElement.volume = 0.55;
            audioElement.muted = !this.enabled;
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.bgmPlaying = true;
                }).catch((err) => {
                    console.log('Fallback a sintetizador:', err);
                    this._startSynthBGM();
                });
            } else {
                this.bgmPlaying = true;
            }
        } else {
            this._startSynthBGM();
        }
    }

    pauseBGM() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
        const audioElement = document.getElementById('bg-music');
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
        }
    }

    _startSynthBGM() {
        this.bgmPlaying = true;
        const stepTime = (60 / this.tempo) / 4; // Dieciseisavos

        const playStep = () => {
            if (!this.bgmPlaying || !this.ctx) return;

            const t = this.ctx.currentTime;
            const noteIdx = this.bgmStep % 16;

            // 1. Sintetizador de Bajo (Bassline)
            if (noteIdx % 2 === 0) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                bassOsc.type = 'sawtooth';
                bassOsc.frequency.setValueAtTime(this.bassNotes[noteIdx], t);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(380, t);
                filter.frequency.exponentialRampToValueAtTime(140, t + stepTime * 1.8);

                bassGain.gain.setValueAtTime(0.22, t);
                bassGain.gain.exponentialRampToValueAtTime(0.01, t + stepTime * 1.8);

                bassOsc.connect(filter);
                filter.connect(bassGain);
                bassGain.connect(this.musicGain);

                bassOsc.start(t);
                bassOsc.stop(t + stepTime * 1.8);
            }

            // 2. Arpegios Neón (Lead Synth)
            const arpOsc = this.ctx.createOscillator();
            const arpGain = this.ctx.createGain();
            arpOsc.type = 'square';
            arpOsc.frequency.setValueAtTime(this.arpNotes[noteIdx], t);

            arpGain.gain.setValueAtTime(0.06, t);
            arpGain.gain.exponentialRampToValueAtTime(0.001, t + stepTime * 0.9);

            arpOsc.connect(arpGain);
            arpGain.connect(this.musicGain);

            arpOsc.start(t);
            arpOsc.stop(t + stepTime * 0.9);

            // 3. Bombo y Caja Cyberpunk (Kick & Snare beats)
            if (noteIdx === 0 || noteIdx === 8) {
                // Kick Drum
                const kickOsc = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kickOsc.type = 'sine';
                kickOsc.frequency.setValueAtTime(120, t);
                kickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
                kickGain.gain.setValueAtTime(0.3, t);
                kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                kickOsc.connect(kickGain);
                kickGain.connect(this.musicGain);
                kickOsc.start(t);
                kickOsc.stop(t + 0.12);
            } else if (noteIdx === 4 || noteIdx === 12) {
                // Snare Hit (Noise burst simulation)
                const snareOsc = this.ctx.createOscillator();
                const snareGain = this.ctx.createGain();
                snareOsc.type = 'triangle';
                snareOsc.frequency.setValueAtTime(180, t);
                snareOsc.frequency.linearRampToValueAtTime(80, t + 0.08);
                snareGain.gain.setValueAtTime(0.18, t);
                snareGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                snareOsc.connect(snareGain);
                snareGain.connect(this.musicGain);
                snareOsc.start(t);
                snareOsc.stop(t + 0.08);
            }

            this.bgmStep++;
            this.bgmTimer = setTimeout(playStep, stepTime * 1000);
        };

        playStep();
    }

    stopBGM() {
        this.pauseBGM();
        const audioElement = document.getElementById('bg-music');
        if (audioElement) {
            audioElement.currentTime = 0;
        }
    }
}

// Instancia global del sistema de sonido
const sound = new SoundFX();

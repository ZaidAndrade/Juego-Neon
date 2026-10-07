/**
 * Acciones de entrada compartidas por teclado, táctil y mandos.
 */
class InputManager {
    constructor(onPause = () => {}, onGamepadChange = () => {}) {
        this.onPause = onPause;
        this.onGamepadChange = onGamepadChange;
        this.bindings = {
            p1: {
                KeyA: ['moveLeft'],
                KeyD: ['moveRight'],
                KeyW: ['jump'],
                KeyS: ['crouch'],
                KeyF: ['attack'],
                Space: ['jump'],
                KeyJ: ['legacyLight'],
                KeyK: ['legacyHeavy'],
                KeyL: ['legacySpecial']
            },
            p2: {
                ArrowLeft: ['moveLeft'],
                ArrowRight: ['moveRight'],
                ArrowUp: ['jump'],
                ArrowDown: ['crouch'],
                Enter: ['attack']
            }
        };
        this.sources = {
            p1: { keyboard: new Set(), touch: new Set(), gamepad: new Set() },
            p2: { keyboard: new Set(), touch: new Set(), gamepad: new Set() }
        };
        this.attackQueues = { p1: [], p2: [] };
        this.keyboardActions = { p1: new Map(), p2: new Map() };
        this.connectedGamepads = new Map();
        this.gamepadAssignments = new Map();
        this.gamepadAttackButtons = new Map();

        this.handleKeyDown = event => this.onKeyDown(event);
        this.handleKeyUp = event => this.onKeyUp(event);
        this.handleGamepadChange = () => this.pollGamepads();
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('gamepadconnected', this.handleGamepadChange);
        window.addEventListener('gamepaddisconnected', this.handleGamepadChange);
    }

    onKeyDown(event) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();
        }

        if (event.code === 'Escape' || event.code === 'KeyP') {
            this.onPause();
            return;
        }

        for (const playerId of ['p1', 'p2']) {
            const actions = this.bindings[playerId][event.code];
            if (!actions) continue;

            const active = this.keyboardActions[playerId];
            for (const action of actions) {
                if (action === 'legacyLight' || action === 'legacyHeavy' || action === 'legacySpecial') {
                    if (!event.repeat) {
                        const type = {
                            legacyLight: 'light',
                            legacyHeavy: 'heavy',
                            legacySpecial: 'special'
                        }[action];
                        this.attackQueues[playerId].push(type);
                    }
                    continue;
                }

                if (action === 'attack' && !active.has(action) && !event.repeat) {
                    this.attackQueues[playerId].push('light');
                }
                if (!active.has(action)) active.set(action, new Set());
                active.get(action).add(event.code);
            }
        }
    }

    onKeyUp(event) {
        for (const playerId of ['p1', 'p2']) {
            const actions = this.bindings[playerId][event.code];
            if (!actions) continue;
            for (const action of actions) {
                const keys = this.keyboardActions[playerId].get(action);
                if (!keys) continue;
                keys.delete(event.code);
                if (keys.size === 0) this.keyboardActions[playerId].delete(action);
            }
        }
    }

    setAction(playerId, action, isActive, source = 'touch') {
        const playerSources = this.sources[playerId];
        if (!playerSources || !playerSources[source]) {
            throw new Error(`Fuente de entrada desconocida: ${playerId}/${source}`);
        }
        if (!['moveLeft', 'moveRight', 'jump', 'crouch', 'attack'].includes(action)) {
            throw new Error(`Acción de entrada desconocida: ${action}`);
        }

        const sourceActions = playerSources[source];
        if (isActive) sourceActions.add(action);
        else sourceActions.delete(action);
    }

    pollGamepads() {
        if (typeof navigator.getGamepads !== 'function') return;

        const pads = Array.from(navigator.getGamepads()).filter(Boolean);
        const availableIndices = new Set(pads.map(pad => pad.index));
        let assignmentsChanged = false;

        for (const index of this.connectedGamepads.keys()) {
            if (availableIndices.has(index)) continue;
            this.connectedGamepads.delete(index);
            this.gamepadAssignments.delete(index);
            this.gamepadAttackButtons.delete(index);
            assignmentsChanged = true;
        }

        for (const pad of pads) {
            this.connectedGamepads.set(pad.index, pad);
            if (this.gamepadAssignments.has(pad.index)) continue;

            const assignedPlayers = new Set(this.gamepadAssignments.values());
            const playerId = ['p1', 'p2'].find(id => !assignedPlayers.has(id)) || null;
            this.gamepadAssignments.set(pad.index, playerId);
            assignmentsChanged = true;
        }

        this.sources.p1.gamepad.clear();
        this.sources.p2.gamepad.clear();
        for (const pad of pads) {
            const playerId = this.gamepadAssignments.get(pad.index);
            if (!playerId) continue;

            const actions = this.sources[playerId].gamepad;
            const horizontal = pad.axes[0] || 0;
            const vertical = pad.axes[1] || 0;
            const buttonPressed = index => Boolean(pad.buttons[index]?.pressed);
            const pressedAttackButtons = new Set();
            [
                [1, 'light'],
                [2, 'heavy'],
                [3, 'special']
            ].forEach(([buttonIndex, attackType]) => {
                if (!buttonPressed(buttonIndex)) return;
                pressedAttackButtons.add(buttonIndex);
                if (!this.gamepadAttackButtons.get(pad.index)?.has(buttonIndex)) {
                    this.attackQueues[playerId].push(attackType);
                }
            });
            this.gamepadAttackButtons.set(pad.index, pressedAttackButtons);

            if (horizontal < -0.35 || buttonPressed(14)) actions.add('moveLeft');
            if (horizontal > 0.35 || buttonPressed(15)) actions.add('moveRight');
            if (vertical < -0.55 || buttonPressed(0) || buttonPressed(12)) actions.add('jump');
            if (vertical > 0.55 || buttonPressed(13)) actions.add('crouch');
            if (pressedAttackButtons.size > 0) actions.add('attack');
        }

        if (assignmentsChanged) {
            this.onGamepadChange(this.getConnectedGamepads());
        }
    }

    getConnectedGamepads() {
        return Array.from(this.connectedGamepads.values(), pad => ({
            index: pad.index,
            id: pad.id,
            assignedTo: this.gamepadAssignments.get(pad.index) || ''
        }));
    }

    assignGamepad(index, playerId) {
        if (!['p1', 'p2', ''].includes(playerId)) {
            throw new Error(`Jugador de entrada desconocido: ${playerId}`);
        }
        if (!this.connectedGamepads.has(index)) {
            throw new Error(`No hay un mando conectado en el índice ${index}`);
        }

        const currentPlayer = this.gamepadAssignments.get(index) || null;
        const existingIndex = Array.from(this.gamepadAssignments.entries())
            .find(([otherIndex, assignedTo]) => otherIndex !== index && assignedTo === playerId)?.[0];

        this.gamepadAssignments.set(index, playerId || null);
        if (existingIndex !== undefined && playerId) {
            this.gamepadAssignments.set(existingIndex, currentPlayer);
        }
        this.pollGamepads();
        this.onGamepadChange(this.getConnectedGamepads());
    }

    queueAttack(playerId, type = 'light') {
        const queue = this.attackQueues[playerId];
        if (!queue) throw new Error(`Jugador de entrada desconocido: ${playerId}`);
        queue.push(type);
    }

    getActions(playerId) {
        const playerSources = this.sources[playerId];
        const keyboard = this.keyboardActions[playerId];
        if (!playerSources || !keyboard) {
            throw new Error(`Jugador de entrada desconocido: ${playerId}`);
        }

        const isActive = action =>
            keyboard.has(action) ||
            playerSources.touch.has(action) ||
            playerSources.gamepad.has(action);

        return {
            moveLeft: isActive('moveLeft'),
            moveRight: isActive('moveRight'),
            jump: isActive('jump'),
            crouch: isActive('crouch'),
            attack: isActive('attack')
        };
    }

    consumeAttacks(playerId) {
        const queue = this.attackQueues[playerId];
        if (!queue) throw new Error(`Jugador de entrada desconocido: ${playerId}`);
        return queue.splice(0);
    }

    clearAttacks() {
        this.attackQueues.p1.length = 0;
        this.attackQueues.p2.length = 0;
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('gamepadconnected', this.handleGamepadChange);
        window.removeEventListener('gamepaddisconnected', this.handleGamepadChange);
    }
}

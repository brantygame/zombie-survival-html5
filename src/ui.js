import { GAME_STATE } from './config.js';

export class UI {
  constructor() {
    this.screens = {
      [GAME_STATE.LOADING]: document.getElementById('loadingScreen'),
      [GAME_STATE.MENU]: document.getElementById('menuScreen'),
      [GAME_STATE.PAUSED]: document.getElementById('pauseScreen'),
      [GAME_STATE.GAME_OVER]: document.getElementById('gameOverScreen'),
      [GAME_STATE.LEVEL_COMPLETE]: document.getElementById('levelCompleteScreen'),
      [GAME_STATE.WIN]: document.getElementById('winScreen')
    };
    this.hud = document.getElementById('hud');
    this.mobileControls = document.getElementById('mobileControls');
    this.levelLabel = document.getElementById('levelLabel');
    this.enemyLabel = document.getElementById('enemyLabel');
    this.healthLabel = document.getElementById('healthLabel');
    this.healthFill = document.getElementById('healthFill');
    this.weaponLabel = document.getElementById('weaponLabel');
    this.ammoLabel = document.getElementById('ammoLabel');
    this.scoreLabel = document.getElementById('scoreLabel');
    this.comboLabel = document.getElementById('comboLabel');
    this.toastEl = document.getElementById('toast');
    this.damageFlash = document.getElementById('damageFlash');
  }

  showState(state) {
    Object.values(this.screens).forEach(screen => screen?.classList.remove('visible'));
    this.screens[state]?.classList.add('visible');
    const playing = state === GAME_STATE.PLAYING;
    this.hud.classList.toggle('hidden', !playing);
    this.mobileControls.classList.toggle('hidden', !playing);
  }

  updateHud(level, enemies, player, meta = {}) {
    this.levelLabel.textContent = `Level ${level} / 10`;
    this.enemyLabel.textContent = `Zombies ${enemies}`;
    this.healthLabel.textContent = Math.ceil(player.health);
    this.healthFill.style.transform = `scaleX(${Math.max(0, player.health / player.maxHealth)})`;
    this.weaponLabel.textContent = player.weapon.template.name;
    this.ammoLabel.textContent = player.weapon.reloadRemaining > 0 ? 'Reloading…' : `${player.weapon.ammo} / ${player.weapon.reserve}`;
    if (this.scoreLabel) this.scoreLabel.textContent = `Score ${meta.score || 0}`;
    if (this.comboLabel) {
      const combo = meta.combo || 0;
      this.comboLabel.textContent = combo > 1 ? `x${combo} COMBO` : '';
      this.comboLabel.classList.toggle('active', combo > 1);
    }
  }

  setLevelComplete(level, meta = {}) {
    document.getElementById('levelCompleteTitle').textContent = `Level ${level} Complete`;
    document.getElementById('levelCompleteText').textContent = `Kills ${meta.kills || 0} · Score ${meta.score || 0} · +25 HP before the next wave.`;
  }

  setGameOver(level, meta = {}) {
    document.getElementById('gameOverText').textContent = `Level ${level} · Kills ${meta.kills || 0} · Score ${meta.score || 0}`;
  }

  flashDamage() {
    if (!this.damageFlash) return;
    this.damageFlash.classList.remove('pulse');
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add('pulse');
  }

  toast(text, duration = 1300) {
    clearTimeout(this.timer);
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.timer = setTimeout(() => this.toastEl.classList.remove('show'), duration);
  }
}

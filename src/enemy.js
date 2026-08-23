const TYPES = Object.freeze({
  walker: { name: 'Walker', health: 1, damage: 1, speed: 1, radius: 17, body: '#5e7b49', skin: '#86ad65', accent: '#e33e35', score: 100 },
  runner: { name: 'Runner', health: 0.72, damage: 0.75, speed: 1.65, radius: 15, body: '#7f6638', skin: '#b29b68', accent: '#ff6b43', score: 140 },
  brute:  { name: 'Brute', health: 2.25, damage: 1.35, speed: 0.68, radius: 24, body: '#4f6250', skin: '#76907a', accent: '#ffcf4f', score: 240 },
  armored:{ name: 'Armored', health: 1.55, damage: 1.05, speed: 0.82, radius: 19, body: '#49545c', skin: '#73808a', accent: '#9ad4ff', score: 210 },
  boss:   { name: 'Mutant', health: 5.5, damage: 1.55, speed: 0.72, radius: 32, body: '#603e60', skin: '#95648e', accent: '#ff5dcc', score: 1000 }
});

export function enemyTypeFor(level, slot, count) {
  if ((level === 5 || level === 10) && slot === count - 1) return 'boss';
  const roll = Math.random();
  if (level >= 7 && roll < 0.18) return 'brute';
  if (level >= 5 && roll < 0.36) return 'armored';
  if (level >= 3 && roll < 0.58) return 'runner';
  return 'walker';
}

export class Enemy {
  constructor() { this.active = false; }

  spawn(x, y, stats, type = 'walker') {
    const t = TYPES[type] || TYPES.walker;
    this.active = true;
    this.type = type;
    this.typeName = t.name;
    this.x = x; this.y = y;
    this.radius = t.radius;
    this.health = Math.round(stats.health * t.health);
    this.maxHealth = this.health;
    this.damage = Math.round(stats.damage * t.damage);
    this.speed = stats.speed * t.speed;
    this.scoreValue = t.score;
    this.bodyColor = t.body;
    this.skinColor = t.skin;
    this.accentColor = t.accent;
    this.attackCooldown = 0;
    this.hitFlash = 0;
    this.knockX = 0; this.knockY = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, player, attackCooldownSeconds) {
    if (!this.active) return false;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.phase += dt * (this.type === 'runner' ? 9 : 4);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    const wobble = this.type === 'runner' ? Math.sin(this.phase) * 0.12 : 0;
    const nx = dx / distance, ny = dy / distance;
    this.x += (nx - ny * wobble) * this.speed * dt + this.knockX * dt;
    this.y += (ny + nx * wobble) * this.speed * dt + this.knockY * dt;
    this.knockX *= Math.max(0, 1 - dt * 9);
    this.knockY *= Math.max(0, 1 - dt * 9);

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (distance < this.radius + player.radius + 4 && this.attackCooldown <= 0) {
      this.attackCooldown = attackCooldownSeconds * (this.type === 'runner' ? 0.75 : 1);
      return true;
    }
    return false;
  }

  hit(damage, angle = 0, force = 0) {
    this.health -= damage;
    this.hitFlash = 0.09;
    if (force > 0) {
      this.knockX += Math.cos(angle) * force;
      this.knockY += Math.sin(angle) * force;
    }
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  draw(ctx, player) {
    if (!this.active) return;
    const scale = this.radius / 17;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    if (this.type === 'boss') {
      ctx.strokeStyle = 'rgba(255,93,204,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 28 + Math.sin(this.phase * 2) * 3, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : '#3e503d';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-5, 14); ctx.lineTo(-8, 29);
    ctx.moveTo(5, 14); ctx.lineTo(8, 29);
    ctx.stroke();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.bodyColor;
    ctx.fillRect(-12, -4, 24, 25);

    if (this.type === 'armored') {
      ctx.fillStyle = '#2f3940';
      ctx.fillRect(-13, -4, 26, 9);
      ctx.fillRect(-11, 5, 22, 5);
    }

    ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : this.skinColor;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-8, 3); ctx.lineTo(18, 4);
    ctx.moveTo(8, 3); ctx.lineTo(24, 0);
    ctx.stroke();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.skinColor;
    ctx.beginPath(); ctx.arc(0, -16, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.accentColor;
    ctx.fillRect(-6, -19, 3, 3); ctx.fillRect(3, -19, 3, 3);
    ctx.restore();

    const width = this.type === 'boss' ? 64 : Math.max(34, this.radius * 2);
    const ratio = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = '#3b1212'; ctx.fillRect(this.x - width / 2, this.y - this.radius - 27, width, 5);
    ctx.fillStyle = this.type === 'boss' ? '#ff5dcc' : '#69db64';
    ctx.fillRect(this.x - width / 2, this.y - this.radius - 27, width * ratio, 5);

    if (this.type !== 'walker') {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.font = '700 9px -apple-system,Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.typeName.toUpperCase(), this.x, this.y - this.radius - 32);
    }
  }
}

export class AudioSystem {
  constructor() {
    this.context = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this.musicEnabled = true; this.sfxEnabled = true; this.musicTimer = 0;
  }
  async unlock() {
    if (!this.context) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      this.context = new A();
      this.master = this.context.createGain(); this.musicGain = this.context.createGain(); this.sfxGain = this.context.createGain();
      this.master.gain.value = 0.45; this.musicGain.gain.value = this.musicEnabled ? 0.16 : 0; this.sfxGain.gain.value = this.sfxEnabled ? 0.55 : 0;
      this.musicGain.connect(this.master); this.sfxGain.connect(this.master); this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') { try { await this.context.resume(); } catch {} }
  }
  setMusicEnabled(v) { this.musicEnabled = v; if (this.musicGain) this.musicGain.gain.value = v ? 0.16 : 0; }
  setSfxEnabled(v) { this.sfxEnabled = v; if (this.sfxGain) this.sfxGain.gain.value = v ? 0.55 : 0; }
  tone(freq, duration, type='square', volume=.12, dest='sfx', slide=0) {
    if (!this.context) return;
    const target = dest === 'music' ? this.musicGain : this.sfxGain; if (!target) return;
    const o=this.context.createOscillator(), g=this.context.createGain(), now=this.context.currentTime;
    o.type=type; o.frequency.setValueAtTime(freq,now); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),now+duration);
    g.gain.setValueAtTime(volume,now); g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    o.connect(g); g.connect(target); o.start(now); o.stop(now+duration);
  }
  shoot(){ if(this.sfxEnabled){this.tone(125,.055,'square',.11,'sfx',-45);this.tone(58,.075,'triangle',.05);} }
  hit(){ if(this.sfxEnabled)this.tone(72,.045,'sawtooth',.055,'sfx',-20); }
  kill(){ if(this.sfxEnabled){this.tone(180,.07,'square',.07);setTimeout(()=>this.tone(260,.08,'triangle',.06),45);} }
  pickup(){ if(this.sfxEnabled){this.tone(520,.08,'sine',.1);setTimeout(()=>this.tone(760,.1,'sine',.08),70);} }
  hurt(){ if(this.sfxEnabled){this.tone(48,.14,'sawtooth',.14,'sfx',-15);} }
  reload(){ if(this.sfxEnabled)this.tone(220,.08,'triangle',.07); }
  explosion(){ if(this.sfxEnabled){this.tone(62,.28,'sawtooth',.18,'sfx',-35);this.tone(38,.35,'square',.12);} }
  updateMusic(dt,playing){ if(!playing||!this.musicEnabled||!this.context)return;this.musicTimer-=dt;if(this.musicTimer<=0){this.musicTimer=.62;this.tone(98,.13,'triangle',.035,'music');} }
}

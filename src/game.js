import { CONFIG, GAME_STATE } from './config.js';
import { Player } from './player.js';
import { Enemy, enemyTypeFor } from './enemy.js';
import { randomWeapon } from './weapons.js';

class BulletPool {
  constructor(size=120){ this.items=Array.from({length:size},()=>({active:false})); }
  spawn(x,y,angle,speed,range,damage){
    const b=this.items.find(v=>!v.active); if(!b)return;
    b.active=true;b.x=x;b.y=y;b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;b.life=range/speed;b.damage=damage;b.angle=angle;
  }
  update(dt){ for(const b of this.items)if(b.active){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0)b.active=false;} }
  clear(){ for(const b of this.items)b.active=false; }
  draw(ctx){
    ctx.lineWidth=2;ctx.strokeStyle='#ffe9a0';
    for(const b of this.items)if(b.active){ctx.beginPath();ctx.moveTo(b.x-b.vx*.012,b.y-b.vy*.012);ctx.lineTo(b.x,b.y);ctx.stroke();}
  }
}

class ParticlePool {
  constructor(size=140){this.items=Array.from({length:size},()=>({active:false}));}
  burst(x,y,count,color='#8a2521',speed=100,life=.35,size=4){
    let made=0;
    for(const p of this.items){
      if(made>=count)break;if(p.active)continue;
      const a=Math.random()*Math.PI*2,s=speed*(.45+Math.random()*.8);
      p.active=true;p.x=x;p.y=y;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s;p.life=life*(.6+Math.random()*.7);p.max=p.life;p.color=color;p.size=size*(.7+Math.random()*.6);made++;
    }
  }
  update(dt){for(const p of this.items)if(p.active){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.max(0,1-dt*2.5);p.vy*=Math.max(0,1-dt*2.5);p.life-=dt;if(p.life<=0)p.active=false;}}
  draw(ctx){for(const p of this.items)if(p.active){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}ctx.globalAlpha=1;}
  clear(){for(const p of this.items)p.active=false;}
}

class FloatTextPool {
  constructor(size=40){this.items=Array.from({length:size},()=>({active:false}));}
  spawn(x,y,text,color='#fff',size=14){const f=this.items.find(v=>!v.active);if(!f)return;f.active=true;f.x=x;f.y=y;f.text=text;f.color=color;f.size=size;f.life=.7;f.max=.7;}
  update(dt){for(const f of this.items)if(f.active){f.y-=28*dt;f.life-=dt;if(f.life<=0)f.active=false;}}
  draw(ctx){ctx.textAlign='center';for(const f of this.items)if(f.active){ctx.globalAlpha=f.life/f.max;ctx.fillStyle=f.color;ctx.font=`900 ${f.size}px -apple-system,Arial`;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;}
  clear(){for(const f of this.items)f.active=false;}
}

export class Game {
  constructor(canvas,input,audio,ui,mobile){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.input=input;this.audio=audio;this.ui=ui;this.mobile=mobile;
    this.player=new Player();this.enemies=Array.from({length:44},()=>new Enemy());this.bullets=new BulletPool();this.particles=new ParticlePool();this.floatText=new FloatTextPool();
    this.pickups=[];this.barrels=[];this.scenery=[];this.state=GAME_STATE.LOADING;this.level=1;this.width=1;this.height=1;this.dpr=1;this.last=0;
    this.score=0;this.kills=0;this.levelKills=0;this.combo=0;this.comboTimer=0;this.shake=0;this.damageVignette=0;this.muzzleFlash=0;
  }

  init(){
    this.resize();window.addEventListener('resize',()=>this.resize(),{passive:true});window.addEventListener('orientationchange',()=>setTimeout(()=>this.resize(),120),{passive:true});window.visualViewport?.addEventListener('resize',()=>this.resize(),{passive:true});
    this.setState(GAME_STATE.MENU);requestAnimationFrame(t=>this.loop(t));
  }
  resize(){
    const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,Math.round(r.width||innerWidth));this.height=Math.max(1,Math.round(r.height||innerHeight));this.dpr=Math.min(devicePixelRatio||1,CONFIG.world.maxDpr);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.makeScenery();
  }
  makeScenery(){
    this.scenery.length=0;
    const count=Math.max(12,Math.floor((this.width*this.height)/65000));
    for(let i=0;i<count;i++)this.scenery.push({x:Math.random()*this.width,y:Math.random()*this.height,r:2+Math.random()*7,a:.06+Math.random()*.08});
  }
  setState(s){this.state=s;this.ui.showState(s);if(s!==GAME_STATE.PLAYING)this.mobile.reset();}
  startNewGame(){
    this.level=1;this.score=0;this.kills=0;this.combo=0;this.comboTimer=0;this.player.reset(this.width/2,this.height/2);this.spawnLevel();this.setState(GAME_STATE.PLAYING);this.last=performance.now();
  }
  continueNextLevel(){this.level++;this.player.heal(CONFIG.world.levelHeal);this.refillReserve(.25);this.spawnLevel();this.setState(GAME_STATE.PLAYING);this.last=performance.now();}
  refillReserve(fraction){const w=this.player.weapon;w.reserve=Math.min(w.template.reserve,w.reserve+Math.ceil(w.template.reserve*fraction));}

  spawnLevel(){
    for(const e of this.enemies)e.active=false;this.bullets.clear();this.particles.clear();this.floatText.clear();this.pickups.length=0;this.barrels.length=0;this.levelKills=0;
    const count=Math.min(this.enemies.length,CONFIG.enemy.baseCount+this.level*CONFIG.enemy.countPerLevel+(this.level>=5?2:0));
    const stats={health:CONFIG.enemy.baseHealth+(this.level-1)*CONFIG.enemy.healthPerLevel,damage:CONFIG.enemy.baseDamage+(this.level-1)*CONFIG.enemy.damagePerLevel,speed:CONFIG.enemy.baseSpeed+(this.level-1)*CONFIG.enemy.speedPerLevel};
    for(let i=0;i<count;i++){const p=this.edge();this.enemies[i].spawn(p.x,p.y,stats,enemyTypeFor(this.level,i,count));}

    const weaponCount=this.width<500?2:3;
    for(let i=0;i<weaponCount;i++)this.pickups.push(this.makePickup('weapon'));
    this.pickups.push(this.makePickup('medkit'));this.pickups.push(this.makePickup('ammo'));
    const barrelCount=this.width<500?2:3;
    for(let i=0;i<barrelCount;i++)this.barrels.push({x:80+Math.random()*Math.max(20,this.width-160),y:120+Math.random()*Math.max(20,this.height-240),hp:55,active:true});
    this.hud();
    const special=this.level===5?' · MUTANT DETECTED':this.level===10?' · FINAL MUTANT':this.level>=7?' · HEAVY HORDE':'';
    this.ui.toast(`LEVEL ${this.level}${special}`,1800);
  }
  makePickup(type){
    const base={x:70+Math.random()*Math.max(10,this.width-140),y:105+Math.random()*Math.max(10,this.height-210),type};
    if(type==='weapon')base.weapon=randomWeapon(this.player.weapon.template.id);return base;
  }
  edge(){const e=Math.random()*4|0;if(e===0)return{x:Math.random()*this.width,y:-35};if(e===1)return{x:this.width+35,y:Math.random()*this.height};if(e===2)return{x:Math.random()*this.width,y:this.height+35};return{x:-35,y:Math.random()*this.height};}
  count(){let n=0;for(const e of this.enemies)if(e.active)n++;return n;}
  nearest(){let best=null,d=Infinity;for(const e of this.enemies)if(e.active){const dx=e.x-this.player.x,dy=e.y-this.player.y,q=dx*dx+dy*dy;if(q<d){d=q;best=e;}}return best;}
  aim(){if(this.input.mouse.active)this.player.aimAt(this.input.mouse.x,this.input.mouse.y);else{const e=this.nearest();if(e)this.player.aimAt(e.x,e.y);}}
  shoot(){
    const w=this.player.weapon;if(!this.player.canShoot()){if(w.ammo<=0&&w.reserve>0&&this.player.startReload()){this.audio.reload();this.ui.toast('Reloading');}return;}
    this.player.consumeShot();const t=w.template;const x=this.player.x+Math.cos(this.player.angle)*29,y=this.player.y+Math.sin(this.player.angle)*29;
    this.bullets.spawn(x,y,this.player.angle,t.bulletSpeed,t.range,t.damage);this.particles.burst(x,y,3,'#ffd36a',45,.12,3);this.muzzleFlash=.055;this.shake=Math.max(this.shake,t.id==='shotgun'?3.5:t.id==='sniper'?3:1.4);this.audio.shoot();
  }

  pickup(){
    let bi=-1,bd=CONFIG.player.pickupRadius;
    for(let i=0;i<this.pickups.length;i++){const p=this.pickups[i],d=Math.hypot(p.x-this.player.x,p.y-this.player.y);if(d<bd){bd=d;bi=i;}}
    if(bi<0){this.ui.toast('Move closer to supplies');return;}
    const p=this.pickups[bi];
    if(p.type==='weapon'){this.player.equip(p.weapon);this.ui.toast(`${p.weapon.name} equipped`);}
    else if(p.type==='medkit'){if(this.player.health>=this.player.maxHealth){this.ui.toast('Health already full');return;}this.player.heal(35);this.ui.toast('+35 HP');}
    else if(p.type==='ammo'){this.refillReserve(.5);this.ui.toast('Ammo restocked');}
    this.pickups.splice(bi,1);this.audio.pickup();
  }

  killEnemy(enemy){
    this.kills++;this.levelKills++;this.combo=this.comboTimer>0?Math.min(8,this.combo+1):1;this.comboTimer=2.4;
    const gained=Math.round(enemy.scoreValue*(1+Math.max(0,this.combo-1)*.18));this.score+=gained;
    this.floatText.spawn(enemy.x,enemy.y-24,`+${gained}`,this.combo>=4?'#ffd75f':'#ffffff',this.combo>=4?16:13);
    this.particles.burst(enemy.x,enemy.y,enemy.type==='boss'?22:10,enemy.type==='boss'?'#d85bbd':'#812b26',enemy.type==='boss'?190:120,enemy.type==='boss'?.65:.4,enemy.type==='boss'?6:4);
    this.shake=Math.max(this.shake,enemy.type==='boss'?9:3);this.audio.kill();
    if(enemy.type==='boss')this.ui.toast('MUTANT DOWN! +1000',1600);
  }

  explodeBarrel(barrel){
    if(!barrel.active)return;barrel.active=false;const radius=125;this.particles.burst(barrel.x,barrel.y,28,'#ff9f45',220,.6,7);this.particles.burst(barrel.x,barrel.y,18,'#4b3329',120,.8,8);this.shake=Math.max(this.shake,11);this.audio.explosion();
    for(const e of this.enemies)if(e.active){const d=Math.hypot(e.x-barrel.x,e.y-barrel.y);if(d<radius){const a=Math.atan2(e.y-barrel.y,e.x-barrel.x);const killed=e.hit(Math.round(120*(1-d/radius*.45)),a,260);if(killed)this.killEnemy(e);}}
  }

  update(dt){
    this.player.update(dt,this.input.getMoveVector(),{width:this.width,height:this.height});this.aim();
    if(this.input.isFireHeld())this.shoot();if(this.input.consumeReload()&&this.player.startReload()){this.audio.reload();this.ui.toast('Reloading');}if(this.input.consumeInteract())this.pickup();
    this.bullets.update(dt);this.particles.update(dt);this.floatText.update(dt);if(this.comboTimer>0){this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;}if(this.shake>0)this.shake=Math.max(0,this.shake-dt*25);if(this.damageVignette>0)this.damageVignette=Math.max(0,this.damageVignette-dt*2.8);if(this.muzzleFlash>0)this.muzzleFlash-=dt;

    for(const e of this.enemies)if(e.active&&e.update(dt,this.player,CONFIG.enemy.attackCooldown)){
      if(this.player.takeDamage(e.damage)){this.ui.setGameOver(this.level,{kills:this.kills,score:this.score});this.setState(GAME_STATE.GAME_OVER);break;}
      this.damageVignette=.55;this.shake=Math.max(this.shake,6);this.ui.flashDamage();this.audio.hurt();
    }

    for(const b of this.bullets.items)if(b.active){
      let consumed=false;
      for(const barrel of this.barrels)if(barrel.active){const dx=b.x-barrel.x,dy=b.y-barrel.y;if(dx*dx+dy*dy<18*18){barrel.hp-=b.damage;b.active=false;consumed=true;if(barrel.hp<=0)this.explodeBarrel(barrel);break;}}
      if(consumed)continue;
      for(const e of this.enemies)if(e.active){const dx=b.x-e.x,dy=b.y-e.y,r=e.radius+4;if(dx*dx+dy*dy<=r*r){b.active=false;const killed=e.hit(b.damage,b.angle,110);this.floatText.spawn(e.x,e.y-12,`${b.damage}`,killed?'#ffe46b':'#ffb0a8',12);this.particles.burst(b.x,b.y,killed?7:3,'#832b27',95,.28,3);killed?this.killEnemy(e):this.audio.hit();break;}}
    }

    const n=this.count();this.hud();
    if(n===0&&this.state===GAME_STATE.PLAYING){if(this.level>=CONFIG.maxLevel)this.setState(GAME_STATE.WIN);else{this.ui.setLevelComplete(this.level,{kills:this.levelKills,score:this.score});this.setState(GAME_STATE.LEVEL_COMPLETE);}}
    this.audio.updateMusic(dt,true);
  }
  hud(){this.ui.updateHud(this.level,this.count(),this.player,{score:this.score,combo:this.combo});}

  drawBg(){
    const c=this.ctx;const night=this.level>=7,dusk=this.level>=4;
    c.fillStyle=night?'#151d22':dusk?'#262b25':'#2b382b';c.fillRect(0,0,this.width,this.height);

    const roadY=this.height*.44,roadH=Math.max(90,this.height*.22);c.fillStyle=night?'#20252a':'#303532';c.fillRect(0,roadY, this.width,roadH);
    c.fillStyle=night?'#33383c':'#464b46';c.fillRect(0,roadY-12,this.width,12);c.fillRect(0,roadY+roadH,this.width,12);
    c.strokeStyle='rgba(238,211,112,.25)';c.lineWidth=3;c.setLineDash([24,24]);c.beginPath();c.moveTo(0,roadY+roadH/2);c.lineTo(this.width,roadY+roadH/2);c.stroke();c.setLineDash([]);

    for(const s of this.scenery){c.fillStyle=`rgba(220,230,220,${s.a})`;c.beginPath();c.arc(s.x,s.y,s.r,0,Math.PI*2);c.fill();}
    this.drawCar(c,this.width*.18,roadY+roadH*.3,-.08,'#59616a');this.drawCar(c,this.width*.73,roadY+roadH*.67,.08,'#654d48');
    this.drawBarricade(c,this.width*.46,roadY-28);this.drawBarricade(c,this.width*.88,roadY+roadH+28);

    c.fillStyle='rgba(92,22,22,.22)';for(const p of[[.28,.31,22],[.62,.77,18],[.83,.24,12],[.42,.57,10]]){c.beginPath();c.ellipse(p[0]*this.width,p[1]*this.height,p[2],p[2]*.55,.3,0,Math.PI*2);c.fill();}

    if(night){const g=c.createRadialGradient(this.player.x,this.player.y,80,this.player.x,this.player.y,Math.max(this.width,this.height)*.65);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(1,5,10,.56)');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);}
    else if(dusk){c.fillStyle='rgba(74,49,42,.08)';c.fillRect(0,0,this.width,this.height);}
  }
  drawCar(c,x,y,rot,color){c.save();c.translate(x,y);c.rotate(rot);c.fillStyle='rgba(0,0,0,.23)';c.fillRect(-35,-14,76,34);c.fillStyle=color;c.fillRect(-38,-18,76,30);c.fillStyle='#23292c';c.fillRect(-17,-15,31,20);c.fillStyle='#171717';c.fillRect(-28,11,14,8);c.fillRect(17,11,14,8);c.restore();}
  drawBarricade(c,x,y){c.save();c.translate(x,y);c.fillStyle='#5f4932';c.fillRect(-28,-5,56,10);c.fillStyle='#d6b347';for(let i=-20;i<=20;i+=20)c.fillRect(i,-8,8,16);c.restore();}

  drawPickups(){
    const c=this.ctx;for(const p of this.pickups){c.save();c.translate(p.x,p.y);const pulse=1+Math.sin(performance.now()/220+p.x)*.06;c.scale(pulse,pulse);
      if(p.type==='weapon'){c.fillStyle='#f0c74f';c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fill();c.fillStyle='#171817';c.fillRect(-14,-5,29,9);c.fillRect(-4,4,9,11);c.fillStyle='#fff';c.font='800 11px Arial';c.textAlign='center';c.fillText(p.weapon.name,0,38);}
      else if(p.type==='medkit'){c.fillStyle='#e9ece9';c.fillRect(-17,-14,34,28);c.fillStyle='#d73934';c.fillRect(-4,-10,8,20);c.fillRect(-10,-4,20,8);c.fillStyle='#fff';c.font='800 10px Arial';c.textAlign='center';c.fillText('MEDKIT',0,38);}
      else{c.fillStyle='#5075a9';c.fillRect(-17,-13,34,26);c.fillStyle='#d8e8ff';for(let i=-10;i<=10;i+=10)c.fillRect(i,-8,5,16);c.fillStyle='#fff';c.font='800 10px Arial';c.textAlign='center';c.fillText('AMMO',0,38);}
    c.restore();}
  }
  drawBarrels(){const c=this.ctx;for(const b of this.barrels)if(b.active){c.save();c.translate(b.x,b.y);c.fillStyle='#6e2b27';c.fillRect(-13,-19,26,38);c.fillStyle='#b24639';c.fillRect(-12,-12,24,5);c.fillRect(-12,8,24,5);c.fillStyle='#f2c94c';c.beginPath();c.arc(0,-1,7,0,Math.PI*2);c.fill();c.fillStyle='#4c1c19';c.font='900 10px Arial';c.textAlign='center';c.fillText('!',0,3);c.restore();}}
  drawEffects(){
    const c=this.ctx;
    if(this.muzzleFlash>0){const x=this.player.x+Math.cos(this.player.angle)*48,y=this.player.y+Math.sin(this.player.angle)*48;c.fillStyle='rgba(255,220,110,.9)';c.beginPath();c.arc(x,y,7+this.muzzleFlash*50,0,Math.PI*2);c.fill();}
    if(this.damageVignette>0){const g=c.createRadialGradient(this.width/2,this.height/2,Math.min(this.width,this.height)*.25,this.width/2,this.height/2,Math.max(this.width,this.height)*.72);g.addColorStop(0,'rgba(110,0,0,0)');g.addColorStop(1,`rgba(155,0,0,${Math.min(.42,this.damageVignette)})`);c.fillStyle=g;c.fillRect(0,0,this.width,this.height);}
  }
  draw(){
    const c=this.ctx;c.save();if(this.shake>0)c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
    this.drawBg();this.drawPickups();this.drawBarrels();this.bullets.draw(c);this.particles.draw(c);for(const e of this.enemies)e.draw(c,this.player);this.player.draw(c);this.floatText.draw(c);this.drawEffects();c.restore();
  }
  loop(t){if(!this.last)this.last=t;const dt=Math.min((t-this.last)/1000,.05);this.last=t;if(this.state===GAME_STATE.PLAYING)this.update(dt);this.draw();requestAnimationFrame(n=>this.loop(n));}
  pause(){if(this.state===GAME_STATE.PLAYING)this.setState(GAME_STATE.PAUSED);}
  resume(){if(this.state===GAME_STATE.PAUSED){this.last=performance.now();this.setState(GAME_STATE.PLAYING);}}
  toMenu(){this.input.clearTransient();this.setState(GAME_STATE.MENU);}
  handleVisibility(hidden){if(hidden&&this.state===GAME_STATE.PLAYING)this.pause();this.last=performance.now();}
}

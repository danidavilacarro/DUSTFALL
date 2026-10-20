/* DUSTFALL v0.3 — colony crews, raiders, live indicators and day/night.
   Additive module: reuses the v0.1 save and the v0.2 director; no new tick timer. */
'use strict';
(() => {
  const ROLES = [
    ['water','💧','Condensador de agua'],
    ['food','🌱','Invernadero'],
    ['energy','⚡','Planta solar'],
    ['scrap','⚙','Taller de recuperación'],
    ['guard','⛨','Defensa perimetral'],
    ['medical','✚','Equipo sanitario']
  ];
  const DEFAULT_CREW = {water:3,food:3,energy:3,scrap:2,guard:1,medical:0};
  const valid = n => Number.isInteger(n) && n >= 0 && n <= 100;
  const safeNum = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function v3(){
    if (!state.v03 || typeof state.v03 !== 'object') state.v03 = {};
    const d = state.v03;
    if (!d.crew || typeof d.crew !== 'object') d.crew={...DEFAULT_CREW};
    for(const [id] of ROLES) if(!valid(d.crew[id])) d.crew[id]=DEFAULT_CREW[id];
    if(!Array.isArray(d.raids)) d.raids=[];
    if(!Number.isInteger(d.lastTick)||d.lastTick<0) d.lastTick=state.tick;
    if(typeof d.pendingRaid !== 'number') d.pendingRaid=0;
    return d;
  }
  function crewAvailable(){return Math.max(0,state.pop-state.sick-(state.expedition?3:0))}
  function crewTotal(){return ROLES.reduce((n,[id])=>n+v3().crew[id],0)}
  function crewFree(){return Math.max(0,crewAvailable()-crewTotal())}
  function crewEffective(id){
    const assigned=v3().crew[id];
    const capacity=crewAvailable();
    const sum=crewTotal();
    return sum<=capacity?assigned:assigned*capacity/Math.max(1,sum);
  }
  function needed(id){return 4+Math.max(0,state.levels[id]-1)*2}
  function defense(){return Math.floor(state.levels.wall*24+state.levels.core*7+crewEffective('guard')*12)}
  function force(){return 24+state.day*4}
  const previousGain=gain;
  gain=function(id){
    const base=previousGain(id);
    if(!['water','food','energy','scrap'].includes(id))return base;
    if(!state.levels[id])return 0;
    // Every active site requires a crew: understaffing costs actual hourly production.
    return base*safeNum(.18+.82*crewEffective(id)/needed(id),.18,1.25);
  };
  function crewSection(){
    const d=v3(),total=crewTotal(),available=crewAvailable();
    const overload=total>available;
    return `<section class="crew-section" aria-label="Asignación de trabajadores"><div class="section-title">ASIGNACIÓN REAL DE TRABAJADORES</div><p class="descr">Elige dónde trabajan tus colonos. Más personal aumenta la producción y las defensas; los enfermos y exploradores reducen la plantilla disponible.</p><div class="crew-summary"><span>EN SERVICIO <strong>${total} / ${available}</strong></span><span class="${overload?'low':'good'}">${overload?'FALTAN '+(total-available)+' COLONOS':crewFree()+' SIN ASIGNAR'}</span></div>${ROLES.map(([id,icon,name])=>{
      const assigned=d.crew[id],built=(id==='guard'||id==='medical')?state.levels[id==='guard'?'wall':'clinic']>0:state.levels[id]>0;
      const active=built || id==='guard';
      const effective=crewEffective(id);
      const performance=['water','food','energy','scrap'].includes(id)?`${Math.round(gain(id))}/h`:id==='guard'?`DEFENSA ${defense()}`:state.levels.clinic?`${Math.round(effective)} MÉDICOS`:'CONSTRUIR CLÍNICA';
      return `<div class="crew-line ${!active?'crew-locked':''}"><span class="crew-icon">${icon}</span><div class="crew-meta"><strong>${name}</strong><small>${performance}</small></div><div class="crew-actions"><button type="button" data-crew="${id}" data-delta="-1" aria-label="Quitar un trabajador de ${name}" ${assigned<1?'disabled':''}>−</button><output>${assigned}</output><button type="button" data-crew="${id}" data-delta="1" aria-label="Añadir un trabajador a ${name}" ${!active||crewFree()===0?'disabled':''}>+</button></div></div>`;
    }).join('')}<div class="crew-help">Los guardias defienden el asentamiento. Los médicos aceleran la recuperación cuando hay una clínica construida.</div></section>`;
  }
  const previousPeople=panelPeople;
  panelPeople=function(){
    const previous=previousPeople();
    return previous.replace('<div class="section-title">PRIORIDAD DE PRODUCCIÓN</div>',crewSection()+'<div class="section-title">PRIORIDAD DE PRODUCCIÓN</div>');
  };
  const previousCity=panelCity;
  panelCity=function(){
    const existing=previousCity();
    const id=state.selected;
    if(!id||!['water','food','energy','scrap','clinic','wall'].includes(id))return existing;
    const role=id==='clinic'?'medical':id==='wall'?'guard':id;
    return existing.replace('<div class="section-title">OBJETIVO INMEDIATO</div>',`<div class="crew-mini"><span>PERSONAL ASIGNADO</span><strong>${v3().crew[role]} COLONOS</strong><button type="button" data-tabgo="people">GESTIONAR →</button></div><div class="section-title">OBJETIVO INMEDIATO</div>`);
  };
  function raidModal(){
    const d=v3();if(!d.pendingRaid||state.dead)return;
    if(state.v02?.pendingEvent)return;
    if(!$('modal').classList.contains('hidden'))return;
    const attack=force(),guard=defense(),cost={scrap:55,energy:25},bribe={scrap:45,food:65};
    $('modal').classList.remove('hidden');
    $('modal').innerHTML=`<div class="dialog crisis-dialog"><div class="overline">⚠ AMENAZA · DÍA ${d.pendingRaid}</div><h2>Saqueadores ante las puertas</h2><p class="descr">Un grupo armado ha detectado el asentamiento. Los vigías solicitan órdenes. La defensa depende de tus guardias, del muro y del Núcleo.</p><div class="briefing-grid"><div><small>FUERZA ENEMIGA</small><strong class="low">${attack}</strong></div><div><small>DEFENSA DEL REFUGIO</small><strong class="${guard<attack?'low':'good'}">${guard}</strong></div></div><div class="decision-list"><button class="decision" data-raid="hold"><strong>Resistir tras el perímetro →</strong><span>Sin coste inmediato. Si las defensas no bastan, habrá heridos y daños.</span></button><button class="decision" data-raid="fortify" ${canPay(cost)?'':'disabled'}><strong>Fortificar posiciones →</strong><span>−55 chatarra, −25 energía. +40 defensa durante este ataque.</span></button><button class="decision" data-raid="trade" ${canPay(bribe)?'':'disabled'}><strong>Entregar provisiones →</strong><span>−45 chatarra, −65 comida. Evita el combate; baja la moral.</span></button></div><p class="microcopy">La amenaza no desaparece hasta decidir. Tus elecciones modifican el estado real de la colonia.</p></div>`;
  }
  function resolveRaid(action){
    const d=v3();if(!d.pendingRaid||state.dead)return;
    if(!['hold','fortify','trade'].includes(action))return;
    const fortify={scrap:55,energy:25},trade={scrap:45,food:65};
    if(action==='fortify'&&!canPay(fortify))return toast('No hay suficientes recursos para fortificar.');
    if(action==='trade'&&!canPay(trade))return toast('No hay provisiones suficientes para negociar.');
    const attack=force(),def=defense()+(action==='fortify'?40:0);
    let injuries=0,damage=0;
    if(action==='trade'){
      pay(trade);state.morale=safeNum(state.morale-5,0,100);
      log('La colonia ha pagado a los saqueadores para evitar un asalto.');
    }else{
      if(action==='fortify')pay(fortify);
      const deficit=Math.max(0,attack-def);
      injuries=Math.min(Math.max(0,state.pop-state.sick-1),Math.floor(deficit/16));
      damage=Math.ceil(deficit*.8);
      if(injuries>0){state.sick+=injuries;state.morale=safeNum(state.morale-injuries*3,0,100)}
      if(state.v02)state.v02.integrity=safeNum((state.v02.integrity??100)-damage,0,100);
      if(deficit===0){state.morale=safeNum(state.morale+4,0,100);state.resources.scrap+=20;log('Las defensas han repelido a los saqueadores. +20 chatarra recuperada.');}
      else{log(`El ataque ha dejado ${injuries} heridos y ${damage}% de daño estructural.`)}
    }
    d.raids.push({day:d.pendingRaid,action,attack,defense:def,injuries,damage});
    d.raids=d.raids.slice(-12);d.pendingRaid=0;
    $('modal').classList.add('hidden');toast(action==='trade'?'Se evitó el combate':injuries?'⚠ Ataque resistido con bajas':'✓ Perímetro asegurado');render();save();
  }
  function v3Tick(){
    const d=v3();if(state.tick===d.lastTick||state.dead)return;
    const last=d.lastTick;d.lastTick=state.tick;
    if(state.levels.clinic>0&&state.sick>0&&crewEffective('medical')>=2&&state.resources.medicine>=1&&state.tick%6===0){
      state.sick--;state.resources.medicine--;log('El equipo médico ha recuperado antes a un superviviente.');
    }
    // First raid on day 4, then every 4 days. Trigger once per day, not per interval call.
    if(state.day>=4 && state.day%4===0 && state.hour>=10 && !d.raids.some(r=>r.day===state.day) && !d.pendingRaid && (last!==state.tick)){
      d.pendingRaid=state.day;
      log('Alerta en el perímetro: se aproxima una banda de saqueadores.');
    }
    if(d.pendingRaid)raidModal();
    save();render();
  }
  const oldRender=render;
  render=function(){
    oldRender();
    const d=v3();
    let hud=$('colonyDefenses');
    if(!hud){hud=document.createElement('div');hud.id='colonyDefenses';hud.className='colony-threat';$('world').append(hud)}
    if(d.pendingRaid){hud.innerHTML='⚠ SAQUEADORES EN EL PERÍMETRO';hud.classList.add('raid-alert')}
    else{hud.textContent=`⛨ DEFENSA ${defense()} · ${crewFree()} COLONOS LIBRES`;hud.classList.remove('raid-alert')}
    const crewPanel=$('panelContent').querySelector('.crew-section');if(crewPanel)crewPanel.dataset.staffed=crewTotal();
    const badge=$('versionBadge');if(badge)badge.textContent='ALPHA 0.3';
  };
  const oldDraw=draw;
  draw=function(){
    oldDraw();
    if(!viewport.w||!viewport.h)return;
    const k=viewport.k;
    const night=state.hour>=20||state.hour<6;
    if(night){
      ctx.fillStyle='rgba(4,13,27,.31)';ctx.fillRect(0,0,viewport.w,viewport.h);
      for(const id of ['core','housing','clinic','energy','radar']){
        if(!state.levels[id])continue;
        const [x,y]=coords(...DB[id].xy);
        const light=ctx.createRadialGradient(x,y-27*k,0,x,y-27*k,45*k);
        light.addColorStop(0,'rgba(255,192,107,.20)');light.addColorStop(1,'rgba(255,192,107,0)');
        ctx.fillStyle=light;ctx.fillRect(x-48*k,y-75*k,96*k,95*k);
        ctx.fillStyle='#ffd794';ctx.fillRect(x-3*k,y-28*k,5*k,8*k);
      }
    }
    if(v3().pendingRaid){
      const t=performance.now()/1000;
      for(const p of [[0,3],[6,3]]){
        const [x,y]=coords(...p);
        ctx.fillStyle=`rgba(255,95,60,${.25+.18*Math.sin(t*5)})`;
        ctx.beginPath();ctx.arc(x,y-15*k,8*k,0,Math.PI*2);ctx.fill();
      }
    }
  };
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.crew){
      const role=b.dataset.crew,delta=Number(b.dataset.delta);
      if(!ROLES.some(([id])=>id===role)||![-1,1].includes(delta))return;
      const d=v3();
      if(delta===1&&crewFree()<1)return toast('No quedan trabajadores disponibles.');
      if(delta===-1&&d.crew[role]===0)return;
      if(delta===1&&role==='medical'&&!state.levels.clinic)return toast('Construye antes el puesto médico.');
      d.crew[role]+=delta;save();render();
    }
    if(b.dataset.raid)resolveRaid(b.dataset.raid);
    if(b.dataset.modalclose && v3().pendingRaid)raidModal();
  });
  // v0.2 uses its own observer; this one follows the same simulation ticks.
  setInterval(()=>{v3Tick();if(v3().pendingRaid)raidModal()},500);
  const previousSettings=openSettings;
  openSettings=function(){previousSettings();$('modal').innerHTML=$('modal').innerHTML.replace('ALPHA 0.2','ALPHA 0.3')};
  $('settingsBtn').onclick=openSettings;
  v3();render();save();
})();

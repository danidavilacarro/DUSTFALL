/* DUSTFALL v0.2 — survival director, mission progression and atmosphere.
   Loads AFTER game.js. Existing local saves and all original mechanics are retained. */
'use strict';
(() => {
  const clamp2 = (n, min, max) => Math.max(min, Math.min(max, n));
  const MISSIONS = [
    {id:'core', title:'Fortalece el Núcleo Atmosférico', detail:'Mejora el núcleo al nivel 2.', target:'core', done:()=>state.levels.core>=2, reward:{scrap:40,energy:30}},
    {id:'clinic', title:'Habilita atención médica', detail:'Construye el puesto médico.', target:'clinic', done:()=>state.levels.clinic>=1, reward:{medicine:8,food:40}},
    {id:'storm', title:'Resiste el primer temporal', detail:'Mantén con vida al refugio hasta el día 3.', target:'core', done:()=>state.day>=3 && !state.dead, reward:{water:90,food:80}},
    {id:'radar', title:'Abre el mundo exterior', detail:'Construye una torre exploradora.', target:'radar', done:()=>state.levels.radar>=1, reward:{scrap:90,energy:40}},
    {id:'scout', title:'Recupera recursos del páramo', detail:'Completa tu primera expedición.', tab:'scout', done:()=>getDirector().expeditionsDone>=1, reward:{medicine:8,water:65}}
  ];
  const EVENTS = {
    leak: {
      label:'ALERTA ATMOSFÉRICA', title:'Fisura en los conductos', icon:'☣',
      intro:'Los sensores han detectado polvo tóxico en la red de ventilación. El equipo de mantenimiento pide una decisión urgente.',
      choices:[
        {name:'Sellar la fuga',desc:'Consume 35 de chatarra; +20 integridad y +10 aire.',cost:{scrap:35},apply:()=>{getDirector().integrity=clamp2(getDirector().integrity+20,0,100);state.air=clamp2(state.air+10,0,100);log('La fuga ha sido sellada. El aire vuelve a circular.')}},
        {name:'Mantener producción',desc:'Ahorras materiales; -18 aire y -7 de moral.',cost:{},apply:()=>{state.air=clamp2(state.air-18,0,100);state.morale=clamp2(state.morale-7,0,100);log('Se mantuvo la producción, pero el aire empeora.')}}
      ]
    },
    refugees: {
      label:'SEÑAL EXTERIOR', title:'Una familia pide asilo', icon:'♙',
      intro:'Tres supervivientes llegan desde el norte. Tienen conocimientos útiles, pero necesitan agua y alojamiento.',
      choices:[
        {name:'Abrir las puertas',desc:'-55 comida, -45 agua; hasta +3 habitantes y +7 moral.',cost:{food:55,water:45},apply:()=>{const incoming=Math.min(3,maxPopulation()-state.pop);state.pop+=Math.max(0,incoming);state.morale=clamp2(state.morale+7,0,100);log(`${incoming} supervivientes han encontrado refugio en Esperanza.`)}},
        {name:'Compartir provisiones',desc:'-25 comida, -20 agua; +3 moral.',cost:{food:25,water:20},apply:()=>{state.morale=clamp2(state.morale+3,0,100);log('La colonia comparte suministros con los viajeros.')}},
        {name:'Cerrar el perímetro',desc:'Conservas recursos; -8 moral.',cost:{},apply:()=>{state.morale=clamp2(state.morale-8,0,100);log('El perímetro permanece cerrado. La decisión divide a la colonia.')}}
      ]
    },
    convoy: {
      label:'RADIO DE EMERGENCIA', title:'Convoy atrapado en la arena', icon:'⌖',
      intro:'Un transporte de suministros emite una señal de auxilio. Enviar ayuda puede salvar vidas, pero el exterior sigue siendo peligroso.',
      choices:[
        {name:'Enviar equipo de rescate',desc:'-40 energía, -30 comida; +85 chatarra, +3 medicinas.',cost:{energy:40,food:30},apply:()=>{state.resources.scrap+=85;state.resources.medicine+=3;state.morale=clamp2(state.morale+5,0,100);log('Los exploradores recuperan el convoy y regresan sanos.')}},
        {name:'Marcar ubicación',desc:'No consumes nada, pero pierdes la oportunidad de rescate.',cost:{},apply:()=>{log('La señal del convoy desaparece del radar.')}}
      ]
    }
  };
  function getDirector(){
    if(!state.v02 || typeof state.v02!=='object') state.v02={};
    const d=state.v02;
    if(!Number.isFinite(d.integrity)) d.integrity=100;
    if(typeof d.shelter!=='boolean') d.shelter=false;
    if(!Array.isArray(d.claimed)) d.claimed=[];
    if(!Array.isArray(d.seenEvents)) d.seenEvents=[];
    if(!Number.isInteger(d.expeditionsDone)) d.expeditionsDone=0;
    if(!Number.isInteger(d.lastTick)) d.lastTick=state.tick;
    if(typeof d.pendingEvent!=='string') d.pendingEvent='';
    return d;
  }
  getDirector();
  const nextStorm = () => {
    if(storming()) return 'TORMENTA TÓXICA · EN CURSO';
    if(state.day<2 || (state.day===2&&state.hour<7)) return 'Próxima tormenta · día 2, 07:00';
    let day=state.day;
    while(day%3!==0 || day<=2 || (day===state.day&&state.hour>=8)) day++;
    return `Próxima tormenta · día ${day}, 08:00`;
  };
  function missionNow(){return MISSIONS.find(m=>!getDirector().claimed.includes(m.id))}
  function rewardMissions(){
    const d=getDirector();
    for(const m of MISSIONS){
      if(!d.claimed.includes(m.id)&&m.done()){
        d.claimed.push(m.id);
        for(const [k,v] of Object.entries(m.reward)) state.resources[k]+=v;
        log(`Objetivo completado: ${m.title}. Suministros de recompensa recibidos.`);
        toast(`✓ Objetivo completado · ${m.title}`);
      }
    }
  }
  function repair(){
    const d=getDirector(),cost={scrap:45,energy:20};
    if(d.integrity>=100) return toast('Los conductos están al máximo de integridad.');
    if(!canPay(cost)) return toast('Necesitas 45 de chatarra y 20 de energía.');
    pay(cost);d.integrity=clamp2(d.integrity+28,0,100);log('Equipo de mantenimiento: conductos reparados.');render();save();
  }
  function chooseEvent(choiceIndex){
    const d=getDirector(),ev=EVENTS[d.pendingEvent],choice=ev?.choices[choiceIndex];
    if(!choice)return;
    if(!canPay(choice.cost))return toast('No hay recursos suficientes para esta decisión.');
    pay(choice.cost);choice.apply();d.seenEvents.push(d.pendingEvent);d.pendingEvent='';
    $('modal').classList.add('hidden');rewardMissions();render();save();
  }
  function showEvent(){
    const d=getDirector(),ev=EVENTS[d.pendingEvent];if(!ev)return;
    $('modal').classList.remove('hidden');
    $('modal').innerHTML=`<div class="dialog crisis-dialog"><div class="overline">${ev.icon} ${ev.label}</div><h2>${ev.title}</h2><p class="descr">${ev.intro}</p><div class="decision-list">${ev.choices.map((c,i)=>`<button class="decision" data-eventchoice="${i}" ${!canPay(c.cost)?'disabled':''}><strong>${c.name} →</strong><span>${c.desc}</span></button>`).join('')}</div><p class="microcopy">Esta decisión tendrá consecuencias en la supervivencia de la colonia.</p></div>`;
  }
  function hourlyDirector(){
    const d=getDirector();
    if(state.dead||state.tick===d.lastTick)return;
    const elapsed=Math.max(1,Math.min(12,state.tick-d.lastTick));d.lastTick=state.tick;
    for(let i=0;i<elapsed;i++){
      if(d.shelter){
        state.resources.energy=Math.max(0,state.resources.energy-7);
        state.resources.scrap=Math.max(0,state.resources.scrap-3*state.levels.scrap);
        state.air=clamp2(state.air+(storming()?2.6:.35),0,100);
        state.morale=clamp2(state.morale+.45,0,100);
      }
      if(storming()){
        const damage=(1.3+2.8/Math.max(1,state.levels.wall+1))*(d.shelter?.38:1);
        d.integrity=clamp2(d.integrity-damage,0,100);
      }else if(d.integrity<100 && state.resources.scrap>8 && state.tick%6===0){
        d.integrity=clamp2(d.integrity+1.3,0,100);
      }
      if(d.integrity<40){state.air=clamp2(state.air-2.6,0,100);state.morale=clamp2(state.morale-.7,0,100)}
    }
    if(state.day===2&&state.hour>=5&&!d.seenEvents.includes('leak')&&!d.pendingEvent){d.pendingEvent='leak';showEvent()}
    if(state.day>=3&&state.hour>=10&&!d.seenEvents.includes('refugees')&&!d.pendingEvent){d.pendingEvent='refugees';showEvent()}
    if(state.day>=5&&state.hour>=7&&!d.seenEvents.includes('convoy')&&!d.pendingEvent){d.pendingEvent='convoy';showEvent()}
    rewardMissions();save();render();
  }
  function survivalReport(){
    const d=getDirector(),m=missionNow();
    const net={water:gain('water')-state.pop*1.06,food:gain('food')-state.pop*.89,energy:gain('energy')-9-state.pop*.28-state.levels.core*1.7};
    $('modal').classList.remove('hidden');
    $('modal').innerHTML=`<div class="dialog crisis-dialog"><div class="overline">INFORME DEL REFUGIO · DÍA ${state.day}</div><h2>Estado de supervivencia</h2><div class="briefing-grid"><div><small>FILTRACIÓN</small><strong>${Math.floor(state.air)}%</strong></div><div><small>INTEGRIDAD</small><strong class="${d.integrity<50?'low':''}">${Math.floor(d.integrity)}%</strong></div><div><small>MORAL</small><strong>${Math.floor(state.morale)}%</strong></div><div><small>COLONOS</small><strong>${state.pop}</strong></div></div><div class="section-title">BALANCE POR HORA</div>${Object.entries(net).map(([k,v])=>`<div class="reportline"><span>${R[k].icon} ${R[k].label}</span><strong class="${v<0?'low':'good'}">${v>0?'+':''}${Math.round(v)}</strong></div>`).join('')}<div class="section-title">OBJETIVO ACTUAL</div><p class="descr">${m?m.title+' · '+m.detail:'Has completado el primer capítulo de supervivencia.'}</p><p class="microcopy">${nextStorm()}</p><button class="button secondary" data-modalclose="1">VOLVER A LA CIUDAD</button></div>`;
  }
  function paintAtmosphere(){
    const w=viewport.w,h=viewport.h,k=viewport.k,t=performance.now()/1000;
    if(!w||!h)return;
    // Warm containment aura around the reactor, breathing as energy/air fluctuates.
    const center=coords(3,3),cx=center[0],cy=center[1]-43*k;
    const pulse=.8+.12*Math.sin(t*2.1);
    const glow=ctx.createRadialGradient(cx,cy,4*k,cx,cy,(state.levels.core*70+96)*k);
    glow.addColorStop(0,`rgba(246,177,85,${.15*pulse})`);glow.addColorStop(.35,`rgba(234,159,78,${.08*pulse})`);glow.addColorStop(1,'rgba(234,159,78,0)');
    ctx.fillStyle=glow;ctx.fillRect(cx-210*k,cy-210*k,420*k,420*k);
    // Activated filtration beacon.
    ctx.lineWidth=Math.max(1,k*1.7);ctx.strokeStyle='rgba(255,218,133,.68)';
    ctx.beginPath();ctx.ellipse(cx,cy-21*k,13*k,5*k,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=`rgba(255,213,129,${.35+.3*Math.sin(t*3)})`;
    ctx.beginPath();ctx.arc(cx,cy-21*k,3.8*k,0,6.283);ctx.fill();
    // Passing dust and slow particulate movement; repeated deterministic positions.
    const storm=storming();
    for(let i=0;i<(storm?65:25);i++){
      const seed=i*137.43,xx=((seed+t*(storm?125:22))%(w+100)+w+100)%(w+100)-50;
      const yy=((i*59.2+t*(storm?14:3))%h);
      ctx.strokeStyle=storm?'rgba(239,173,108,.2)':'rgba(240,201,144,.12)';ctx.lineWidth=(i%3+1)*.5;
      ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+(storm?12:3),yy-(storm?4:1));ctx.stroke();
    }
    // Perimeter security beacons show presence of the defenses.
    if(state.levels.wall){for(const [a,b] of [[0,0],[6,0],[6,6],[0,6]]){
      const [x,y]=coords(a,b);ctx.fillStyle='#463c32';ctx.fillRect(x-3*k,y-18*k,6*k,16*k);
      ctx.fillStyle=`rgba(252,124,75,${.55+.3*Math.sin(t*2.3+a+b)})`;
      ctx.beginPath();ctx.arc(x,y-21*k,3.5*k,0,Math.PI*2);ctx.fill();
    }}
    // Ground level view vignette without blocking building selection.
    const vignette=ctx.createRadialGradient(w/2,h*.50,Math.min(w,h)*.14,w/2,h*.5,Math.max(w,h)*.75);
    vignette.addColorStop(0,'rgba(5,8,9,0)');vignette.addColorStop(1,'rgba(4,7,9,.28)');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  const originalDraw=draw;
  draw=function(){originalDraw();paintAtmosphere()};
  const originalCity=panelCity;
  panelCity=function(){
    const base=originalCity();const d=getDirector();const warn=d.integrity<50?'low':'';
    return base.replace('</div>', '</div>') // Preserve original structure and append one compact mechanics panel.
      .replace(/<\/div>\s*$/, `<div class="section-title">ESTADO DE LOS CONDUCTOS</div><div class="integrity"><div class="row"><span>Integridad estructural</span><strong class="${warn}">${Math.floor(d.integrity)}%</strong></div><div class="progress"><span style="width:${d.integrity}%;background:${d.integrity<45?'#df765c':'linear-gradient(90deg,#9cb3a4,#e7bc73)'}"></span></div><p class="descr">Las tormentas dañan el refugio. Un perímetro defensivo y el protocolo de refugio reducen el desgaste.</p><button class="button secondary" data-repair="1" ${d.integrity>=100||!canPay({scrap:45,energy:20})?'disabled':''}>REPARAR CONDUCTOS · 45 ⚙ / 20 ⚡</button></div></div>`);
  };
  const originalPeople=panelPeople;
  panelPeople=function(){const d=getDirector();return originalPeople().replace(/<\/div>\s*$/,`<div class="section-title">PROTOCOLO DE EMERGENCIA</div><p class="descr">Sellar refugios consume +7 de energía por hora y reduce recuperación de chatarra, pero protege aire y moral.</p><button class="button ${d.shelter?'':'secondary'}" data-shelter="1">${d.shelter?'DESACTIVAR PROTOCOLO':'ACTIVAR PROTOCOLO'}</button></div>`)};
  panelScout=function(){
    const d=getDirector();const radar=state.levels.radar;
    return `<div class="panel-inner"><div class="overline">CARTOGRAFÍA · FRONTERA EXTERIOR</div><h2>Más allá del muro</h2><p class="descr">Rastrea ruinas reales del sector y envía exploradores. El riesgo aumenta cuanto más lejos te alejas del Núcleo.</p><div class="sector-map"><div class="map-grid"></div><div class="sector-road road-a"></div><div class="sector-road road-b"></div><span class="sector-pin safe">◆<small>REFUGIO</small></span><span class="sector-pin target p1">◈<small>CONVOY</small></span><span class="sector-pin target p2">◈<small>ACUÍFERO</small></span><span class="sector-pin target p3">◈<small>ESTACIÓN</small></span><div class="sector-coordinates">SECTOR 07 / PÁRAMO DEL ESTE</div></div><div class="exploration-score"><span>EXPEDICIONES COMPLETADAS</span><strong>${d.expeditionsDone}</strong></div>${!radar?`<div class="listentry"><h3>⌖ Torre exploradora bloqueada</h3><p>Necesitas construir la torre antes de desplegar equipos en el páramo.</p><button class="button" data-select="radar">CONSTRUIR TORRE →</button></div>`:state.expedition?`<div class="listentry"><h3>🚙 Equipo en ruta</h3><p>${ROUTES[state.expedition.route].name} · Regresa en ${pendingTime(state.expedition.ends)}</p><div class="progress"><span style="width:${clamp2(100-(state.expedition.ends-Date.now())/ROUTES[state.expedition.route].time*100,2,100)}%"></span></div></div>`:''}${Object.entries(ROUTES).map(([id,e],i)=>`<div class="expedition-option"><div class="row"><h3><span class="destination-index">0${i+1}</span> ${e.name}</h3><span class="pill">TORRE NV. ${e.min}</span></div><p>${i===0?'Convoy oxidado entre dunas. Provisiones recuperables.':i===1?'Galerías subterráneas con depósitos de agua.':'Complejo científico abandonado. Alta recompensa.'}</p><div class="route-meta"><span>◷ ${e.time/1000} segundos</span><span>💧 25</span><span>🌾 20</span></div><button class="button secondary" data-route="${id}" ${state.expedition||radar<e.min||state.resources.water<25||state.resources.food<20?'disabled':''}>${radar<e.min?'NECESITA RADAR NV. '+e.min:'ENVIAR EXPLORADORES →'}</button></div>`).join('')}</div>`;
  };
  const originalComplete=completeExpedition;
  completeExpedition=function(){if(!state.expedition)return;originalComplete();const d=getDirector();d.expeditionsDone++;if(d.expeditionsDone%3===0&&state.pop<maxPopulation()){state.pop++;log('Los exploradores han rescatado a una persona del páramo.')}rewardMissions();render();save()};
  const originalRender=render;
  render=function(){
    originalRender();const d=getDirector(),mission=missionNow();
    $('chapterNum').textContent=d.claimed.length===MISSIONS.length?'CAPÍTULO 01 SUPERADO':`CAPÍTULO 01 · ${d.claimed.length}/${MISSIONS.length}`;
    $('survivalGoal').textContent=mission?.title.toUpperCase()||'LA COLONIA SIGUE EN PIE';
    $('survivalProgress').textContent=mission?.detail||'Todos los objetivos del primer capítulo completados';
    $('stormEta').textContent=nextStorm();$('stormEta').classList.toggle('danger',storming());
    $('shelterBtn').textContent=d.shelter?'⛨ Refugios sellados · DESACTIVAR':'⛨ Activar protocolo de refugio';
    $('shelterBtn').classList.toggle('engaged',d.shelter);
    const integrityLine=document.createElement('span');integrityLine.className='integrity-chip';integrityLine.innerHTML=`◈ CONDUCTOS <strong class="${d.integrity<50?'low':''}">${Math.floor(d.integrity)}%</strong>`;
    $('statusstrip').append(integrityLine);
    document.body.classList.toggle('weather-emergency',storming());
  };
  function toggleShelter(){const d=getDirector();d.shelter=!d.shelter;log(d.shelter?'Protocolo activado: refugios sellados y producción reducida.':'Protocolo desactivado: trabajo exterior reanudado.');render();save()}
  $('shelterBtn').addEventListener('click',toggleShelter);
  $('crisisBtn').addEventListener('click',survivalReport);
  document.addEventListener('click', e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.repair)repair();
    if(b.dataset.shelter)toggleShelter();
    if(b.dataset.eventchoice!==undefined)chooseEvent(Number(b.dataset.eventchoice));
  });
  // Observe original simulation ticks without adding a second game clock.
  setInterval(hourlyDirector,500);
  let lastFrame=0;
  function animate(now){if(now-lastFrame>55){lastFrame=now;if(!document.hidden)draw()}requestAnimationFrame(animate)}
  requestAnimationFrame(animate);
  rewardMissions();render();save();
  if(getDirector().pendingEvent)showEvent();
})();

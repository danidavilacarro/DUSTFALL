/* DUSTFALL: original self-contained survival-city vertical slice.
   Cloudflare Pages static hosting compatible; no backend or network required. */
'use strict';
const KEY='dustfall-sim-v1';
const HOUR_MS=4000;
const IDS=['core','water','food','energy','scrap','housing','clinic','radar','wall'];
const DB={
 core:{name:'Núcleo Atmosférico',icon:'◈',desc:'Filtra el aire tóxico y mantiene la colonia habitable. Su nivel limita el resto de construcciones.',xy:[3,3],base:{scrap:105,energy:40,water:30},produces:'Protección atmosférica'},
 water:{name:'Condensador de agua',icon:'💧',desc:'Recupera agua de las capas profundas del subsuelo. Cada nivel aumenta el suministro.',xy:[1,3],base:{scrap:65,energy:18},produces:'Agua'},
 food:{name:'Invernadero hidropónico',icon:'🌱',desc:'Produce alimentos bajo una cubierta sellada. Mantiene vivos a los habitantes.',xy:[5,3],base:{scrap:72,water:30},produces:'Alimentos'},
 energy:{name:'Planta solar',icon:'⚡',desc:'Recoge energía del sol y la almacena. La filtración y los servicios dependen de ella.',xy:[3,1],base:{scrap:70,water:18},produces:'Energía'},
 scrap:{name:'Taller de recuperación',icon:'🔧',desc:'Recicla restos de tecnología antigua para obtener chatarra de construcción.',xy:[1,5],base:{scrap:50,energy:20},produces:'Chatarra'},
 housing:{name:'Refugios habitables',icon:'⌂',desc:'Aumenta la capacidad de la colonia y el bienestar de los residentes.',xy:[5,5],base:{scrap:75,water:25},produces:'Capacidad'},
 clinic:{name:'Puesto médico',icon:'✚',desc:'Atiende a los supervivientes enfermos. Reduce las bajas tras las tormentas.',xy:[5,1],base:{scrap:95,energy:40,medicine:4},produces:'Salud'},
 radar:{name:'Torre exploradora',icon:'⌖',desc:'Localiza ruinas, suministros y posibles supervivientes en los páramos.',xy:[3,5],base:{scrap:130,energy:65},produces:'Expediciones'},
 wall:{name:'Defensas perimetrales',icon:'⛨',desc:'Protege el refugio de saqueadores y amortigua las tormentas de arena.',xy:[1,1],base:{scrap:95,energy:25},produces:'Defensa'}
};
const R={water:{label:'AGUA',icon:'💧'},food:{label:'COMIDA',icon:'🌾'},scrap:{label:'CHATARRA',icon:'⚙'},energy:{label:'ENERGÍA',icon:'⚡'},medicine:{label:'MEDICINAS',icon:'✚'}};
const TECH={filter:{title:'Filtros de carbono',desc:'La integridad atmosférica se recupera un 50 % más rápido.',cost:{scrap:140,energy:80}},irrigation:{title:'Cultivo optimizado',desc:'+25 % de producción de comida.',cost:{scrap:110,water:70}},batteries:{title:'Baterías reforzadas',desc:'+25 % de generación de energía.',cost:{scrap:125,energy:65}},medical:{title:'Protocolos médicos',desc:'Duplican la capacidad de recuperación de enfermos.',cost:{scrap:135,medicine:10}}};
const $=id=>document.getElementById(id);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const fmt=n=>Math.floor(n).toLocaleString('es-ES');
function fresh(){return {version:1,day:1,hour:8,tick:0,resources:{water:220,food:200,scrap:340,energy:240,medicine:16},pop:14,sick:0,morale:79,air:92,levels:{core:1,water:1,food:1,energy:1,scrap:1,housing:1,clinic:0,radar:0,wall:0},tech:[],focus:'water',tab:'city',selected:'core',sheetOpen:false,zoom:1,offsetX:0,offsetY:0,stormUntil:0,construction:null,expedition:null,story:[],lastEvent:'Las puertas del Refugio Esperanza se han cerrado. Empieza la reconstrucción.',seenIntro:false,dead:false};}
let state;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');state=saved&&saved.version===1?Object.assign(fresh(),saved):fresh()}catch{state=fresh()}
state.sheetOpen=false; // New sessions start on the city, not behind a panel.
for(const id of IDS){state.levels[id]=Math.max(0,Number(state.levels[id])||0)}
let viewport={w:900,h:600,k:1};
let toastTimer;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function log(message){state.lastEvent=message;state.story.unshift(`Día ${state.day} · ${String(state.hour).padStart(2,'0')}:00 — ${message}`);state.story=state.story.slice(0,16);$('lastEvent').textContent=message}
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3100)}
function buildingCost(id){const lv=state.levels[id];const factor=Math.pow(1.52,lv);return Object.fromEntries(Object.entries(DB[id].base).map(([k,v])=>[k,Math.ceil(v*factor/5)*5]));}
function canPay(cost){return Object.entries(cost).every(([k,v])=>state.resources[k]>=v)}
function pay(cost){for(const [k,v] of Object.entries(cost))state.resources[k]-=v}
function maxPopulation(){return 10+state.levels.housing*12+Math.max(0,state.levels.core-1)*3}
function staffingFactor(){return clamp((state.pop-state.sick-(state.expedition?3:0))/Math.max(10,state.pop),.3,1)}
function storming(){return state.stormUntil>state.tick}
function status(){const s=state.resources;return {critical:s.water<state.pop*3||s.food<state.pop*3||s.energy<30||state.air<45,warning:storming()||s.water<state.pop*5||s.food<state.pop*5||state.air<65}}
function focusRate(type){return state.focus===type?1.45:.94}
function gain(id){return state.levels[id]*{water:12,food:12,energy:22,scrap:9}[id]*focusRate(id)*staffingFactor()*(id==='food'&&state.tech.includes('irrigation')?1.25:1)*(id==='energy'&&state.tech.includes('batteries')?1.25:1)}
function processHour(){
 if(state.dead)return;
 state.tick++;state.hour++;if(state.hour>=24){state.hour=0;state.day++}
 if(state.day===2&&state.hour===7&&state.stormUntil<state.tick){state.stormUntil=state.tick+7;log('¡TORMENTA TÓXICA! Refuerza el Núcleo Atmosférico.') ;toast('⚠ ALERTA: tormenta tóxica')}
 if(state.day>2&&state.day%3===0&&state.hour===8){state.stormUntil=state.tick+8;log('Una nueva tormenta avanza hacia el refugio.') ;toast('⚠ Se aproxima una tormenta')}
 const s=state.resources,storm=storming(),work=staffingFactor();
 for(const type of ['water','food','energy','scrap'])s[type]+=gain(type)*(storm&&type==='energy'?.45:storm&&type==='water'?.55:storm&&type==='food'?.75:1);
 s.water-=state.pop*1.06;s.food-=state.pop*.89;
 s.energy-=9+state.pop*.28+state.levels.core*1.7+(storm?13:0);
 if(state.levels.clinic&&state.tick%5===0)s.medicine+=1;
 for(const id of Object.keys(s))s[id]=Math.max(0,Math.min(s[id],99999));
 const shortages=s.water<1||s.food<1||s.energy<1;
 const stormPenalty=storm?Math.max(0,6-state.levels.core*1.5-state.levels.wall*1.3):0;
 state.air=clamp(state.air+(s.energy>0?(state.levels.core*1.55*(state.tech.includes('filter')?1.5:1)):-7)-stormPenalty,0,100);
 if(shortages||state.air<55){state.morale=clamp(state.morale-2.6,0,100)}else state.morale=clamp(state.morale+(storm?-.6:state.levels.housing*.26),0,100);
 if((state.air<45||s.water<1||s.food<1)&&state.tick%3===0&&state.sick<state.pop-1){state.sick++;log('Un habitante ha enfermado: faltan suministros o aire limpio.')}
 if(state.sick>0&&state.levels.clinic&&s.medicine>=1&&state.tick%(state.tech.includes('medical')?2:4)===0){state.sick--;s.medicine--;log('El puesto médico ha recuperado a un superviviente.')}
 if(state.morale<15&&state.pop>3&&state.tick%8===0){state.pop--;state.sick=Math.min(state.sick,state.pop-1);log('Un superviviente ha abandonado la colonia.')}
 if(state.morale>65&&state.pop<maxPopulation()&&!storm&&state.tick%9===0){state.pop++;log('Un nuevo superviviente se ha unido al refugio.')}
 if(state.construction&&Date.now()>=state.construction.ends){finishConstruction()}
 if(state.expedition&&Date.now()>=state.expedition.ends){completeExpedition()}
 if(state.pop<=3||state.air<=0&&s.energy<=0){state.dead=true;log('El Refugio Esperanza ha colapsado. Esta historia termina aquí.');openGameOver()}
 render();save();
}
function finishConstruction(){const id=state.construction.id;state.levels[id]++;state.construction=null;log(`${DB[id].name} ha alcanzado nivel ${state.levels[id]}.`);toast('✓ Mejora completada: '+DB[id].name)}
function build(id){if(!DB[id]||state.dead)return;if(state.construction)return toast('Solo hay un equipo de construcción disponible.');if(state.levels[id]>=state.levels.core&&id!=='core')return toast('Mejora primero el Núcleo Atmosférico.');const cost=buildingCost(id);if(!canPay(cost))return toast('No tienes suficientes recursos.');pay(cost);const duration=Math.ceil((state.levels[id]+1)*5.5*1000);state.construction={id,started:Date.now(),ends:Date.now()+duration};log(`Construyendo: ${DB[id].name}.`);render();save()}
const ROUTES={ruins:{name:'Ruinas del convoy',time:24000,loot:'Chatarra y medicinas',min:1},aquifer:{name:'Acuífero abandonado',time:32000,loot:'Agua y alimentos',min:2},station:{name:'Estación de investigación',time:42000,loot:'Tecnología recuperada',min:3}};
function expedition(route){const e=ROUTES[route];if(!e||state.expedition||state.levels.radar<e.min)return toast('Expedición no disponible.');if(state.pop-state.sick<5)return toast('No hay suficientes supervivientes sanos.');if(state.resources.food<20||state.resources.water<25)return toast('Necesitas provisiones para viajar.');state.resources.food-=20;state.resources.water-=25;state.expedition={route,ends:Date.now()+e.time};log('Tres exploradores han partido hacia '+e.name.toLowerCase()+'.');render();save()}
function completeExpedition(){const route=state.expedition.route;state.expedition=null;if(route==='ruins'){state.resources.scrap+=140;state.resources.medicine+=4;log('El equipo regresa con 140 de chatarra y 4 medicinas.')}if(route==='aquifer'){state.resources.water+=180;state.resources.food+=70;log('El equipo regresa con agua y alimentos.')}if(route==='station'){state.resources.scrap+=100;state.resources.medicine+=12;state.resources.energy+=65;log('El equipo recupera tecnología antigua y suministros.')}toast('✓ Expedición completada')}
function research(id){const t=TECH[id];if(!t||state.tech.includes(id))return;if(!canPay(t.cost))return toast('Recursos insuficientes.');pay(t.cost);state.tech.push(id);log('Investigación completada: '+t.title+'.');toast('✓ Tecnología desbloqueada');render();save()}
function costHTML(cost){return `<div class="costs">${Object.entries(cost).map(([k,v])=>`<span class="cost ${state.resources[k]<v?'notenough':''}">${R[k]?.icon||'◇'} ${fmt(v)}</span>`).join('')}</div>`}
function pendingTime(end){return `${Math.max(0,Math.ceil((end-Date.now())/1000))} s`}
function panelCity(){const id=state.selected||'core',b=DB[id],lv=state.levels[id],isCore=id==='core',lock=lv>=state.levels.core&&!isCore,constructing=state.construction&&state.construction.id===id;
 return `<div class="panel-inner"><div class="overline">${lv?'ESTRUCTURA · NIVEL '+lv:'PARCELA DISPONIBLE'}</div><div class="building-icon">${b.icon}</div><h2>${b.name}</h2><p class="descr">${b.desc}</p><div class="stats"><div class="stat"><span>NIVEL ACTUAL</span><strong>${lv}</strong></div><div class="stat"><span>FUNCIÓN</span><strong style="font-size:13px">${b.produces}</strong></div></div><div class="section-title">${lv?'MEJORA DE EDIFICIO':'NUEVA CONSTRUCCIÓN'}</div>${costHTML(buildingCost(id))}
 ${constructing?`<div class="hint">Construcción en curso · ${pendingTime(state.construction.ends)}</div><div class="progress"><span style="width:${clamp(100*(Date.now()-state.construction.started)/(state.construction.ends-state.construction.started),0,100)}%"></span></div><button class="button" disabled>EN CONSTRUCCIÓN</button>`:`<button class="button" data-build="${id}" ${state.construction||lock||!canPay(buildingCost(id))?'disabled':''}>${lv?'MEJORAR A NIVEL '+(lv+1):'CONSTRUIR EDIFICIO'}</button>`}
 ${lock?'<p class="hint">⛨ Primero debes mejorar el Núcleo Atmosférico.</p>':''}${state.construction&&!constructing?`<p class="hint">Equipo ocupado: ${DB[state.construction.id].name} · ${pendingTime(state.construction.ends)}</p>`:''}
 <div class="section-title">OBJETIVO INMEDIATO</div><div class="mission"><span>${state.levels.core>=2?'Construye un puesto médico':'Lleva el Núcleo Atmosférico a nivel 2'}</span><strong>${state.levels.core>=2?(state.levels.clinic?'✓':'0/1'):'NV. '+state.levels.core+'/2'}</strong></div>
 <button class="button secondary" data-tabgo="people">GESTIONAR SUPERVIVIENTES →</button></div>`;
}
function panelPeople(){return `<div class="panel-inner"><span class="overline">VIDA EN EL REFUGIO</span><h2>Supervivientes</h2><p class="descr">Los habitantes necesitan aire respirable, agua, comida y un puesto médico. Puedes priorizar su trabajo.</p><div class="stats"><div class="stat"><span>POBLACIÓN</span><strong>${state.pop} / ${maxPopulation()}</strong></div><div class="stat"><span>ENFERMOS</span><strong class="${state.sick?'low':''}">${state.sick}</strong></div><div class="stat"><span>MORAL</span><strong>${Math.floor(state.morale)}%</strong></div><div class="stat"><span>CAPACIDAD LABORAL</span><strong>${Math.round(staffingFactor()*100)}%</strong></div></div><div class="section-title">PRIORIDAD DE PRODUCCIÓN</div><p class="descr">La actividad elegida genera un 45 % más. La distribución de trabajadores modifica el equilibrio del refugio.</p><div class="choice">${[['water','💧 Agua'],['food','🌱 Alimentos'],['energy','⚡ Energía'],['scrap','⚙ Chatarra']].map(([id,n])=>`<button class="${state.focus===id?'active':''}" data-focus="${id}">${n}</button>`).join('')}</div><div class="section-title">BALANCE POR HORA</div>${['water','food','energy','scrap'].map(k=>`<div class="row"><span class="muted">${R[k].icon} ${R[k].label.toLowerCase()}</span><strong class="${(k==='water'?gain(k)-state.pop*1.06:k==='food'?gain(k)-state.pop*.89:k==='energy'?gain(k)-9-state.pop*.28-state.levels.core*1.7:gain(k))<0?'low':''}">${(k==='water'?gain(k)-state.pop*1.06:k==='food'?gain(k)-state.pop*.89:k==='energy'?gain(k)-9-state.pop*.28-state.levels.core*1.7:gain(k))>=0?'+':''}${Math.round(k==='water'?gain(k)-state.pop*1.06:k==='food'?gain(k)-state.pop*.89:k==='energy'?gain(k)-9-state.pop*.28-state.levels.core*1.7:gain(k))}</strong></div>`).join('')}</div>`}
function panelScout(){return `<div class="panel-inner"><span class="overline">MÁS ALLÁ DEL MURO</span><h2>Expediciones</h2><p class="descr">Envía equipos de tres supervivientes a buscar suministros. Durante su ausencia disminuye la mano de obra disponible.</p>${!state.levels.radar?`<div class="listentry"><h3>🔒 Torre exploradora necesaria</h3><p>Construye la Torre exploradora desde la ciudad para desbloquear expediciones.</p><button class="button" data-select="radar">IR A CONSTRUIR</button></div>`:state.expedition?`<div class="listentry"><h3>⌖ Expedición en marcha</h3><p>${ROUTES[state.expedition.route].name}</p><p>Regreso en ${pendingTime(state.expedition.ends)}</p><div class="progress"><span style="width:${Math.max(2,100-(state.expedition.ends-Date.now())/ROUTES[state.expedition.route].time*100)}%"></span></div></div>`:''}
 ${Object.entries(ROUTES).map(([id,e])=>`<div class="listentry"><div class="row"><h3>${e.name}</h3><span class="pill">RADAR NV. ${e.min}</span></div><p>Posible recompensa: ${e.loot}.</p><p>Tiempo: ${e.time/1000} s · Coste: 25 💧 y 20 🌾</p><button class="button secondary" data-route="${id}" ${state.expedition||state.levels.radar<e.min||state.resources.water<25||state.resources.food<20?'disabled':''}>INICIAR EXPEDICIÓN</button></div>`).join('')}</div>`}
function panelTech(){return `<div class="panel-inner"><span class="overline">RECONSTRUCCIÓN CIENTÍFICA</span><h2>Tecnología</h2><p class="descr">Investiga mejoras persistentes para convertir un refugio precario en una ciudad preparada para el futuro.</p>${Object.entries(TECH).map(([id,t])=>`<div class="listentry"><div class="row"><h3>${t.title}</h3><span class="pill">${state.tech.includes(id)?'COMPLETADO':'DISPONIBLE'}</span></div><p>${t.desc}</p>${state.tech.includes(id)?'<p style="color:#94d19b">✓ Investigación completada</p>':`${costHTML(t.cost)}<button class="button secondary" data-research="${id}" ${!canPay(t.cost)?'disabled':''}>INVESTIGAR</button>`}</div>`).join('')}</div>`}
function render(){const s=state.resources;$('resbar').innerHTML=Object.entries(R).map(([id,r])=>`<div class="resitem"><span class="resicon">${r.icon}</span><div><strong class="${s[id]<30?'low':''}">${fmt(s[id])}</strong><small>${r.label}</small></div></div>`).join('');$('day').textContent='DÍA '+String(state.day).padStart(2,'0');$('clock').textContent=String(state.hour).padStart(2,'0')+':00';$('weather').textContent=storming()?'TORMENTA TÓXICA':'CIELO TURBIO';$('statusstrip').innerHTML=`<span>☣ AIRE <strong class="${state.air<50?'low':''}">${Math.floor(state.air)}%</strong></span><span>♙ HABITANTES <strong>${state.pop}</strong></span><span>✚ ENFERMOS <strong class="${state.sick?'low':''}">${state.sick}</strong></span><span>◉ MORAL <strong>${Math.floor(state.morale)}%</strong></span>`;$('forecast').innerHTML=storming()?'⚠ <span>TORMENTA EN CURSO</span>':'☀ <span>Ambiente estable</span>';$('dust').classList.toggle('storm',storming());$('settlementLevel').textContent=`NÚCLEO NV. ${state.levels.core}`;$('lastEvent').textContent=state.lastEvent;
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));$('panel').classList.toggle('sheet-open',!!state.sheetOpen);$('panelContent').innerHTML=state.tab==='city'?panelCity():state.tab==='people'?panelPeople():state.tab==='scout'?panelScout():panelTech();draw();}
function setTab(id){if(!['city','people','scout','tech'].includes(id))return;state.tab=id;state.sheetOpen=true;render();save()}
function selectBuilding(id){state.selected=id;state.tab='city';state.sheetOpen=true;render();save()}
function openSettings(){$('modal').classList.remove('hidden');$('modal').innerHTML=`<div class="dialog"><div class="overline">DUSTFALL · ALPHA 0.2</div><h2>Opciones</h2><p class="descr">Partida local guardada automáticamente en este navegador. El tiempo avanza a razón de una hora de juego cada cuatro segundos.</p><button class="button secondary" data-modalclose="1">VOLVER A JUGAR</button><button class="button alert" style="margin-top:10px" data-restart="1">REINICIAR PARTIDA</button></div>`}
function openGameOver(){$('modal').classList.remove('hidden');$('modal').innerHTML=`<div class="dialog"><div class="overline">EL FIN DEL REFUGIO</div><h2>La colonia ha caído</h2><p class="descr">Las decisiones sobre suministros, defensas y filtración han determinado el destino de los supervivientes. Resististe hasta el día ${state.day}.</p><button class="button" data-restart="1">COMENZAR DE NUEVO</button></div>`}
function restart(){state=fresh();save();$('modal').classList.add('hidden');log('Comienza una nueva colonia.');render()}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tab)setTab(b.dataset.tab);if(b.dataset.tabgo)setTab(b.dataset.tabgo);if(b.dataset.focus){state.focus=b.dataset.focus;toast('Trabajo priorizado: '+R[b.dataset.focus].label);render();save()}if(b.dataset.build)build(b.dataset.build);if(b.dataset.route)expedition(b.dataset.route);if(b.dataset.research)research(b.dataset.research);if(b.dataset.select)selectBuilding(b.dataset.select);if(b.dataset.modalclose)$('modal').classList.add('hidden');if(b.dataset.restart)restart()});$('settingsBtn').onclick=openSettings;$('sheetClose').onclick=()=>{state.sheetOpen=false;$('panel').classList.remove('sheet-open');save()};
// Original painted isometric settlement. Procedural geometry has no licensed game assets.
const canvas=$('scene');const ctx=canvas.getContext('2d');
function resize(){const rect=$('world').getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);viewport.w=rect.width;viewport.h=rect.height;canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr);canvas.style.width=rect.width+'px';canvas.style.height=rect.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);draw()}
const palettes={core:['#af6e40','#624a3b','#f5b66a'],water:['#75b7bd','#376c71','#c0e5e1'],food:['#8fbc74','#506c48','#cde2ad'],energy:['#97a9c3','#3f5465','#e7c27c'],scrap:['#b29372','#655748','#ded2b6'],housing:['#c59a6f','#665242','#f0d0a5'],clinic:['#c6bba6','#6e716c','#e2e0d4'],radar:['#c5a673','#6a6151','#f1dfb9'],wall:['#7b8a84','#4e5551','#bac0ac']};
function poly(points,fill,stroke='',width=1){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function tile(x,y,k,shade){poly([[x,y-23*k],[x+48*k,y],[x,y+23*k],[x-48*k,y]],shade,'#66554077',.8)}
function coords(col,row){const {w,h,k}=viewport;return [w/2+(col-row)*49*k+state.offsetX,h*.54+(col+row-6)*23*k+state.offsetY]}
function building(id,time){const d=DB[id],level=state.levels[id],k=viewport.k,[x,y]=coords(...d.xy),selected=state.selected===id&&state.tab==='city',p=palettes[id];
 if(selected){ctx.beginPath();ctx.ellipse(x,y+7*k,52*k,27*k,0,0,Math.PI*2);ctx.strokeStyle='#ffe0a0';ctx.lineWidth=2.4*k;ctx.stroke()}
 if(!level){poly([[x,y-14*k],[x+33*k,y],[x,y+14*k],[x-33*k,y]],'#3c3a30bb','#c2a676',1.2);ctx.font=`${22*k}px Arial`;ctx.fillStyle='#fbd596';ctx.textAlign='center';ctx.fillText('+',x,y+8*k);return}
 const wt=(id==='core'?79:id==='wall'?100:64)*(1+.13*(level-1))*k,depth=(id==='core'?30:27)*k,height=(id==='core'?62:id==='radar'?76:id==='wall'?22:39)*(1+.2*(level-1))*k,top=y-height;
 // floor shadow
 ctx.beginPath();ctx.ellipse(x+7*k,y+5*k,wt*.65,depth*.88,0,0,Math.PI*2);ctx.fillStyle='#130f0a65';ctx.fill();
 const apex=[x,top-depth*.6],right=[x+wt/2,top],bottom=[x,top+depth*.6],left=[x-wt/2,top];
 poly([left,bottom,[x,y], [x-wt/2,y-depth*.60]],p[1]);poly([bottom,right,[x+wt/2,y-depth*.60],[x,y]],'#372f28');poly([apex,right,bottom,left],p[0],'#f7d9a344',1);
 if(id==='core'){
  // tall atmospheric column, illuminated slits, exhaust
  poly([[x-17*k,top+8*k],[x+17*k,top+8*k],[x+17*k,y-4*k],[x-17*k,y-4*k]],'#4d4c47');
  poly([[x-7*k,top+15*k],[x+7*k,top+15*k],[x+7*k,y-11*k],[x-7*k,y-11*k]],'#e9a05c');
  ctx.fillStyle='#ffe4a0';ctx.fillRect(x-2*k,top+17*k,4*k,height*.5);
  ctx.beginPath();ctx.arc(x,top+10*k,19*k,0,Math.PI*2);ctx.fillStyle='#ffc46c25';ctx.fill();
  ctx.fillStyle='#c9b09a';ctx.fillRect(x-20*k,top-9*k,40*k,12*k);
 }else if(id==='energy'){
   poly([[x-27*k,top+15*k],[x,top+2*k],[x+26*k,top+14*k],[x,top+27*k]],'#233d57','#8bd5ee',1);for(let q=-1;q<=1;q++){ctx.strokeStyle='#85b0ca';ctx.lineWidth=k;ctx.beginPath();ctx.moveTo(x+q*13*k,top+7*k);ctx.lineTo(x+q*13*k,top+19*k);ctx.stroke()}
 }else if(id==='food'){
  for(let j=-1;j<=1;j++){ctx.strokeStyle='#a4d67b';ctx.lineWidth=3*k;ctx.beginPath();ctx.moveTo(x+j*13*k,top+5*k);ctx.lineTo(x+j*13*k,top-13*k);ctx.stroke();ctx.beginPath();ctx.ellipse(x+j*13*k,top-17*k,7*k,4*k,0,0,Math.PI*2);ctx.fillStyle='#9bc87a';ctx.fill()}
 }else if(id==='water'){
  ctx.beginPath();ctx.ellipse(x,top+2*k,17*k,8*k,0,0,Math.PI*2);ctx.fillStyle='#bddcdb';ctx.fill();ctx.fillStyle='#49818e';ctx.fillRect(x-17*k,top+2*k,34*k,16*k)
 }else if(id==='radar'){
  ctx.strokeStyle='#dac9a3';ctx.lineWidth=3*k;ctx.beginPath();ctx.moveTo(x,top+16*k);ctx.lineTo(x,top-30*k);ctx.stroke();ctx.beginPath();ctx.arc(x,top-31*k,13*k,Math.PI*.10,Math.PI*.85);ctx.stroke();
 }else if(id==='clinic'){
  ctx.fillStyle='#f6ddd0';ctx.fillRect(x-7*k,top+13*k,14*k,4*k);ctx.fillRect(x-2*k,top+8*k,4*k,14*k);
 }else if(id==='housing'){
  for(let i=-1;i<=1;i++){ctx.fillStyle='#eecc80';ctx.fillRect(x+i*12*k-3*k,top+12*k,6*k,8*k)}
 }else if(id==='scrap'){
  ctx.strokeStyle='#d3c09f';ctx.lineWidth=3*k;ctx.beginPath();ctx.moveTo(x-16*k,top-6*k);ctx.lineTo(x+8*k,top-18*k);ctx.lineTo(x+19*k,top-6*k);ctx.stroke();
 }
 // individual building labels with level, shown at an appropriate scale
 if(k>.42){const label=id==='core'?'NÚCLEO':id==='food'?'COMIDA':id==='water'?'AGUA':id==='energy'?'ENERGÍA':id==='scrap'?'TALLER':id==='housing'?'REFUGIOS':id==='clinic'?'MÉDICO':id==='radar'?'RADAR':'DEFENSAS';ctx.font=`bold ${Math.max(8,10*k)}px Arial`;const tw=ctx.measureText(label+' '+level).width;ctx.fillStyle='#121916cd';ctx.fillRect(x-tw/2-5*k,y+11*k,tw+10*k,16*k);ctx.textAlign='center';ctx.fillStyle='#f5e7c8';ctx.fillText(`${label} ${level}`,x,y+22*k)}
 if(state.construction&&state.construction.id===id){ctx.fillStyle='#ffde97';ctx.font=`bold ${16*k}px Arial`;ctx.textAlign='center';ctx.fillText('⬆',x,top-22*k)}
}
function draw(){if(!ctx)return;const w=viewport.w,h=viewport.h;if(!w||!h)return;const isMobile=w<650;viewport.k=Math.min(w/810,h/580)*state.zoom*(isMobile?1.58:1.12);const k=viewport.k;
 ctx.clearRect(0,0,w,h);const background=ctx.createRadialGradient(w*.50,h*.42,20,w*.5,h*.5,Math.max(w,h)*.62);background.addColorStop(0,storming()?'#9d6241':'#675038');background.addColorStop(1,'#222d2b');ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
 // dust, rock and cracked ground
 for(let i=0;i<115;i++){let rx=((i*237+61)%997)/997*w,ry=((i*103+27)%721)/721*h;ctx.fillStyle=i%3?'#a77e5033':'#171c1955';ctx.beginPath();ctx.ellipse(rx,ry,(i%5+2)*k*1.6,(i%3+1)*k*.7,i*.47,0,6.29);ctx.fill()}
 for(let layer=0;layer<9;layer++)for(let col=0;col<9;col++){const [x,y]=coords(col,layer);tile(x,y,k,(col+layer)%2===0?'#735b435d':'#a0805955')}
 // connecting roads from center
 for(const id of IDS){if(id==='core')continue;const [x,y]=coords(...DB[id].xy),[cx,cy]=coords(3,3);ctx.strokeStyle='#88745b7a';ctx.lineWidth=13*k;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,cy);ctx.lineTo(x,y);ctx.stroke();ctx.strokeStyle='#bd966953';ctx.lineWidth=1.4*k;ctx.stroke()}
 // draw far to near for isometric occlusion
 [...IDS].sort((a,b)=>DB[a].xy[0]+DB[a].xy[1]-DB[b].xy[0]-DB[b].xy[1]).forEach(id=>building(id,performance.now()));
 // people walking around the town
 const usable=Math.min(state.pop-state.sick,22),now=performance.now()/900;for(let i=0;i<usable;i++){const a=i*2.399+now*(.11+(i%5)*.015);const radius=(85+i%5*27)*k;const x=w/2+Math.cos(a)*radius+state.offsetX,y=h*.55+Math.sin(a)*radius*.43+state.offsetY;if(x<0||x>w||y<0||y>h)continue;ctx.fillStyle='#131a17a0';ctx.beginPath();ctx.ellipse(x,y+5*k,3*k,2*k,0,0,6.29);ctx.fill();ctx.fillStyle=i%4?'#d9c2a1':'#8ec3a9';ctx.fillRect(x-2.6*k,y-7*k,5.2*k,9*k);ctx.fillStyle='#c99b72';ctx.beginPath();ctx.arc(x,y-8*k,3.3*k,0,6.29);ctx.fill()}
 // storm clouds wash the city orange, fog increases during danger
 if(storming()){ctx.fillStyle='#a76c3235';ctx.fillRect(0,0,w,h)}if(state.air<50){ctx.fillStyle=`rgba(80,89,60,${(.6-state.air/100)*.3})`;ctx.fillRect(0,0,w,h)}
}
function sceneHit(clientX,clientY){const rect=canvas.getBoundingClientRect();const x=clientX-rect.left,y=clientY-rect.top,k=viewport.k;let best=null,dist=Infinity;for(const id of IDS){const [bx,by]=coords(...DB[id].xy);const d=Math.hypot((x-bx), (y-(by-35*k))*1.15);if(d<68*k&&d<dist){dist=d;best=id}}return best}
let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,dx:0,dy:0};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.dx+=Math.abs(dx);drag.dy+=Math.abs(dy);if(drag.dx+drag.dy>8){state.offsetX=clamp(state.offsetX+dx,-220,220);state.offsetY=clamp(state.offsetY+dy,-160,160);draw()}});canvas.addEventListener('pointerup',e=>{if(drag&&drag.dx+drag.dy<10){const id=sceneHit(e.clientX,e.clientY);if(id)selectBuilding(id)}drag=null});canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom+(e.deltaY<0?.08:-.08),.75,1.75);draw();save()},{passive:false});$('zoomIn').onclick=()=>{state.zoom=clamp(state.zoom+.14,.75,1.75);draw();save()};$('zoomOut').onclick=()=>{state.zoom=clamp(state.zoom-.14,.75,1.75);draw();save()};$('centerView').onclick=()=>{state.zoom=1;state.offsetX=0;state.offsetY=0;draw();save()};
window.addEventListener('resize',resize);setInterval(()=>{if(state.construction&&Date.now()>=state.construction.ends)finishConstruction();if(state.expedition&&Date.now()>=state.expedition.ends)completeExpedition();render();save()},1000);setInterval(processHour,HOUR_MS);
$('lastEvent').textContent=state.lastEvent;render();resize();
if(!state.seenIntro){state.seenIntro=true;save();$('modal').classList.remove('hidden');$('modal').innerHTML='<div class="dialog"><div class="overline">AÑO 2149 · CAPÍTULO 1</div><h2>El último aire limpio</h2><p class="descr">El planeta ha quedado cubierto por polvo tóxico. Catorce supervivientes han encontrado un antiguo Núcleo Atmosférico. Necesitan agua, comida y energía para seguir vivos. Construye, explora y resiste la primera tormenta del día 2.</p><button class="button" data-modalclose="1">COMENZAR SUPERVIVENCIA</button></div>'}

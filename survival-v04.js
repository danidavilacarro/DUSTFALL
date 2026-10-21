/* DUSTFALL v0.4 — continuous life-support decisions.
   Additive, compatible with dustfall-sim-v1 saves. Loads after survival-v03.js. */
'use strict';
(() => {
  const LIMIT = (n,a,b) => Math.max(a,Math.min(b,n));
  function controls(){
    if(!state.v04 || typeof state.v04!=='object')state.v04={};
    const d=state.v04;
    if(!['limited','normal','generous'].includes(d.rations))d.rations='normal';
    if(!['economy','normal','boost'].includes(d.filtration))d.filtration='normal';
    if(typeof d.recycler!=='boolean')d.recycler=false;
    if(!Number.isFinite(d.lastTick))d.lastTick=state.tick;
    return d;
  }
  function evaluate(){
    const d=controls(),r=state.resources,p=state.pop;
    const f=d.rations==='limited'?.60:d.rations==='generous'?1.25:1;
    return {
      food:gain('food')-p*.89*f,
      water:gain('water')-p*1.06+(d.recycler?p*.32:0),
      energy:gain('energy')-9-p*.28-state.levels.core*1.7
        -(d.recycler?5:0)-(d.filtration==='boost'?6:0)+(d.filtration==='economy'?4:0)
    };
  }
  function severe(){
    const r=state.resources;
    return state.air<45||state.morale<25||r.water<state.pop*2||r.food<state.pop*2||r.energy<20;
  }
  function rate(n){return (n>=0?'+':'')+Math.round(n)+'/h';}
  function line(title,label,val){
    return '<div class="life-meter"><span>'+title+'</span><strong class="'+(val<0?'low':'good')+'">'+rate(val)+'</strong><small>'+label+'</small></div>';
  }
  function option(group,id,label,description){
    const d=controls(),on=d[group]===id;
    return '<button type="button" class="life-option '+(on?'chosen':'')+'" data-life="'+group+'" data-value="'+id+'" aria-pressed="'+on+'"><strong>'+label+'</strong><small>'+description+'</small></button>';
  }
  function show(){
    if(state.v02&&state.v02.pendingEvent || state.v03&&state.v03.pendingRaid){
      toast('Resuelve primero la emergencia actual.');return;
    }
    const d=controls(),r=state.resources,n=evaluate();
    const foodHours=r.food/Math.max(1,-Math.min(-1,n.food));
    const waterHours=r.water/Math.max(1,-Math.min(-1,n.water));
    const critical=severe();
    const modal=$('modal');
    modal.classList.remove('hidden');
    modal.innerHTML='<div class="dialog crisis-dialog life-dialog">'
      +'<div class="overline">☣ MANDO DEL REFUGIO · DÍA '+state.day+'</div>'
      +'<h2>Soporte vital</h2>'
      +'<p class="descr">El desierto no perdona. Cambia las políticas de consumo y potencia del Núcleo. Cada decisión se aplica a la producción real en la próxima hora de simulación.</p>'
      +'<div class="life-overview"><span>CALIDAD DEL AIRE <strong class="'+(state.air<50?'low':'')+'">'+Math.floor(state.air)+'%</strong></span>'
      +'<span>MORAL <strong>'+Math.floor(state.morale)+'%</strong></span>'
      +'<span>RIESGO <strong class="'+(critical?'low':'good')+'">'+(critical?'ALTO':'CONTROLADO')+'</strong></span></div>'
      +'<div class="life-rates">'+line('💧 AGUA','Balance neto',n.water)+line('🌾 COMIDA','Balance neto',n.food)+line('⚡ ENERGÍA','Balance neto',n.energy)+'</div>'
      +'<div class="life-group"><h3>Racionamiento</h3>'
      +'<div class="life-options">'+option('rations','limited','Ración limitada','Ahorra 40 % de comida; reduce la moral y la salud a largo plazo.')
      +option('rations','normal','Ración normal','Consumo estándar; estabilidad.')
      +option('rations','generous','Ración generosa','Gasta 25 % más de comida; mejora la moral.')+'</div></div>'
      +'<div class="life-group"><h3>Filtración atmosférica</h3>'
      +'<div class="life-options">'+option('filtration','economy','Ahorro','Recupera 4 de energía/h; empeora el aire.')
      +option('filtration','normal','Normal','Filtración estándar.')
      +option('filtration','boost','Máxima','Consume 6 de energía/h; mejora la calidad del aire.')+'</div></div>'
      +'<div class="life-group"><h3>Recuperación hídrica</h3>'
      +'<div class="life-options">'+option('recycler',false,'Desactivada','Sin consumo adicional de energía.')
      +option('recycler',true,'Activada','Consume 5 de energía/h para recuperar agua según población.')+'</div></div>'
      +'<p class="microcopy">Las estimaciones no incluyen penalizaciones por tormenta. Una hora dura 4 segundos de prueba. Al recargar se conservan las políticas elegidas.</p>'
      +'<button type="button" class="button secondary" data-life-close="1">VOLVER A LA CIUDAD</button></div>';
  }
  const prevHour=processHour;
  processHour=function(){
    const before=state.tick;
    prevHour();
    if(state.tick===before||state.dead)return;
    const d=controls(),p=state.pop,r=state.resources;
    if(d.rations==='limited'){
      r.food=LIMIT(r.food+p*.89*.40,0,99999);
      state.morale=LIMIT(state.morale-.65,0,100);
      // Long-term rationing weakens the colony if its health system cannot cope.
      if(state.tick%12===0 && state.morale<35 && state.sick<state.pop-1){
        state.sick++;log('El racionamiento prolongado ha debilitado a un superviviente.');
      }
    }else if(d.rations==='generous'){
      if(r.food>=p*.89*.25){
        r.food=LIMIT(r.food-p*.89*.25,0,99999);
        state.morale=LIMIT(state.morale+.55,0,100);
      }else{
        d.rations='normal';
        toast('Ración normal activada: no queda comida suficiente.');
      }
    }
    if(d.filtration==='economy'){
      r.energy=LIMIT(r.energy+4,0,99999);
      state.air=LIMIT(state.air-(storming()?3:1.5),0,100);
    }else if(d.filtration==='boost'){
      if(r.energy>=6){
        r.energy-=6;
        state.air=LIMIT(state.air+(storming()?4.3:2.7),0,100);
      }else{
        d.filtration='normal';
        toast('Potencia normal: falta energía para reforzar los filtros.');
      }
    }
    if(d.recycler){
      if(r.energy>=5){
        r.energy-=5;
        r.water=LIMIT(r.water+p*.32,0,99999);
      }else{
        d.recycler=false;
        toast('Recuperación hídrica desconectada por falta de energía.');
      }
    }
    d.lastTick=state.tick;
    save();render();
  };
  function change(b){
    const d=controls(),group=b.dataset.life;
    if(group==='recycler')d.recycler=b.dataset.value==='true';
    else if(group==='rations'&&['limited','normal','generous'].includes(b.dataset.value))d.rations=b.dataset.value;
    else if(group==='filtration'&&['economy','normal','boost'].includes(b.dataset.value))d.filtration=b.dataset.value;
    else return;
    log('Nueva orden de supervivencia en el Núcleo: '+(group==='recycler'?'recuperación hídrica '+(d.recycler?'activada':'desactivada'):group==='rations'?'raciones '+d.rations:'filtrado '+d.filtration)+'.');
    save();render();show();
  }
  const quick=document.querySelector('.quick-controls');
  if(quick&&!$('lifeSupportBtn')){
    const b=document.createElement('button');
    b.id='lifeSupportBtn';b.type='button';b.className='survival-action secondary';
    b.textContent='☣ SOPORTE VITAL';b.addEventListener('click',show);quick.appendChild(b);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.life)change(b);
    if(b.dataset.lifeClose){$('modal').classList.add('hidden');save();}
  });
  const prevRender=render;
  render=function(){
    prevRender();
    const d=controls(),n=evaluate(),strip=$('statusstrip');
    let chip=$('lifeStatus');
    if(!chip){chip=document.createElement('span');chip.id='lifeStatus';chip.className='life-chip';strip.appendChild(chip)}
    chip.classList.toggle('low',severe());
    chip.textContent='☣ '+(severe()?'SUPERVIVENCIA CRÍTICA':'SOPORTE VITAL')+' · '
      +(d.rations==='limited'?'RACIÓN REDUCIDA':d.rations==='generous'?'RACIÓN EXTRA':'RACIÓN NORMAL')
      +' · '+(n.water<0?'AGUA '+rate(n.water):'AGUA ESTABLE');
    const badge=$('versionBadge');if(badge)badge.textContent='ALPHA 0.4';
  };
  const prevDraw=draw;
  draw=function(){
    prevDraw();
    if(!viewport.w||!viewport.h)return;
    const k=viewport.k,point=coords(3,3);
    const x=point[0],y=point[1]-32*k;
    const radius=(35+state.levels.core*5)*k;
    ctx.save();
    ctx.strokeStyle=state.air<45?'rgba(245,96,72,.65)':state.air<70?'rgba(251,196,101,.6)':'rgba(112,210,176,.40)';
    ctx.lineWidth=Math.max(1,3*k);
    ctx.setLineDash([9*k,8*k]);
    ctx.beginPath();ctx.ellipse(x,y,radius,radius*.41,0,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };
  controls();render();save();
})();
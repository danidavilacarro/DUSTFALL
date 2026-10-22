/* DUSTFALL · original procedural art. No remote assets or engine dependencies.
   World units use a 2:1 isometric projection; all entities share a depth queue. */
'use strict';
(() => {
 const TAU=Math.PI*2, hits=[], sprites=new Map(), pointers=new Map();
 const colors={core:'#e8a353',water:'#6ec9db',food:'#a3c878',energy:'#e5c471',scrap:'#d58959',housing:'#c8ad86',clinic:'#87d7b6',radar:'#b1cad0',wall:'#c9b79c'};
 const labels={core:'NÚCLEO ATMOSFÉRICO',water:'EXTRACTOR DE AGUA',food:'CULTIVO HIDROPÓNICO',energy:'CENTRAL ENERGÉTICA',scrap:'TALLER DE CHATARRA',housing:'MÓDULOS HABITABLES',clinic:'CLÍNICA',radar:'RADAR',wall:'DEFENSA PERIMETRAL'};
 // Original monochrome HUD pictograms; no icon font or remote image requests.
 const paths={core:'M12 2 21 7v10l-9 5-9-5V7Z M12 6v12 M7 9l5-3 5 3v6l-5 3-5-3Z',water:'M12 2C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-13Z M8 15c0 3 2 4 4 4',food:'M12 22V3 M12 8C4 8 4 3 4 3s8 0 8 5Zm0 6c8 0 8-5 8-5s-8 0-8 5Zm0 5c-8 0-8-5-8-5s8 0 8 5Z',energy:'m14 2-10 12h7l-1 8 10-13h-7Z',scrap:'M14 3a6 6 0 0 0-7 8L2 17l5 5 6-6a6 6 0 0 0 8-7l-4 4-5-5Z',housing:'m2 11 10-9 10 9 M5 9v12h14V9 M10 21v-8h4v8',clinic:'M8 2h8v6h6v8h-6v6H8v-6H2V8h6Z',radar:'M4 17 12 4l8 13 M7 12h10 M12 4V1 M5 22l7-5 7 5 M4 4a11 11 0 0 1 16 0',wall:'M3 2v12c0 5 9 8 9 8s9-3 9-8V2l-9 3Z M8 8v7 M16 8v7 M7 12h10'};
 function icon(id){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[id]}"/></svg>`}
 for(const id of IDS)DB[id].icon=icon(id);
 for(const id of Object.keys(R))R[id].icon=icon(id==='medicine'?'clinic':id);
 const art=window.DustfallArt;
 const artWidth={core:166,water:128,food:148,energy:137,scrap:145,housing:139,clinic:141,radar:112,wall:149};
 const stage=level=>level<1?0:level<3?1:level<5?2:3;
 const roleFor=id=>id==='clinic'?'medical':id==='wall'?'guard':id;
 const crew=id=>Math.max(0,state.v03?.crew?.[roleFor(id)]||0);
 const powered=()=>state.resources.energy>0;
 const sealed=()=>!!state.v02?.shelter;
 const raid=()=>!!state.v03?.pendingRaid;
 const night=()=>state.hour>=20||state.hour<6;
 let lastLevels={...state.levels},effects=[], gesture=null;
 // Reusable original materials; the grain pattern is cached with building sprites.
 const grain=new Image();grain.src='assets/textures/salvage.svg';grain.onload=()=>{sprites.clear();draw()};
 function polygon(c,pts,fill,stroke){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.75;c.stroke()}}
 function line(c,pts,color,width=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke()}
 function ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke()}}
 function project(x,y,z=0){return [(x-y)*54,(x+y-6)*27-z]}
 coords=function(x,y){const p=project(x,y);return [viewport.w/2+state.offsetX+p[0]*viewport.k,viewport.h*.56+state.offsetY+p[1]*viewport.k]};
 // A box's three faces carry different material values and riveted seams.
 function box(c,x,y,w,d,h,roof='#8c8576',left='#5d6057',right='#393f3b'){
  polygon(c,[[x-w,y-d],[x,y],[x,y-h],[x-w,y-d-h]],left,'#272b29');
  polygon(c,[[x,y],[x+w,y-d],[x+w,y-d-h],[x,y-h]],right,'#272b29');
  polygon(c,[[x,y-h-d*2],[x+w,y-h-d],[x,y-h],[x-w,y-h-d]],roof,'#c4b28b88');
  for(let i=8;i<w;i+=11){line(c,[[x-i,y-i*d/w-2],[x-i,y-i*d/w-h+3]],'#17272655');line(c,[[x+i,y-i*d/w-2],[x+i,y-i*d/w-h+3]],'#111d1e66')}
  for(let i=5;i<w;i+=12){c.fillStyle='#c4b49a77';c.fillRect(x+i,y-i*d/w-h+4,1.5,1.5)}
 }
 function tank(c,x,y,r,h,color){const g=c.createLinearGradient(x-r,0,x+r,0);g.addColorStop(0,'#2d4545');g.addColorStop(.35,color);g.addColorStop(.68,'#77928a');g.addColorStop(1,'#273d3d');c.fillStyle=g;c.fillRect(x-r,y-h,r*2,h);ellipse(c,x,y,r,r*.42,'#3d5350','#9ca99a');ellipse(c,x,y-h,r,r*.42,'#a8b9ab','#cbd0b1');for(let j=6;j<h;j+=12)line(c,[[x-r,y-j],[x+r,y-j]],'#182e2e88',2)}
 function pipe(c,pts,color='#b7a383',w=4){line(c,pts,'#232d2a',w+3);line(c,pts,color,w);line(c,pts.map(([x,y])=>[x,y-1]),'#ebd6b366',1)}
 function windows(c,x,y,n,color){for(let j=0;j<n;j++){c.fillStyle='#172a2b';c.fillRect(x+j*10,y-j*4,7,8);c.fillStyle=color;c.fillRect(x+1+j*10,y+1-j*4,4,5)}}
 function sprite(id,level,on){const s=stage(level),key=`${id}:${s}:${on}`;if(sprites.has(key)){const cached=sprites.get(key);sprites.delete(key);sprites.set(key,cached);return cached;}
  const el=document.createElement('canvas');el.width=440;el.height=520;const c=el.getContext('2d');c.scale(2,2);c.translate(110,205);
  const accent=on?colors[id]:'#4e5b58',advanced=s===3,reinforced=s>=2;
  if(s&&art.ready){const image=art.building(id,s),width=artWidth[id]*(s===1?.94:s===2?1:1.07),height=width*image.height/image.width;
   c.save();if(!on)c.filter='brightness(.40) saturate(.4)';c.drawImage(image,-width/2,10-height,width,height);c.restore();return cache();}
  if(!s){polygon(c,[[-35,-12],[0,5],[35,-12],[0,-29]],'#75604744');for(const [x,y] of [[-35,-12],[0,5],[35,-12],[0,-29]]){c.fillStyle='#b9a17b';c.fillRect(x-1,y-6,2,8)}line(c,[[-6,-12],[6,-12]],'#e0ba7b',2);line(c,[[0,-18],[0,-6]],'#e0ba7b',2);return cache()}
  // Raised concrete plinth, foundation bolts and drainage strips.
  box(c,0,8,48,23,6,'#8d8066','#514d41','#393f38');
  for(let i=-36;i<=36;i+=12){c.fillStyle='#bca67c';c.fillRect(i,5-Math.abs(i)*.45,3,2)}
  if(!s){polygon(c,[[-35,-12],[0,6],[35,-12],[0,-30]],'#525047','#bdb087');line(c,[[-28,-12],[28,-12]],'#cbb97b',2);line(c,[[0,-26],[0,1]],'#cbb97b',2);return cache()}
  if(id==='core'){
   box(c,0,0,42,21,22,'#8c8270','#675b46','#3c4540');
   for(const side of [-1,1]){tank(c,side*29,-13,9,36,'#a38150');pipe(c,[[side*38,-5],[side*44,-9],[side*44,-31],[side*24,-43]],'#8a9b8e',5)}
   box(c,0,-18,23,12,62+s*13,'#c5ac7a','#766549','#414842');
   c.fillStyle='#242f2d';c.fillRect(-13,-92-s*6,26,65+s*5);
   const glow=c.createLinearGradient(-12,0,12,0);glow.addColorStop(0,'#7c4b28');glow.addColorStop(.5,accent);glow.addColorStop(1,'#fff0b5');c.fillStyle=on?glow:'#313e37';c.fillRect(-9,-87-s*6,18,55+s*5);
   for(let i=0;i<6;i++)line(c,[[-14,-35-i*10],[14,-35-i*10]],'#333f38',3);
   for(let j=0;j<3;j++){ellipse(c,0,-99-s*6-j*6,28+j,11,'#5b5b4d','#c6ab75')}
   tank(c,0,-117-s*6,13,12,'#9b9d82');
   if(reinforced)for(const side of [-1,1]){box(c,side*42,-10,12,7,40,'#b0a286','#6c6d5d','#424940');pipe(c,[[side*42,-50],[side*22,-66]],'#b8a77d',4)}
   if(advanced){line(c,[[-39,-65],[-39,-136],[0,-150],[39,-136],[39,-65]],'#a3aa91',3);line(c,[[-39,-130],[39,-130]],'#e6c174',3)}
  }else if(id==='water'){
   box(c,0,0,34,17,22,'#9aa89a','#486864','#344c4d');
   tank(c,-18,-13,15,38+s*5,'#83b3b4');tank(c,17,-24,11,33+s*6,'#82b5b7');
   for(let i=0;i<3;i++){box(c,-25+i*18,-2,5,3,15,'#c7c2a5','#6c8d84','#3b5759');pipe(c,[[-25+i*18,-18],[-25+i*18,-9],[8,-12]],accent,2)}
   pipe(c,[[-38,-9],[-43,-12],[-43,-38],[-20,-46]],'#9caf9c');
   if(reinforced)tank(c,35,-22,10,45,'#679799');if(advanced){box(c,0,-42,22,11,14,'#adbdb1','#6c8680','#42615e');pipe(c,[[-34,-46],[-34,-68],[28,-68]],accent,3)}
  }else if(id==='food'){
   for(let j=0;j<(reinforced?3:2);j++){const x=-23+j*22,y=-j*6;box(c,x,y,18,9,18+s*3,'#6c9890','#526e57','#334c42');polygon(c,[[x-18,y-28-s*3],[x,y-41-s*3],[x+18,y-28-s*3],[x,y-19-s*3]],'#7bb1a088','#c0d9bb');for(let i=-1;i<=1;i++){line(c,[[x+i*8,y-23-s*3],[x+i*8,y-35-s*3]],'#b4c8b4',1);line(c,[[x-12,y-16+i*4],[x+10,y-23+i*4]],on?'#b7d880':'#53664c',2)}}
   if(advanced){tank(c,-37,-10,7,30,'#718c73');pipe(c,[[-37,-40],[10,-56],[37,-36]],'#b6bd9d',3)}
  }else if(id==='energy'){
   box(c,0,0,36,18,25,'#a4a08a','#737360','#3c4c49');
   for(let j=0;j<2;j++){tank(c,-19+j*30,-18,9,22+s*5,'#9b9d85');box(c,-22+j*30,-4,10,5,14,'#8d9885','#655f4a','#3c4941');windows(c,-27+j*30,-17,2,accent)}
   for(let i=0;i<(reinforced?3:2);i++){let x=-32+i*26;polygon(c,[[x-13,-47],[x+8,-56],[x+19,-48],[x-2,-39]],'#264552','#8faaa4');line(c,[[x-7,-49],[x+13,-43]],'#7eaaa8');line(c,[[x+1,-53],[x+4,-41]],'#7eaaa8')}
   if(advanced)for(let i=0;i<3;i++)box(c,-27+i*24,3,8,4,28,'#b5b899','#66776a','#3a5148');
  }else if(id==='scrap'){
   box(c,0,0,35,18,26,'#8e7760','#77553d','#3d4238');c.fillStyle='#182827';c.fillRect(-12,-30,23,24);line(c,[[-17,-32],[14,-32]],'#d0a76c',3);
   line(c,[[-31,-7],[-31,-72],[19,-95],[38,-86]],'#353f39',7);line(c,[[-31,-7],[-31,-72],[19,-95],[38,-86]],'#b9a277',3);line(c,[[26,-90],[26,-43],[31,-40]],'#393e35',2);
   for(let i=0;i<7;i++)box(c,29+(i%2)*10,2-i*3,5,3,5,'#9a8973','#6e6450','#3a4540');
   if(reinforced){box(c,-33,8,13,7,12,'#b89464','#7b6547','#4b4c3b');tank(c,37,-29,7,20,'#88765c')}if(advanced)box(c,0,-30,24,12,18,'#adb099','#7c7a62','#45534a');
  }else if(id==='housing'){
   for(let i=0;i<2+s;i++){let x=(i%2)*31-18,y=-Math.floor(i/2)*25-3;box(c,x,y,21,10,20,'#a59a7b','#786e56','#484e42');windows(c,x+2,y-17,2,accent);c.fillStyle='#303c36';c.fillRect(x-11,y-18,7,12)}
   pipe(c,[[-37,-3],[-37,-30],[25,-61]],'#b6a281',2);if(reinforced)line(c,[[-42,-24],[0,-4],[44,-25]],'#ad9874',3);
  }else if(id==='clinic'){
   box(c,0,-2,37,18,32,'#c2c1aa','#81978a','#46655e');box(c,-18,8,18,9,18,'#a8b9a3','#6e8e7d','#405e56');windows(c,6,-32,3,accent);
   c.fillStyle=accent;c.fillRect(-21,-46,17,5);c.fillRect(-15,-52,5,17);line(c,[[-31,-11],[0,5],[26,-10]],'#e4d9b4',2);
   if(reinforced)tank(c,34,-26,8,25,'#b4b9a1');if(advanced)box(c,0,-34,26,13,20,'#b5c5ae','#82998b','#4b6b5d');
  }else if(id==='radar'){
   box(c,0,0,30,15,23,'#939e8a','#636f61','#3d5149');windows(c,2,-20,2,accent);
   const h=82+s*12;for(const side of [-1,1])line(c,[[side*23,-17],[side*7,-h]],'#bab79b',3);for(let i=0;i<4;i++){let y=-30-i*17;line(c,[[-19+i*3,y],[16-i*3,y-17]],'#7b9384',2)}
   tank(c,0,-h,5,8,'#bac3ab');if(reinforced){line(c,[[24,-27],[24,-94]],'#ced1b4',2);line(c,[[18,-86],[30,-86]],'#b7c9b9',2)}if(advanced)box(c,-30,0,15,8,24,'#93a69b','#667f70','#42584e');
  }else if(id==='wall'){
   for(let i=0;i<3;i++){let x=-30+i*30;box(c,x,-Math.abs(i-1)*12,16,8,24+s*6,'#9b9c83','#72725c','#484f42');for(let j=0;j<3;j++)box(c,x-12+j*12,-Math.abs(i-1)*12-28-s*6,4,2,5,'#b4b49a','#7e8067','#535e4b')}
   if(reinforced){box(c,0,-16,13,7,45,'#c3b393','#8b8062','#56654f');windows(c,1,-54,2,accent)}if(advanced)line(c,[[-42,-39],[0,-58],[42,-39]],'#d1c6a1',3);
  }
  if(!reinforced){polygon(c,[[-39,-8],[-15,-27],[8,-16],[-12,-3]],id==='food'?'#879369':'#9e8c63','#c5b486');line(c,[[-39,-8],[-39,3]],'#776a4d',2)}
  if(grain.complete&&grain.naturalWidth){c.save();c.globalAlpha=.16;c.globalCompositeOperation='source-atop';const p=c.createPattern(grain,'repeat');c.fillStyle=p;c.fillRect(-100,-200,200,225);c.restore()}
  return cache();
  function cache(){sprites.set(key,el);if(sprites.size>24)sprites.delete(sprites.keys().next().value);return el}
 }
 function glow(x,y,r,color,alpha=.3){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+Math.round(alpha*255).toString(16).padStart(2,'0'));g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
 function worldLine(points,color,width){line(ctx,points.map(p=>project(...p)),color,width)}
 const ground=document.createElement('canvas');ground.width=1600;ground.height=1100;const gc=ground.getContext('2d');gc.translate(800,540);
 // Cached terrain detail overlays a continuous viewport sand gradient.
 for(let i=0;i<2300;i++){let x=(i*213.73%1600)-800,y=(i*91.71%1100)-540;gc.fillStyle=i%3?'#e2ca8b17':'#2c393232';gc.fillRect(x,y,1+i%4,1+i%2)}
 for(let i=0;i<50;i++){const x=(i*193%1450)-725,y=(i*97%950)-475;line(gc,[[x,y],[x+12,y-3],[x+29,y+1],[x+47,y-5]],'#c0a77a18',1)}
 for(let i=0;i<23;i++){let x=(i*137%1200)-600,y=(i*179%760)-380;if(Math.abs(x)<360&&Math.abs(y)<220)continue;box(gc,x,y,9+i%9,6,10+i%22,'#877d64','#5f6453','#3b4b43');line(gc,[[x-8,y-10],[x-5,y-34]],'#5a6351',2)}
 function terrain(){
  if(art.ready){const pattern=ctx.createPattern(art.ground,'repeat');ctx.save();ctx.scale(.55,.55);ctx.fillStyle=pattern;ctx.fillRect(-2600,-2200,5200,4400);ctx.restore();
   const shadow=ctx.createRadialGradient(0,-40,100,0,0,750);shadow.addColorStop(0,'#5a412000');shadow.addColorStop(1,'#33281d9c');ctx.fillStyle=shadow;ctx.fillRect(-1400,-1200,2800,2400);
  }else ctx.drawImage(ground,-800,-540);
  // Packed dirt within the maintained perimeter, retaining the textured material.
  polygon(ctx,[project(-.3,-.3),project(6.3,-.3),project(6.3,6.3),project(-.3,6.3)],'#9d795026');
  // Orthogonal road network: actors use these exact same segments.
  for(const x of [0,2,4,6])worldLine([[x,0],[x,6]],'#513e2c60',16);
  for(const y of [0,2,4,6])worldLine([[0,y],[6,y]],'#513e2c60',16);
  for(const id of IDS){const [x,y]=DB[id].xy;worldLine([[x,y],[x,Math.floor(y/2)*2]],'#6f513c55',14);worldLine([[x,y],[x,Math.floor(y/2)*2]],'#d2aa6940',1)}
  for(const x of [0,2,4,6]){worldLine([[x,0],[x,6]],'#aa864644',1);worldLine([[x+.12,0],[x+.12,6]],'#493e2e33',1)}
  // Utility main follows the perimeter and connects to the atmospheric plant.
  worldLine([[-.1,0],[-.1,6.1],[6.1,6.1]],'#424f46',5);worldLine([[-.1,0],[-.1,6.1],[6.1,6.1]],'#b5a685',2);
 }
 function prop(name,x,y,width,opacity=1){if(!art.ready)return;const image=art.prop(name),h=width*image.height/image.width;ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(image,x-width/2,y-h,width,h);ctx.restore()}
 function scenery(){if(!art.ready)return;for(let i=0;i<18;i++){const a=i*2.399,r=405+(i%5)*45,x=Math.cos(a)*r,y=Math.sin(a)*r*.55;prop(i%3===0?'ruin':'salvage',x,y,35+i%4*12,.86)}
  for(const p of [[0,2],[2,0],[4,6],[6,4]]){const [x,y]=project(...p);prop('powerpole',x-9,y,31)}
  const [x,y]=project(2,4);prop('barrier',x+14,y+5,36);
 }
 function perimeter(front,t){const lvl=state.levels.wall,s=stage(lvl),height=lvl?15+s*4:6;
  for(const side of front?[2,3]:[0,1]){for(let i=0;i<13;i++){const n=i*.52-.35;if(side===2&&i===6)continue;const p=side===0?[n,-.38]:side===1?[-.38,n]:side===2?[6.38,n]:[n,6.38];const [x,y]=project(...p);if(art.ready){prop(!lvl?'barrier':(side===0||side===3)?'wallSE':'wallSW',x,y+7,!lvl?32:39+s*3)}else box(ctx,x,y,15,7,height,lvl?'#a5a082':'#958970','#747663','#4b594a');if(lvl&&i%4===0){if(art.ready)prop('watchtower',x,y+5,29+s*3);else box(ctx,x,y-10,8,4,height+12,'#b2b596','#788472','#4c6358');if(powered()){glow(x,y-height-25,16,raid()?'#ff694a':'#f2d59a',.25);ellipse(ctx,x,y-height-25,2,2,raid()?'#ff7958':'#f4d597')}}}}
  if(front){const [x,y]=project(6.38,2.8);line(ctx,[[x-17,y-22],[x+15,y-37]],sealed()?'#e9b76a':'#8b9981',sealed()?9:3);if(raid()&&powered()){polygon(ctx,[[x,y-40],[x+80+Math.sin(t)*30,y+30],[x+120,y-5]],'#ffe2a41a')}}
 }
 function drawBuilding(id,t){const [x,y]=project(...DB[id].xy),lv=state.levels[id],s=stage(lv),on=powered();
  if(lastLevels[id]!==lv){effects.push({id,at:performance.now()});lastLevels[id]=lv}
  ellipse(ctx,x+14,y+5,lv?55:36,lv?19:13,'#202c3055');
  if(state.selected===id&&state.tab==='city'){polygon(ctx,[[x-50,y-20],[x,y-44],[x+50,y-20],[x,y+5]],'#f7c87818','#f4d18a');}
  ctx.drawImage(sprite(id,lv,on),x-110,y-205,220,260);
  // Exact alpha hit region uses cached sprite pixels, resolving overlapping roofs.
  hits.push({id,x,y,sprite:sprite(id,lv,on)});
  if(lv&&on){const lightY=id==='core'?y-88-s*6:id==='radar'?y-85-s*12:y-27;glow(x,lightY,id==='core'?48:17,colors[id],night()?.28:.12);
   if(id==='radar'&&!art.ready){ctx.save();ctx.translate(x,y-91-s*12);ctx.scale(.45+.25*Math.sin(t*.7),1);ellipse(ctx,0,0,22,10,'#b8c3ae','#edf0c6');line(ctx,[[0,0],[7,-18]],'#dde0bb',2);ctx.restore()}
   if(id==='core'){if(state.v04){const airColor=state.air<45?'#f56748':state.air<70?'#ffc465':'#8edbc2';ctx.save();ctx.setLineDash([4,5]);ctx.strokeStyle=airColor+'77';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y-14,49,22,0,0,TAU);ctx.stroke();ctx.restore();if(state.v04.filtration==='boost')glow(x,y-70,60,'#efbd69',.18)}for(let i=0;i<6;i++){const a=(t*.6+i*.17)%1;ellipse(ctx,x+Math.sin(i+t)*a*12,y-139-s*6-a*55,4+a*12,3+a*6,`rgba(204,212,187,${(1-a)*.14})`)}line(ctx,[[x-14,y-112-s*6],[x+Math.sin(t*5)*13,y-112-s*6]],'#dac9a1',2)}
   if(!sealed()&&crew(id)>0&&id==='scrap'&&Math.sin(t*3)>.55)for(let j=0;j<5;j++)line(ctx,[[x+4,y-18],[x+4+Math.sin(j*2+t)*11,y-18+j*3]],'#ffd997',1);
   if(!sealed()&&crew(id)>0&&id==='energy'){ellipse(ctx,x+20,y-21,2,2,Math.sin(t*6)>.5?'#f8db8b':'#67836b')}
  }
  if(lv&&state.v02?.integrity<40){line(ctx,[[x-15,y-22],[x-6,y-14],[x-10,y-5]],'#251e1a',2);if(id==='core')ellipse(ctx,x+22,y-23,3,3,'#f37954')}
  if(state.construction?.id===id){const progress=clamp((Date.now()-state.construction.started)/(state.construction.ends-state.construction.started),0,1);line(ctx,[[x-40,y+8],[x+40,y+8]],'#263c37',5);line(ctx,[[x-40,y+8],[x-40+80*progress,y+8]],'#f6c676',3);for(const side of [-1,1])line(ctx,[[x+side*43,y],[x+side*43,y-80],[x-side*40,y-41]],'#d8ba7c',1)}
 }
 function actor(role,x,y,t,index,action){
  if(art.ready){const kind=['medical','guard','raider','explorer'].includes(role)?role:'worker',moving=action==='walk'||action==='carry';const frame=moving?Math.floor(t*5+index)%2:0,image=art.person(kind,frame),h=17,w=h*image.width/image.height;ellipse(ctx,x,y+1,3.5,1.5,'#251e1766');ctx.save();ctx.translate(x,y+(moving?Math.sin(t*10+index)*.35:0));ctx.drawImage(image,-w/2,-h,w,h);ctx.restore();return}

  const medic=role==='medical',guard=role==='guard',raider=role==='raider',explorer=role==='explorer';
  const color=medic?'#c8dbbe':guard?'#5e7b78':raider?'#ad6246':explorer?'#9d9674':'#d3ac70';
  ellipse(ctx,x+1,y+1,4,2,'#263a3580');const step=action==='walk'?Math.sin(t*7+index)*2:0;
  line(ctx,[[x-1,y-2],[x-2-step,y+3]],'#2d4543',2);line(ctx,[[x+1,y-2],[x+2+step,y+3]],'#2d4543',2);
  box(ctx,x,y-3,2.8,1.3,5,color,color,'#53645c');ellipse(ctx,x,y-11,2.5,2.7,'#d9ba8d');
  if(guard||raider){ellipse(ctx,x,y-12,3.2,1.7,raider?'#66463d':'#637d77');line(ctx,[[x+2,y-6],[x+7,y-9]],'#263936',2)}else if(explorer){box(ctx,x-4,y-4,2,1,5,'#a6976c','#746f50','#4c6053')}else if(medic){ctx.fillStyle='#4d9f7c';ctx.fillRect(x-1,y-8,2,4);ctx.fillRect(x-2,y-7,4,1)}else{ellipse(ctx,x,y-13,3,1.5,'#e2be76');if(action==='carry')box(ctx,x+4,y-3,3,2,4,'#a79d76','#7a7859','#47584a');if(action==='repair')line(ctx,[[x+2,y-5],[x+6+Math.sin(t*7)*2,y-10]],'#b7c6a7',1.5)}
  if(medic&&state.sick>0){line(ctx,[[x+3,y-4],[x+6,y-7+Math.sin(t*4)*2]],'#e1dfb6',2)}
 }
 // Manhattan paths connect each site entrance to a shared road intersection.
 function routePosition(id,phase){const [x,y]=DB[id].xy,road=Math.floor(y/2)*2;const points=[[x,y],[x,road],[2,road],[2,2]];const segments=points.slice(1).map((p,i)=>Math.abs(p[0]-points[i][0])+Math.abs(p[1]-points[i][1]));const length=segments.reduce((a,b)=>a+b,0);let distance=(phase%2<1?phase%1:1-phase%1)*length;
  for(let i=0;i<segments.length;i++){if(distance<=segments[i]&&segments[i]>0){let f=distance/segments[i];return [points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f]}distance-=segments[i]}return points.at(-1)
 }
 function actors(t){const entities=[],sites=['water','food','energy','scrap','clinic','wall'];
  const capacity=Math.max(0,state.pop-state.sick-(state.expedition?3:0)),total=sites.reduce((n,id)=>n+crew(id),0),ratio=Math.min(1,capacity/Math.max(1,total));
  const shares=sites.map(id=>({id,exact:crew(id)*ratio,n:Math.floor(crew(id)*ratio)}));
  let remaining=Math.min(capacity,total)-shares.reduce((n,s)=>n+s.n,0);
  for(const share of [...shares].sort((a,b)=>(b.exact-b.n)-(a.exact-a.n))){if(remaining>0&&share.exact>share.n){share.n++;remaining--}}
  for(const id of sites){if(!state.levels[id]&&id!=='wall')continue;const n=shares.find(s=>s.id===id).n;if(sealed()&&id!=='clinic'&&id!=='wall')continue;
   for(let j=0;j<n;j++){let p=routePosition(id,(t*.045+j*.31)%2),role=roleFor(id),action=j%2?'carry':'walk';if((state.v02?.integrity<100||state.construction?.id===id)&&j===0){p=[...DB[id].xy];p[1]+=.45;action='repair'}if(id==='wall'){p=[6.1,clamp(2.5+Math.sin(t*.15+j)*2,.2,6)];role='guard';action='walk'}if(id==='clinic'){p=[5.1+j*.13,1.4];action='heal'}const [x,y]=project(...p);entities.push({depth:p[0]+p[1]+.06,draw:()=>actor(role,x,y,t,j,action)})}
  }
  if(state.sick>0&&state.levels.clinic){const [x,y]=project(5.4,1.3);entities.push({depth:6.75,draw:()=>{box(ctx,x,y,6,3,3,'#b5c2a0','#86997c','#4a6d5c');ellipse(ctx,x-2,y-7,2.5,2,'#c9ba95');line(ctx,[[x-1,y-6],[x+6,y-9]],'#bdc8a5',3)}})}
  if(state.expedition)for(let j=0;j<3;j++){let p=[6.9+j*.15,2.8+Math.sin(t*.1)*.6];const [x,y]=project(...p);entities.push({depth:p[0]+p[1],draw:()=>actor('explorer',x,y,t,j,'walk')})}
  if(raid())for(let j=0;j<7;j++){const p=[7.1+j*.22,1.1+(j%3)*.5], [x,y]=project(...p);entities.push({depth:p[0]+p[1],draw:()=>actor('raider',x+Math.sin(t+j)*2,y,t,j,'walk')})}
  if(state.levels.scrap&&crew('scrap')>0&&!sealed()){const p=routePosition('scrap',(t*.025)%2),[x,y]=project(...p);entities.push({depth:p[0]+p[1],draw:()=>{ellipse(ctx,x,y+2,13,5,'#2a3d3555');if(art.ready)prop('truck',x,y+3,30);else box(ctx,x,y,12,6,6,'#b09968','#7e7655','#3a5047')}})}
  return entities;
 }
 function label(id){const [x,y]=project(...DB[id].xy),lv=state.levels[id];const selected=state.selected===id&&state.sheetOpen;if(!lv&&!selected)return;
  const text=lv?`${selected?labels[id]+' · ':''}NV. ${lv}`:`+ ${id==='wall'?'DEFENSA':id==='clinic'?'CLÍNICA':'RADAR'}`;ctx.font='600 8px Arial';const w=ctx.measureText(text).width+12;
  ctx.fillStyle=selected?'#d7b47d':'#1d3430dd';ctx.fillRect(x-w/2,y+14,w,15);ctx.fillStyle=selected?'#263b36':lv?'#eee1b9':'#dbc498';ctx.textAlign='center';ctx.fillText(text,x,y+24);
  if(lv&&crew(id)){ellipse(ctx,x+w/2+5,y+21,2,2,sealed()?'#d9b478':'#a8d2a4')}
 }
 draw=function(){if(!viewport.w||!viewport.h)return;const w=viewport.w,h=viewport.h;viewport.k=Math.min(w/870,h/580)*state.zoom;const k=viewport.k,t=performance.now()/1000;
  ctx.clearRect(0,0,w,h);const sky=ctx.createRadialGradient(w/2+state.offsetX,h*.56+state.offsetY,40*k,w/2+state.offsetX,h*.56+state.offsetY,800*k);sky.addColorStop(0,'#a38c65');sky.addColorStop(.5,'#7e7054');sky.addColorStop(1,'#3c4945');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);hits.length=0;
  ctx.save();ctx.translate(w/2+state.offsetX,h*.56+state.offsetY);ctx.scale(k,k);
  terrain();scenery();perimeter(false,t);
  const entities=IDS.map(id=>({depth:DB[id].xy[0]+DB[id].xy[1],draw:()=>drawBuilding(id,t)}));entities.push(...actors(t));entities.sort((a,b)=>a.depth-b.depth);for(const e of entities)e.draw();perimeter(true,t);
  if(night()){ctx.fillStyle='#0c283b55';ctx.fillRect(-1200,-900,2400,1800);if(powered())for(const id of IDS){if(!state.levels[id])continue;const [x,y]=project(...DB[id].xy);glow(x,y-25,70,colors[id],.18)}}
  for(const id of IDS)label(id);
  effects=effects.filter(e=>performance.now()-e.at<2200);for(const e of effects){const age=(performance.now()-e.at)/2200,[x,y]=project(...DB[e.id].xy);ellipse(ctx,x,y,40+age*40,20+age*20,`rgba(238,204,133,${(1-age)*.15})`);ctx.strokeStyle=`rgba(255,224,154,${1-age})`;ctx.lineWidth=2;ctx.stroke();for(let j=0;j<12;j++)ellipse(ctx,x+Math.sin(j*2.4)*age*50,y-age*90+j%3*5,1.5,1.5,`rgba(255,223,155,${1-age})`)}
  ctx.restore();
  if(storming()){ctx.fillStyle='#c58a424f';ctx.fillRect(0,0,w,h)}if(state.air<45){ctx.fillStyle='#7e8e4730';ctx.fillRect(0,0,w,h)}
  for(let i=0;i<(storming()?115:24);i++){const x=(i*137.4+t*(storming()?190:12))%(w+80)-40,y=(i*63.9+t*8)%h;line(ctx,[[x,y],[x+(storming()?25:3),y-3]],storming()?'#e1bd7b44':'#d8cb9a25',i%3*.5+.4)}
  const v=ctx.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.3,w*.5,h*.5,Math.max(w,h)*.8);v.addColorStop(0,'#0a242000');v.addColorStop(1,'#0c242a99');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 };
 sceneHit=function(clientX,clientY){const r=canvas.getBoundingClientRect(),k=viewport.k;const x=(clientX-r.left-viewport.w/2-state.offsetX)/k,y=(clientY-r.top-viewport.h*.56-state.offsetY)/k;
  for(const hit of [...hits].reverse()){const sx=Math.floor((x-hit.x+110)*2),sy=Math.floor((y-hit.y+205)*2);if(sx>=0&&sx<440&&sy>=0&&sy<520&&hit.sprite.getContext('2d').getImageData(sx,sy,1,1).data[3]>45)return hit.id}return null;
 };
 function zoomTo(value,cx=viewport.w/2,cy=viewport.h*.56){const old=state.zoom;state.zoom=clamp(value,.65,2.4);const ratio=state.zoom/old;state.offsetX=cx-viewport.w/2-(cx-viewport.w/2-state.offsetX)*ratio;state.offsetY=cy-viewport.h*.56-(cy-viewport.h*.56-state.offsetY)*ratio;draw()}
 canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);gesture={moved:pointers.size>1,last:{x:e.clientX,y:e.clientY},distance:pointers.size===2?distance():0};});
 function distance(){const p=[...pointers.values()];return p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0}
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const d=distance(),p=[...pointers.values()],r=canvas.getBoundingClientRect();if(gesture.distance)zoomTo(state.zoom*d/gesture.distance,(p[0].x+p[1].x)/2-r.left,(p[0].y+p[1].y)/2-r.top);gesture.distance=d;gesture.moved=true}else{const dx=e.clientX-old.x,dy=e.clientY-old.y;if(Math.hypot(e.clientX-gesture.last.x,e.clientY-gesture.last.y)>6)gesture.moved=true;if(gesture.moved){state.offsetX=clamp(state.offsetX+dx,-viewport.w,viewport.w);state.offsetY=clamp(state.offsetY+dy,-viewport.h,viewport.h);draw()}}});
 canvas.addEventListener('pointerup',e=>{if(gesture&&!gesture.moved&&pointers.size===1){const id=sceneHit(e.clientX,e.clientY);if(id)selectBuilding(id)}pointers.delete(e.pointerId);if(!pointers.size){gesture=null;save()}else if(gesture){gesture.moved=true;gesture.distance=0}});
 canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null});
 canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoomTo(state.zoom*Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);save()},{passive:false});
 $('zoomIn').onclick=()=>{zoomTo(state.zoom*1.2);save()};$('zoomOut').onclick=()=>{zoomTo(state.zoom/1.2);save()};$('centerView').onclick=()=>{state.zoom=1;state.offsetX=0;state.offsetY=0;draw();save()};
 const originalPanel=panelCity;
 panelCity=function(){const id=state.selected||'core',lv=state.levels[id],s=stage(lv);let html=originalPanel();const summary=`<div class="visual-stage"><span>ETAPA ${s||'—'} · ${['PARCELA','IMPROVISADA','REFORZADA','CONSOLIDADA'][s]}</span><div>${[1,2,3].map(n=>`<i class="${s>=n?'lit':''}"></i>`).join('')}</div></div>`;
  const production=['water','food','energy','scrap'].includes(id)?`${Math.round((gain(id)*(storming()?({water:.55,food:.75,energy:.45,scrap:1}[id]):1)-(id==='scrap'&&sealed()?3*lv:0))*10)/10} / h`:DB[id].produces;
  const info=`<div class="site-output"><span>PRODUCCIÓN / SERVICIO</span><strong>${production}</strong><small>${!powered()?'Sin energía · iluminación desconectada':sealed()?'Protocolo de refugio activo':'Red de suministros operativa'}</small></div>`;
  return html.replace('<div class="building-icon">',summary+'<div class="building-icon">').replace('<div class="section-title">MEJORA DE EDIFICIO</div>',info+'<div class="section-title">MEJORA DE EDIFICIO</div>')};
 const oldRender=render;render=function(){oldRender();$('versionBadge').textContent='VISUAL OVERHAUL · V1';document.body.classList.toggle('panel-visible',!!state.sheetOpen);document.body.classList.toggle('power-outage',!powered());document.body.classList.toggle('shelter-active',sealed());const tray=$('buildingTray');if(tray)tray.innerHTML=IDS.map(id=>`<button data-select="${id}" class="site-shortcut ${state.selected===id?'active':''}" aria-label="Gestionar ${DB[id].name}"><span>${DB[id].icon}</span><small>${id==='core'?'NÚCLEO':id==='housing'?'VIVIENDAS':id==='scrap'?'TALLER':id==='food'?'CULTIVO':id==='wall'?'MURALLA':id==='clinic'?'CLÍNICA':id==='energy'?'ENERGÍA':id==='water'?'AGUA':'RADAR'}</small><b>${state.levels[id]||'+'}</b></button>`).join('')};
 const tray=document.createElement('div');tray.id='buildingTray';tray.className='building-tray';tray.setAttribute('aria-label','Edificios del asentamiento');$('world').append(tray);
 const baseSetTab=setTab;setTab=function(id){if(id==='city'&&state.tab==='city'&&state.sheetOpen){state.sheetOpen=false;render();save()}else baseSetTab(id)};
 $('sheetClose').onclick=()=>{state.sheetOpen=false;render();save()};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){state.sheetOpen=false;render();save()}if(e.target.matches('input,textarea'))return;if(e.key==='+'||e.key==='=')$('zoomIn').click();if(e.key==='-')$('zoomOut').click();if(e.key==='Home')$('centerView').click()});
 // One visual clock is provided by v0.2. ResizeObserver handles drawer/viewport changes.
 new ResizeObserver(resize).observe($('world'));
 window.DustfallVisual=Object.freeze({stage,labels,routePosition,version:'1.0.0'});
 for(const id of ['shelterBtn','crisisBtn','lifeSupportBtn']){const button=$(id);if(button){const text=button.textContent;button.title=text;button.setAttribute('aria-label',text)}}
 const loading=document.createElement('div');loading.className='art-loading';loading.innerHTML='<span>DUSTFALL</span><small>PREPARANDO LA COLONIA…</small>';$('world').append(loading);
 function reveal(){sprites.clear();render();loading.remove()}
 if(art.ready)reveal();else art.loaded.then(ok=>{if(ok)reveal();else{loading.innerHTML='<span>RECURSOS NO DISPONIBLES</span><small>No se ha podido cargar el arte de la colonia. Recarga cuando recuperes la conexión.</small>'}});
 render();resize();
})();

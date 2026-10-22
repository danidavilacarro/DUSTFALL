/* DUSTFALL original generated sprite art. Atlases contain individual buildings,
   never a painted city; source alpha silhouettes also define the selection area. */
'use strict';
(() => {
 const root='assets/art/',images={},cutouts=new Map();
 const files=['buildings-stage-1.webp','buildings-stage-2.webp','buildings-stage-3.webp','radar-stages.webp','environment.webp','desert-ground.webp','survivors.webp'];
 const art={ready:false,error:null,metadata:null,ground:null,files};
 function load(file){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[file]=im;resolve()};im.onerror=()=>reject(new Error('No se pudo cargar '+file));im.src=root+file})}
 function cut(entry,key){if(cutouts.has(key))return cutouts.get(key);const [x,y,w,h]=entry.rect,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.beginPath();entry.outline.forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py));g.closePath();g.clip();g.drawImage(images[entry.atlas],x,y,w,h,0,0,w,h);cutouts.set(key,c);return c}
 art.building=(id,stage)=>art.ready?cut(art.metadata.buildings[id][stage],`${id}:${stage}`):null;
 art.person=(role,frame)=>art.ready?cut(art.metadata.people[role][frame],`${role}:${frame}`):null;
 art.prop=name=>art.ready?cut(art.metadata.props[name],name):null;
 art.loaded=Promise.all([fetch(root+'atlas.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar el atlas');return r.json()}).then(m=>art.metadata=m),...files.map(load)]).then(()=>{art.ground=images['desert-ground.webp','survivors.webp'];art.ready=true;document.dispatchEvent(new Event('dustfall-art-ready'));return true}).catch(e=>{art.error=e.message;console.error(e);return false});
 window.DustfallArt=art;
})();

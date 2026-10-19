/* Scene geometry and rendering. Works offline through a classic script tag;
   exports the same geometry functions to Node for navigation checks. */
(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const inRect=(x,y,r)=>x>=r[0]&&y>=r[1]&&x<r[0]+r[2]&&y<r[1]+r[3];
  function inPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }return inside;}
  function distanceRect(x,y,r){return Math.hypot(x-clamp(x,r[0],r[0]+r[2]),y-clamp(y,r[1],r[1]+r[3]));}
  function surfaceAt(scene,x,y){
    for(const s of scene.stairs)if(inRect(x,y,s.bounds)){
      const i=s.axis==='x'?0:1,t=clamp(((i===0?x:y)-s.bounds[i])/s.bounds[i+2],0,1);
      return{id:s.id,level:s.startLevel+(s.endLevel-s.startLevel)*t,stairs:true};
    }
    for(const f of [...scene.floors].reverse())if(inPolygon(x,y,f.polygon))return{id:f.id,level:f.level,stairs:false};
    if(scene.terrain.find(t=>t.id==='grass').rects.some(r=>inRect(x,y,r)))return{id:'island',level:0,stairs:false};
    return null;
  }
  function blocked(scene,x,y,radius=.22){return scene.objects.some(o=>o.collisionRect&&distanceRect(x,y,o.collisionRect)<radius-.0001);}
  function standable(scene,x,y,radius=.22){return !!surfaceAt(scene,x,y)&&!blocked(scene,x,y,radius)&&
    [[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dy])=>!!surfaceAt(scene,x+dx,y+dy));}
  function canMove(scene,from,to,radius=.22){
    const a=surfaceAt(scene,from.x,from.y),b=surfaceAt(scene,to.x,to.y);
    return !!a&&!!b&&standable(scene,to.x,to.y,radius)&&Math.abs(a.level-b.level)<=.6;
  }
  function movePlayer(scene,p,dx,dy){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.08));
    for(let n=0;n<steps;n++){
      let next={x:p.x+dx/steps,y:p.y};if(canMove(scene,p,next))p.x=next.x;
      next={x:p.x,y:p.y+dy/steps};if(canMove(scene,p,next))p.y=next.y;
    }return p;
  }
  function renderBounds(o){const rects=[o.visualBounds,...(o.parts||[]).map(p=>p.rect)];
    const x=Math.min(...rects.map(r=>r[0])),y=Math.min(...rects.map(r=>r[1]));
    return[x,y,Math.max(...rects.map(r=>r[0]+r[2]))-x,Math.max(...rects.map(r=>r[1]+r[3]))-y];
  }
  function relocateObject(scene,id,dx,dy){
    // Explicit scene coordinates keep this first reconstruction easy to inspect.
    // Always move a prefab through this helper so attached art moves with it.
    const o=scene.objects.find(o=>o.id===id);if(!o)throw Error('Unknown scene object: '+id);
    const move=r=>{r[0]+=dx;r[1]+=dy;};
    move(o.visualBounds);if(o.collisionRect)move(o.collisionRect);
    for(const s of o.shapes)move(s.rect);for(const p of o.parts)move(p.rect);
    o.sortY+=dy;
    for(const child of scene.objects.filter(c=>c.parent===id))relocateObject(scene,child.id,dx,dy);
    return o;
  }
  function nearestInteraction(scene,p){return scene.objects.filter(o=>o.interaction).map(o=>{
    const r=o.collisionRect||(scene.objects.find(a=>a.id===o.parent)||{}).collisionRect||o.visualBounds;
    return{o,distance:distanceRect(p.x,p.y,r)};
  }).filter(o=>o.distance<2).sort((a,b)=>a.distance-b.distance)[0]?.o||null;}
  function inspectAt(scene,x,y){
    const sorted=[...scene.objects].sort((a,b)=>b.sortY-a.sortY);
    for(const o of sorted)if(inRect(x,y,renderBounds(o)))return o.id;
    for(const s of scene.stairs)if(s.visualRects.some(r=>inRect(x,y,r)))return s.id;
    const floor=[...scene.floors].reverse().find(f=>inPolygon(x,y,f.polygon));return floor?.id||null;
  }
  function tracePath(scene,start,target,step=.5){
    const snap=p=>({x:Math.floor(p.x/step)*step+step/2,y:Math.floor(p.y/step)*step+step/2});
    const a=snap(start),b=snap(target),key=p=>p.x+','+p.y;
    if(!standable(scene,a.x,a.y)||!standable(scene,b.x,b.y))return null;
    const queue=[a],seen=new Map([[key(a),null]]);let head=0,end=null;
    while(head<queue.length){const p=queue[head++];if(key(p)===key(b)){end=p;break;}
      for(const [dx,dy]of [[step,0],[-step,0],[0,step],[0,-step]]){const n={x:p.x+dx,y:p.y+dy},k=key(n);
        if(n.x<0||n.x>=64||n.y<0||n.y>=64||seen.has(k)||!canMove(scene,p,n))continue;
        seen.set(k,p);queue.push(n);
      }
    }
    if(!end)return null;const path=[];for(let p=end;p;p=seen.get(key(p)))path.push(p);return path.reverse();
  }
  // an Image is ready when loaded; a Canvas (live window sky) is always ready.
  function rdy(x){return !!x&&(x.complete!==undefined?(x.complete&&x.naturalWidth>0):x.width>0);}
  function rect(ctx,r,color){ctx.fillStyle=color;ctx.fillRect(...r);}
  function polygon(ctx,points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}
  function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function drawPart(ctx,p,time){const [x,y,w,h]=p.rect;ctx.save();
    if(p.kind==='cat'){
      const col=p.color||'#8a6a46',dk=p.dark||'#5f4830';
      if(p.flip){ctx.translate(2*x+w,0);ctx.scale(-1,1);}
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.beginPath();ctx.ellipse(x+w*.5,y+h-.04,w*.4,h*.1,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=col;ctx.lineWidth=h*.16;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+w*.14,y+h*.62);ctx.quadraticCurveTo(x-w*.03,y+h*.3,x+w*.16,y+h*.12);ctx.stroke();
      ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x+w*.5,y+h*.63,w*.4,h*.3,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(x+w*.76,y+h*.42,w*.25,h*.27,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(x+w*.64,y+h*.26);ctx.lineTo(x+w*.6,y+h*.02);ctx.lineTo(x+w*.74,y+h*.2);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(x+w*.82,y+h*.2);ctx.lineTo(x+w*.9,y+h*.02);ctx.lineTo(x+w*.88,y+h*.26);ctx.closePath();ctx.fill();
      ctx.strokeStyle=dk;ctx.lineWidth=h*.05;ctx.beginPath();ctx.moveTo(x+w*.4,y+h*.42);ctx.lineTo(x+w*.42,y+h*.82);ctx.moveTo(x+w*.54,y+h*.4);ctx.lineTo(x+w*.56,y+h*.84);ctx.stroke();
      ctx.fillStyle='#14141a';ctx.beginPath();ctx.arc(x+w*.7,y+h*.42,w*.03,0,Math.PI*2);ctx.arc(x+w*.83,y+h*.42,w*.03,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d98a9a';ctx.fillRect(x+w*.76,y+h*.5,w*.03,h*.03);
    }else if(p.kind==='sprite'){
      if(p.img&&p.img.complete&&p.img.naturalWidth){
        if(p.flip){ctx.translate(2*x+w,0);ctx.scale(-1,1);}
        ctx.drawImage(p.img,p.sx,p.sy,p.sw,p.sh,x,y,w,h);
      }
    }ctx.restore();
  }
  function drawPlayer(ctx,p,time,walking){ctx.save();const x=p.x,y=p.y,bob=walking?Math.sin(time/90)*.07:0;
    ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(x,y-.08,.6,.19,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#151a20';rounded(ctx,x-.42,y-2.85+bob,.84,.95,.4);rounded(ctx,x-.29,y-2.08+bob,.58,1.35,.16);
    const stride=walking?Math.sin(time/95)*.16:0;rect(ctx,[x-.34,y-.83+stride,.25,.75],'#151a20');rect(ctx,[x+.08,y-.83-stride,.25,.75],'#151a20');
    ctx.fillStyle='#eee7ce';ctx.beginPath();ctx.ellipse(x-.16,y-2.46+bob,.065,.13,0,0,Math.PI*2);ctx.ellipse(x+.16,y-2.46+bob,.065,.13,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawScene(ctx,scene,view){
    const {time=0,player=scene.spawn,grid=false,footprints=false,selection=null,details=true,showWalls=true,cutaway=true,groundOnly=false,walking=false,playerSprite=null,images={},grounds=[],sky=null,hidePlayer=false}=view;
    ctx.save();ctx.imageSmoothingEnabled=false;
    // With a screen-space sky backdrop the void stays unpainted (the sky shows
    // through the transparent-void ground); otherwise fill the flat void color.
    if(!sky)rect(ctx,[0,0,64,64],scene.palette.void);
    // Hand-drawn ground slices (island, floor, …) replace the whole terrain/
    // floor/stairs block; each is a full-canvas 2048² layer drawn back-to-front.
    if(grounds.length){for(const g of grounds)if(rdy(g))ctx.drawImage(g,0,0,64,64);}
    else{
      for(const t of scene.terrain.filter(t=>t.id!=='floor'))for(const r of t.rects)rect(ctx,r,t.color);
      // Inferred floor behind the artwork prevents holes when walls fade.
      for(const f of scene.floors)polygon(ctx,f.polygon,groundOnly?(f.level===4?'#daa566':'#b78053'):scene.palette.floor);
      for(const r of scene.terrain.find(t=>t.id==='floor').rects)rect(ctx,r,scene.palette.floor);
      for(const s of scene.stairs){for(const r of s.visualRects)rect(ctx,r,scene.palette.steps);
        if(details||groundOnly){ctx.strokeStyle='#b77714';ctx.lineWidth=.07;const [x,y,w,h]=s.bounds;ctx.beginPath();
          if(s.axis==='y'){for(let yy=y+.5;yy<y+h;yy+=.5){ctx.moveTo(x,yy);ctx.lineTo(x+w,yy);}}
          else{for(let xx=x+.5;xx<x+w;xx+=.5){ctx.moveTo(xx,y);ctx.lineTo(xx,y+1);}}ctx.stroke();}
      }
    }
    if(grid){ctx.strokeStyle='#24252c25';ctx.lineWidth=.025;ctx.beginPath();for(let n=0;n<=64;n++){ctx.moveTo(n,0);ctx.lineTo(n,64);ctx.moveTo(0,n);ctx.lineTo(64,n);}ctx.stroke();}
    if(!groundOnly){
      // Each object is its own full-canvas (tileCount×32 square, e.g. 2048²)
      // slice. Full-canvas slices are sampled as a TIGHT CROP of the object's
      // own world rect — not blitted whole — so even on a high-DPI laptop a
      // per-object draw only fills that object's pixels, not the entire 2048².
      // Objects draw in sortY order, so occlusion and the wall cutaway fade
      // work exactly as they did when every object had its own cropped PNG.
      const TILES=(scene.grid&&scene.grid.columns)||64,FULL=TILES*32,T=32;
      const isFull=im=>rdy(im)&&im.naturalWidth===FULL&&im.naturalHeight===FULL;
      const put=(im,vb)=>{if(isFull(im))ctx.drawImage(im,vb[0]*T,vb[1]*T,vb[2]*T,vb[3]*T,vb[0],vb[1],vb[2],vb[3]);else ctx.drawImage(im,vb[0],vb[1],vb[2],vb[3]);};
      const groups=scene.objects.filter(o=>!o.parent).map((o,i)=>({o,sort:o.sortY,i}));
      groups.push({o:null,sort:player.y,i:999});groups.sort((a,b)=>a.sort-b.sort||a.i-b.i);
      for(const g of groups){
        if(!g.o){if(hidePlayer)continue;
          const ps=playerSprite;
          if(ps&&ps.img&&ps.img.complete&&ps.img.naturalWidth){const _dx=player.x-ps.w/2,_dy=player.y-ps.h;ctx.save();if(ps.flip){ctx.translate(2*_dx+ps.w,0);ctx.scale(-1,1);}ctx.drawImage(ps.img,ps.sx,ps.sy,ps.sw,ps.sh,_dx,_dy,ps.w,ps.h);ctx.restore();}
          else drawPlayer(ctx,player,time,walking);
          continue;}
        const o=g.o;if(o.category==='wall'&&!showWalls)continue;
        ctx.save();const b=renderBounds(o);
        if(o.category==='wall'&&cutaway&&player.x>b[0]&&player.x<b[0]+b[2]&&player.y>b[1]&&player.y<o.sortY)ctx.globalAlpha=.25;
        const oi=images[o.id];
        if(rdy(oi))put(oi,o.visualBounds);
        else for(const s of o.shapes)rect(ctx,s.rect,s.color);
        for(const child of scene.objects.filter(c=>c.parent===o.id)){
          if(sky&&child.category==='mounted'&&/window/.test(child.id)){
            // the glass is a cutout onto the one shared sky backdrop (aligned,
            // screen-space) — not a copy; then the frame + ledge PNG over it.
            const gs=(child.shapes.find(s=>s.role==='glass')||child.shapes[0]).rect;
            ctx.save();ctx.beginPath();ctx.rect(gs[0],gs[1],gs[2],gs[3]);ctx.clip();
            if(rdy(sky.img)){ctx.setTransform(sky.dpr,0,0,sky.dpr,0,0);ctx.drawImage(sky.img,sky.sx,sky.sy,sky.sw,sky.sh,0,0,sky.screenW,sky.screenH);}
            ctx.restore();
            const fr=images[child.id];
            if(rdy(fr))put(fr,child.visualBounds);
            else for(const s of child.shapes)rect(ctx,s.rect,s.color);
            continue;
          }
          const ci=images[child.id];
          if(rdy(ci))put(ci,child.visualBounds);
          else for(const s of child.shapes)rect(ctx,s.rect,s.color);
        }
        if(details)for(const p of o.parts)drawPart(ctx,p,time);
        ctx.restore();
      }
    }else drawPlayer(ctx,player,time,walking);
    if(footprints||groundOnly){
      for(const f of scene.floors){ctx.strokeStyle='#f4d59aaa';ctx.lineWidth=.1;ctx.setLineDash([.25,.15]);ctx.beginPath();f.polygon.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.stroke();ctx.setLineDash([]);}
      for(const o of scene.objects)if(o.collisionRect){const r=o.collisionRect;rect(ctx,r,groundOnly?'#753e59':'#b40d4233');ctx.strokeStyle='#faadc9';ctx.lineWidth=.07;ctx.strokeRect(...r);}
      ctx.fillStyle='#c8ffd0';ctx.beginPath();ctx.arc(player.x,player.y,scene.spawn.footRadius,0,Math.PI*2);ctx.fill();
    }
    if(selection){const o=scene.objects.find(o=>o.id===selection),s=scene.stairs.find(s=>s.id===selection),f=scene.floors.find(f=>f.id===selection);
      ctx.strokeStyle='#e7ffad';ctx.lineWidth=.13;ctx.setLineDash([.22,.16]);
      if(o)ctx.strokeRect(...renderBounds(o));else if(s)ctx.strokeRect(...s.bounds);else if(f){ctx.beginPath();f.polygon.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.stroke();}ctx.setLineDash([]);
      if(o?.collisionRect){ctx.strokeStyle='#fef1c2';ctx.lineWidth=.12;ctx.strokeRect(...o.collisionRect);const r=o.collisionRect;ctx.fillStyle='#fef1c2';ctx.beginPath();ctx.arc(r[0]+r[2]/2,r[1]+r[3],.15,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  const API={clamp,inRect,inPolygon,distanceRect,surfaceAt,blocked,standable,canMove,movePlayer,renderBounds,relocateObject,nearestInteraction,inspectAt,tracePath,drawScene};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.CabinEngine=API;
})(typeof window==='undefined'?globalThis:window);

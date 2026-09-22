const TAU=Math.PI*2;
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function poly(c,p,fill,stroke,width=1){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function line(c,p,color,width=1){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function metal(c,x1,y1,x2,y2,colors=['#253640','#758986','#34454d']){const g=c.createLinearGradient(x1,y1,x2,y2);colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));return g;}
function rune(c,x,y,size,color,kind=0){c.save();c.translate(x,y);c.scale(size,size);c.lineWidth=1.2;c.strokeStyle=color;c.beginPath();if(kind%4===0){c.moveTo(0,-5);c.lineTo(0,5);c.moveTo(-4,-2);c.lineTo(0,-5);c.lineTo(4,-2);c.moveTo(-4,2);c.lineTo(0,5);c.lineTo(4,2);}else if(kind%4===1){c.moveTo(-3,5);c.lineTo(-3,-5);c.lineTo(3,-1);c.lineTo(-3,1);c.moveTo(-3,0);c.lineTo(4,5);}else if(kind%4===2){c.moveTo(-4,3);c.lineTo(0,-5);c.lineTo(4,3);c.lineTo(-4,3);c.moveTo(0,3);c.lineTo(0,6);}else{c.moveTo(-3,-4);c.lineTo(3,-4);c.lineTo(-3,4);c.lineTo(3,4);c.moveTo(0,-6);c.lineTo(0,6);}c.stroke();c.restore();}

export class WorldArt {
  constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.width=440;this.height=820;this.offset=0;this.cache=null;this.motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.width=r.width;this.height=r.height;this.dpr=dpr;this.scale=r.width/440;this.logicalH=r.height/this.scale;this.offset=(this.logicalH-820)*.45;this.cache=document.createElement('canvas');this.cache.width=880;this.cache.height=Math.ceil(this.logicalH*2);const c=this.cache.getContext('2d');c.scale(2,2);this.background(c);}
  background(c){
    const o=this.offset,H=this.logicalH,random=rng(47291);
    const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#101c26');sky.addColorStop(.35,'#233940');sky.addColorStop(.64,'#18252a');sky.addColorStop(1,'#080f15');c.fillStyle=sky;c.fillRect(0,0,440,H);
    glow(c,322,140+o*.3,160,'#69868733');oval(c,322,138+o*.3,38,38,'#98aaa451');oval(c,309,128+o*.3,37,37,'#17262e');
    for(let i=0;i<75;i++){c.globalAlpha=.12+random()*.2;c.fillStyle='#a2c3c3';c.fillRect(random()*440,70+random()*210,1,1);}c.globalAlpha=1;
    // Distant broken towers and the mountain skyline.
    poly(c,[[0,190],[33,158],[49,171],[78,128],[102,176],[139,157],[174,218],[245,171],[276,155],[329,182],[368,153],[397,192],[440,169],[440,400],[0,400]],'#111e28');
    for(const [x,y,w] of [[5,174,37],[71,121,23],[350,160,36],[414,136,30]]){c.fillStyle='#0c1822';c.fillRect(x,y+o*.2,w,210);poly(c,[[x-3,y+o*.2],[x+w/2,y-30+o*.2],[x+w+3,y+o*.2]],'#111c25');for(let j=0;j<3;j++){c.fillStyle='#28413e';c.fillRect(x+w*.4,y+32+j*36+o*.2,4,12);}}
    const floor=c.createLinearGradient(0,300+o,0,H);floor.addColorStop(0,'#1b292e');floor.addColorStop(.5,'#233037');floor.addColorStop(1,'#101b21');poly(c,[[0,365+o],[135,278+o],[303,278+o],[440,365+o],[440,H],[0,H]],floor);
    // Individual stone slabs, rather than a flat grid.
    for(let row=0;row<17;row++){const yy=327+o+row*32;for(let col=-7;col<8;col++){const xx=220+col*57+(row%2)*28;const p=[[xx,yy-15],[xx+27,yy],[xx,yy+15],[xx-27,yy]];const k=Math.floor(random()*13);poly(c,p,`rgb(${28+k},${41+k},${46+k})`,'#0e1b2299',1.3);if(random()>.4)line(c,[[xx-23,yy],[xx,yy-12],[xx+23,yy]],'#8aada51a',.8);if(random()>.6)line(c,[[xx+5,yy-6],[xx-4,yy],[xx+2,yy+6]],'#0a141977',.9);}}
    // Fortress walls, layered stone blocks and a recessed arched doorway.
    const archY=185+o*.6;
    for(const [x,w] of [[-5,140],[306,150]]){poly(c,[[x,archY-20],[x+w,archY+4],[x+w,archY+200],[x,archY+245]],'#18262e','#31454a');for(let row=0;row<7;row++)for(let col=0;col<4;col++){const xx=x+col*38-(row%2)*19,yy=archY+row*29;poly(c,[[xx,yy],[xx+36,yy+2],[xx+36,yy+27],[xx,yy+25]],metal(c,xx,yy,xx,yy+26,['#304249','#1c2b33']),'#101d25',1.2);}}
    c.beginPath();c.moveTo(134,385+o*.6);c.lineTo(134,archY+66);c.quadraticCurveTo(134,archY-18,220,archY-64);c.quadraticCurveTo(306,archY-18,306,archY+66);c.lineTo(306,385+o*.6);c.closePath();c.fillStyle='#0a141d';c.fill();c.strokeStyle='#3a4c50';c.lineWidth=21;c.stroke();c.strokeStyle='#7e928355';c.lineWidth=2;c.stroke();
    for(let i=0;i<13;i++){const a=Math.PI+i/12*Math.PI,xx=220+87*Math.cos(a),yy=archY+52+114*Math.sin(a);line(c,[[xx,yy],[xx+10*Math.cos(a),yy+13*Math.sin(a)]],'#08151f',3);}
    const gateGlow=c.createRadialGradient(220,archY+100,0,220,archY+100,118);gateGlow.addColorStop(0,'#60948935');gateGlow.addColorStop(1,'transparent');c.fillStyle=gateGlow;c.fillRect(138,archY-25,165,223);
    for(let x=154;x<300;x+=15)line(c,[[x,archY+15+Math.abs(x-220)*.7],[x,archY+195]],'#455b5740',2);
    rune(c,220,archY+58,5,'#a7cfb27a');glow(c,220,archY+58,34,'#a7ceb127');
    for(let s=0;s<4;s++){const y=379+o*.6+s*10;poly(c,[[135-s*10,y],[304+s*10,y],[315+s*10,y+9],[125-s*10,y+9]],'#304047','#5b71683a');}
    // Rune circle engraved into the courtyard.
    c.save();c.translate(220,495+o);c.scale(1,.53);for(const [r,col] of [[153,'#678b6a39'],[147,'#78977732'],[119,'#7d9f7a26'],[116,'#93b18d20']]){c.strokeStyle=col;c.lineWidth=1.3;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();}for(let i=0;i<18;i++){const a=i/18*TAU;c.save();c.translate(Math.cos(a)*133,Math.sin(a)*133);c.rotate(a+Math.PI/2);rune(c,0,0,1.4,'#8aab852f',i);c.restore();}poly(c,[[0,-108],[94,54],[-94,54]],null,'#90ad8220',1.2);poly(c,[[0,108],[94,-54],[-94,-54]],null,'#90ad8220',1.2);c.restore();
    // Foreground pillars frame the battleground.
    for(const x of [28,410]){const y=371+o;oval(c,x,y+89,31,14,'#050d1455');poly(c,[[x-22,y-89],[x+12,y-94],[x+22,y+76],[x-25,y+84]],metal(c,x-25,y,x+22,y,['#15232a','#455953','#22343b']), '#0e1b24',2);poly(c,[[x+12,y-94],[x+25,y-78],[x+33,y+78],[x+22,y+76]],'#101d24');for(let z=0;z<5;z++)line(c,[[x-22,y-66+z*30],[x+19,y-72+z*30]],'#0b1720',2);poly(c,[[x-30,y-101],[x+17,y-107],[x+29,y-91],[x-25,y-85]],'#465b58','#60796a44');poly(c,[[x-32,y+76],[x+28,y+69],[x+36,y+87],[x-36,y+94]],'#33473f','#71837133');}
    for(let i=0;i<70;i++){const x=random()*440,y=360+o+random()*(H-360-o),r=1+random()*4;poly(c,[[x-r,y],[x,y-r*.6],[x+r*1.4,y-1],[x+r,y+r*.4]],'#52625755');}
    for(let i=0;i<52;i++){const side=i%2,x=side?420+random()*30:random()*22,y=480+random()*(H-480);line(c,[[x,y],[x+(random()-.5)*18,y-12-random()*23]],'#334538',1);}
    const fade=c.createLinearGradient(0,H-170,0,H);fade.addColorStop(0,'transparent');fade.addColorStop(1,'#050b11');c.fillStyle=fade;c.fillRect(0,H-170,440,170);
  }
  drawKnight(c,x,y,s,t,h={}){
    c.save();c.translate(x,y);c.scale(s,s);const bob=h.walk?Math.sin(t*12)*1.8:Math.sin(t*2)*.6;c.translate(0,bob);const attack=h.anim>0?Math.sin(h.anim/.4*Math.PI):0;
    oval(c,0,1,25,8,'#02090e99');
    // Long, torn cloak, with individually shaded folds.
    const wind=Math.sin(t*2.3)*3;
    poly(c,[[-15,-54],[13,-53],[26+wind,-5],[13,2],[7,-3],[0,6],[-8,1],[-21,5],[-31+wind,-5]],'#17333e','#41626a',.7);
    poly(c,[[-12,-51],[-5,-42],[-12,0],[-21,5],[-22,-5]],'#29505a');poly(c,[[5,-51],[11,-35],[18,-2],[8,-4],[1,2]],'#0c222d');line(c,[[-9,-49],[-14,-25],[-14,-4]],'#54767555',.8);
    const step=h.walk?Math.sin(t*12)*3:0;
    for(const [lx,st] of [[-9,step],[9,-step]]){poly(c,[[lx-5,-28],[lx+5,-29],[lx+5,-12+st],[lx+1,-3+st],[lx-7,-4+st]],metal(c,lx-5,0,lx+5,0), '#12262c',.8);poly(c,[[lx-6,-10+st],[lx+3,-10+st],[lx+7,-1+st],[lx+5,3+st],[lx-8,3+st]],'#23333b','#81908366',.7);line(c,[[lx,-23],[lx+1,-12+st]],'#b7c0a780',.8);}
    poly(c,[[-15,-54],[0,-59],[15,-54],[12,-33],[5,-25],[-9,-28],[-14,-36]],metal(c,-13,-55,14,-29,['#31464d','#afbaad','#3b5459','#19323c']),'#152831',1);
    poly(c,[[0,-56],[2,-36],[-8,-30],[-11,-42]],'#536e6b');line(c,[[-10,-48],[0,-43],[10,-48]],'#d4d6b677',1);line(c,[[1,-55],[3,-36],[10,-31]],'#bac7aa88',.8);
    poly(c,[[-14,-34],[13,-34],[14,-28],[-12,-28]],'#192b32','#a2a78977',.8);poly(c,[[-2,-34],[4,-34],[4,-27],[-2,-27]],'#bcab78');
    // Shoulder pauldrons.
    poly(c,[[-15,-57],[-25,-50],[-21,-39],[-10,-43],[-9,-52]],metal(c,-24,-52,-9,-40,['#3c5356','#a8b9ab','#345057']),'#112c35');
    poly(c,[[13,-57],[23,-50],[23,-40],[11,-43],[9,-52]],metal(c,10,-52,23,-41,['#506b68','#a6b7a5','#2a414a']),'#172c32');
    line(c,[[-24,-49],[-18,-44],[-11,-46]],'#d0ceaa77',.7);line(c,[[13,-51],[21,-47],[22,-42]],'#d0ceaa77',.7);
    // Helmet and visor.
    poly(c,[[-10,-71],[0,-77],[10,-71],[12,-59],[5,-52],[-6,-52],[-12,-59]],metal(c,-12,-72,10,-54,['#2b4049','#bcc4b0','#536e70','#233d46']),'#0b202c',1);
    poly(c,[[-9,-65],[0,-63],[9,-65],[8,-60],[0,-58],[-8,-60]],'#07131e');line(c,[[-7,-62],[-2,-61]],'#b8f9ed',1.4);line(c,[[2,-61],[7,-62]],'#b8f9ed',1.4);line(c,[[0,-75],[0,-64],[2,-56]],'#ccd4bdaa',1);poly(c,[[-3,-78],[0,-87],[3,-78],[2,-70],[-1,-71]],'#9ca58b');
    // Shield on the left arm.
    c.save();c.translate(-23,-34);c.rotate(-.15);poly(c,[[-12,-13],[1,-19],[15,-13],[12,8],[1,20],[-10,9]],metal(c,-10,-12,15,13,['#293c45','#637e77','#253d44']),'#b8bda080',1.5);poly(c,[[-6,-10],[1,-13],[8,-10],[7,6],[1,12],[-5,5]],'#233b42','#9cae8b99',1);rune(c,1,0,1.05,'#bedac0');c.restore();
    // Sword arm with a bright fuller and etched runes.
    c.save();c.translate(20,-39);c.rotate(-.18-attack*1.5);poly(c,[[-4,0],[4,0],[6,15],[1,19],[-4,15]],'#425c60','#95a58c77');poly(c,[[0,14],[5,14],[5,22],[0,22]],'#192d34');c.translate(3,18);c.rotate(.16);poly(c,[[-3,6],[-3,-48],[0,-64],[4,-48],[3,6]],metal(c,-3,0,4,0,['#6b9093','#e4eacb','#75bbc0']),'#9ee7dc88',.7);line(c,[[0,-49],[0,3]],'#b7f5e5',1);poly(c,[[-12,4],[-8,0],[8,0],[13,4],[7,7],[-7,7]],'#a2a278','#dae0b477');poly(c,[[-2,6],[3,6],[3,18],[-2,18]],'#33434a','#a9ab8a');oval(c,.5,20,3,3,'#a5b18e');for(let j=0;j<3;j++)rune(c,0,-14-j*9,.35,'#28545c',j);c.restore();
    if(h.hurt>0){c.globalCompositeOperation='screen';glow(c,0,-40,43,'#d7815444');}
    if(h.shield>0){const alpha=.45+.15*Math.sin(t*6);c.globalAlpha=alpha;c.strokeStyle='#b5e2c1';c.lineWidth=1.4;c.beginPath();c.ellipse(0,-34,35,51,0,0,TAU);c.stroke();glow(c,0,-34,53,'#8acab927');for(let i=0;i<5;i++){const a=t*.4+i*TAU/5;rune(c,Math.cos(a)*33,-34+Math.sin(a)*49,.6,'#d2e8b3',i);}}
    c.restore();
  }
  drawEnemy(c,e,t){
    const boss=e.kind==='boss',brute=e.kind==='brute',caster=e.kind==='caster';const s=boss?1.9:brute?1.25:1;
    c.save();c.translate(e.x,e.y);c.scale(s,s);if(e.dying)c.globalAlpha=Math.min(1,e.dying/.6);const bob=e.walk?Math.sin(t*10+e.id)*1.8:Math.sin(t*2+e.id);c.translate(0,bob);
    oval(c,0,0,boss?29:23,8,'#03091099');const at=e.anim>0?Math.sin(e.anim/.4*Math.PI)*5:0;
    if(!brute&&!boss){
      const hue=caster?['#352b38','#71616a','#271f2d']:['#26383c','#4c6a66','#132a33'];
      poly(c,[[-12,-49],[10,-48],[22,-1],[11,2],[4,-3],[-3,5],[-9,0],[-23,2]],metal(c,-20,-40,20,0,hue),'#11212c',1);
      poly(c,[[-8,-44],[-2,-29],[-7,1],[-13,-1]],caster?'#5e4352':'#426058');line(c,[[4,-42],[8,-16],[12,-1]],'#8ca38b44',1);
      poly(c,[[-11,-52],[-6,-67],[3,-70],[13,-53],[9,-43],[-8,-44]],metal(c,-10,-60,10,-40,hue));poly(c,[[-7,-55],[0,-62],[7,-55],[5,-47],[-5,-48]],'#07151e');line(c,[[-5,-53],[-1,-52]],caster?'#efb58d':'#c1bd9b',1.4);line(c,[[2,-52],[6,-53]],caster?'#efb58d':'#c1bd9b',1.4);
      poly(c,[[-10,-47],[-22,-36],[-20,-22-at],[-15,-24-at],[-13,-35]],hue[1]);poly(c,[[10,-47],[20,-34],[21,-20-at],[15,-18-at],[13,-36]],hue[0]);
      if(caster){line(c,[[20,-7],[23,-65]],'#867963',3);poly(c,[[17,-63],[23,-74],[28,-62],[23,-56]],'#b88174','#dcc5a188',1);glow(c,23,-65,17,'#efac7555');rune(c,23,-64,.7,'#f5d9a3');}else{line(c,[[20,-17-at],[29,-45-at]],'#a1b1a3',3);poly(c,[[26,-42-at],[28,-54-at],[32,-43-at]],'#d0cbb1');}
    }else{
      const dark=boss?'#2e282b':'#344342',light=boss?'#8b7870':'#819486',mid=boss?'#584640':'#4d635d';
      poly(c,[[-17,-60],[16,-60],[33,0],[18,-4],[8,5],[-3,0],[-15,4],[-35,-1]],boss?'#3b262a':'#243630');
      for(const x of [-10,10]){poly(c,[[x-6,-27],[x+6,-28],[x+5,-7],[x+8,0],[x-7,1],[x-8,-5]],metal(c,x-7,0,x+6,0,[dark,light,mid]),'#111e24',1);line(c,[[x,-23],[x,-9]],'#b5af9677',1);}
      poly(c,[[-19,-61],[0,-69],[20,-60],[17,-35],[8,-25],[-11,-27],[-20,-39]],metal(c,-20,-60,17,-28,[dark,light,mid,dark]),'#111922',1.3);
      for(let i=0;i<3;i++)poly(c,[[-15,-45+i*7],[0,-40+i*7],[16,-45+i*7],[14,-39+i*7],[0,-35+i*7],[-14,-39+i*7]],null,'#b09c7977',.8);
      poly(c,[[-18,-65],[-31,-56],[-29,-41],[-15,-45],[-9,-55]],metal(c,-31,-59,-15,-40,[dark,light,mid]),'#15232a',1);poly(c,[[16,-65],[32,-56],[29,-40],[13,-44],[10,-55]],metal(c,11,-59,32,-43,[mid,light,dark]),'#15232a',1);
      if(boss){for(const x of [-24,23])poly(c,[[x-4,-60],[x-7,-75],[x+5,-65],[x+7,-53]],'#8b8270','#bdac8577');}
      poly(c,[[-12,-79],[0,-88],[13,-79],[13,-66],[5,-57],[-5,-58],[-13,-67]],metal(c,-12,-80,12,-60,[dark,light,mid]),'#11212a',1);poly(c,[[-9,-73],[0,-70],[9,-73],[8,-66],[0,-64],[-8,-67]],'#131317');line(c,[[-7,-70],[-2,-69]],'#f0a081',1.8);line(c,[[2,-69],[7,-70]],'#f0a081',1.8);line(c,[[0,-84],[0,-72],[0,-59]],'#d2af8277',1);
      if(boss){poly(c,[[-11,-82],[-22,-98],[-19,-74],[-11,-68]],'#665b52','#a1967a88');poly(c,[[11,-82],[22,-98],[19,-74],[11,-68]],'#665b52','#a1967a88');glow(c,0,-48,25,'#de734525');rune(c,0,-48,1.6,'#eea16d');}
      line(c,[[26,-43],[35+at,-12]],mid,9);line(c,[[35+at,-7],[34-at,-69]],'#6f7564',4);poly(c,[[33-at,-72],[49-at,-68],[53-at,-54],[36-at,-58],[22-at,-52],[19-at,-64]],metal(c,20,-69,49,-52,[dark,light,mid]),'#bba48277',1);
    }
    if(e.burn>0){glow(c,0,-25,37,'#da762733');for(let i=0;i<3;i++){const yy=-10-(t*35+i*13)%45,xx=Math.sin(t*5+i)*13;poly(c,[[xx-3,yy+5],[xx,yy-8],[xx+4,yy+3]],'#ebac6c77');}}
    if(e.hurt>0){c.globalCompositeOperation='screen';glow(c,0,-35,45,'#d3e9cf55');}
    c.restore();
    if(!boss&&!e.dying&&e.hp<e.maxHp){c.fillStyle='#08121adc';c.fillRect(e.x-18,e.y-(brute?103:78),36,3);c.fillStyle='#b78571';c.fillRect(e.x-18,e.y-(brute?103:78),36*e.hp/e.maxHp,3);}
  }
  drawEffect(c,f,t){const p=f.t/f.duration,a=1-p;c.save();c.globalAlpha=a;
    if(f.kind==='slash'){c.translate(f.x,f.y);c.scale(f.flip||1,.6);c.rotate(-.6+p*1.2);c.strokeStyle=f.color;c.lineWidth=4*(1-p)+.5;c.beginPath();c.arc(0,0,f.r*(.7+p*.3),-.6,1.9);c.stroke();c.lineWidth=1;c.beginPath();c.arc(0,0,f.r+5,-.8,1.3);c.stroke();}
    else if(f.kind==='nova'||f.kind==='slam'||f.kind==='shield'||f.kind==='spawn'){const r=f.r*(.15+p);glow(c,f.x,f.y-10,r,f.kind==='slam'?'#dc815545':'#9edacc30');c.strokeStyle=f.color;c.lineWidth=f.kind==='spawn'?1:3*(1-p);c.beginPath();c.ellipse(f.x,f.y,r,r*.55,0,0,TAU);c.stroke();if(f.kind!=='shield')for(let i=0;i<12;i++){const angle=i/12*TAU;rune(c,f.x+Math.cos(angle)*r,f.y+Math.sin(angle)*r*.55,(1-p)*1.7,f.color,i);}}
    else if(f.kind==='hit'){for(let i=0;i<5;i++){const angle=i/5*TAU;line(c,[[f.x+Math.cos(angle)*f.r*p,f.y+Math.sin(angle)*f.r*p],[f.x+Math.cos(angle)*(f.r*p+5),f.y+Math.sin(angle)*(f.r*p+5)]],f.color,1.5);}}
    else if(f.kind==='lightning'){const dx=f.toX-f.x,dy=f.toY-f.y,pts=[[f.x,f.y]];for(let i=1;i<6;i++)pts.push([f.x+dx*i/6+Math.sin(i*14)*13,f.y+dy*i/6+Math.cos(i*8)*10]);pts.push([f.toX,f.toY]);line(c,pts,f.color,2);glow(c,f.toX,f.toY,20,'#a0dce550');}
    else if(f.kind==='soul'){const x=f.x+(f.toX-f.x)*p,y=f.y+(f.toY-f.y)*p-Math.sin(p*Math.PI)*40;glow(c,x,y,12,'#b4e8c388');oval(c,x,y,2.5,2.5,'#d7f4d4');}
    c.restore();
  }
  render(g){
    const c=this.c,s=this.dpr*this.scale,t=g.visualTime;c.setTransform(1,0,0,1,0,0);c.fillStyle='#08121a';c.fillRect(0,0,this.canvas.width,this.canvas.height);c.setTransform(s,0,0,s,0,0);c.drawImage(this.cache,0,0,440,this.logicalH);
    const o=this.offset;const isHome=g.mode==='home';
    // Moving atmosphere and braziers.
    for(const x of [105,335]){const y=341+o*.65;glow(c,x,y,48,'#cf85441c');poly(c,[[x-5,y+8],[x+5,y+8],[x+3,y+26],[x-3,y+26]],'#38403a');poly(c,[[x-9,y+3],[x+9,y+3],[x+6,y+10],[x-6,y+10]],'#8a7854');for(let i=0;i<3;i++){const q=t*(this.motion?6:0)+i;poly(c,[[x-5+i*2,y+5],[x-3+Math.sin(q)*3,y-11-i*3],[x+5-i,y+4]],i===2?'#e8c28a99':'#c1834966');}}
    if(this.motion)for(let i=0;i<19;i++){const x=(i*173.7+Math.sin(t*.25+i)*40)%440,y=(i*67+t*(i%3+1)*2)%(this.logicalH-160)+120;c.globalAlpha=.07+Math.sin(t+i)*.04;oval(c,x,y,90+i%4*15,13+i%4*4,'#bad5c9');}c.globalAlpha=1;
    for(let i=0;i<24;i++){const x=(i*133.41+Math.sin(t*.3+i)*18)%440,y=(i*43.13-t*(2+i%3)+this.logicalH*20)%this.logicalH;c.globalAlpha=.16+.2*Math.max(0,Math.sin(t*.6+i));oval(c,x,y,.6+(i%3)*.3,.6+(i%3)*.3,'#c8d2a9');}c.globalAlpha=1;
    c.save();c.translate(0,o+(isHome?0:160));if(g.shake>0&&this.motion)c.translate(Math.sin(t*67)*g.shake*.35,Math.cos(t*71)*g.shake*.2);
    if(isHome){
      // The hero is large enough to read as a character, not an icon.
      glow(c,220,514,128,'#80b6b42d');oval(c,221,635,95,22,'#02091277');this.drawKnight(c,222,626,2.55,t,{});c.save();c.globalAlpha=.23;rune(c,220,681,3.1,'#c2d8ab');c.restore();
    }else{
      const boss=g.enemies.find(e=>e.kind==='boss'&&!e.dying);
      if(boss?.telegraph>0){const k=1-boss.telegraph/2.1;oval(c,g.hero.x,g.hero.y,75+12*k,40+8*k,`rgba(181,77,52,${.1+.12*k})`);c.strokeStyle=`rgba(239,152,112,${.5+k*.5})`;c.lineWidth=2;c.beginPath();c.ellipse(g.hero.x,g.hero.y,78,43,0,0,TAU);c.stroke();c.beginPath();c.ellipse(g.hero.x,g.hero.y,78*k,43*k,0,0,TAU);c.stroke();for(let i=0;i<5;i++)rune(c,g.hero.x+Math.cos(i*TAU/5)*65,g.hero.y+Math.sin(i*TAU/5)*36,1,'#eaa87d',i);}
      const actors=[...g.enemies,{...g.hero,isHero:true}].sort((a,b)=>a.y-b.y);
      for(const actor of actors){if(actor.isHero)this.drawKnight(c,actor.x,actor.y,1.05,t,actor);else this.drawEnemy(c,actor,t);}
      for(const p of g.projectiles){glow(c,p.x,p.y,15,'#de956b66');oval(c,p.x,p.y,4,4,p.color);}
      for(const f of g.effects)this.drawEffect(c,f,t);
      for(const n of g.texts){c.save();c.globalAlpha=Math.min(1,(1-n.t/n.duration)*2);c.font=`${n.big?'bold ':''}${n.big?21:14}px Georgia`;c.textAlign='center';c.shadowColor='#000';c.shadowBlur=5;c.fillStyle=n.color;c.fillText(n.text,n.x,n.y-n.t*27);c.restore();}
    }
    c.restore();if(g.flash>0){c.fillStyle=`rgba(193,229,214,${g.flash*.3})`;c.fillRect(0,0,440,this.logicalH);}
  }
}

export const ICONS={
  sword:'<path d="m6 22 5-5m-4-4 8 8m-4-5 10-13 4-1-1 4-12 12M5 23l-2 2"/>',
  bolt:'<path d="m16 2-11 15h8l-2 12 13-17h-9z"/>',
  shield:'<path d="m15 3 10 4-1 12-9 8-9-8L5 7zM15 8v13m-5-9 5-4 5 4"/>',
  flame:'<path d="M16 2c3 8-5 9-2 14 2-1 4-4 4-7 10 9 7 18-3 18C4 27 1 19 10 10c-1 5 0 7 2 8-3-7 3-9 4-16Z"/>',
  burst:'<path d="m15 2 3 9 10 4-10 3-3 10-3-10-10-3 10-4zM5 5l3 3m14 14 3 3M5 25l3-3M22 8l3-3"/>',
  sound:'<path d="M4 11h5l6-5v18l-6-5H4zM20 10c3 3 3 7 0 10m4-15c6 6 6 14 0 20"/>',
  mute:'<path d="M4 11h5l6-5v18l-6-5H4zM21 11l7 8m0-8-7 8"/>',
  pause:'<path d="M10 6v18M20 6v18" stroke-width="3"/>',
};
export function icon(name){return `<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.burst}</svg>`;}

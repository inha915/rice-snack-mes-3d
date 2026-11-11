import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {equipmentMetrics} from './metrics.js';
import {LINES as LINE_DATA} from './data.js';
import {plantLayout,ZONES,PACK_LINES} from './process.js';

/* =====================================================================
   베트남 쌀과자 공장 3D — 2026-11-09 현장 사진 60장 기준 재구성
   설비 형상은 사진을 바탕으로 한 개략 모델(실측 CAD 아님)입니다.
   공정 순서·배치는 src/process.js 의 plantLayout() 하나를 기준으로 합니다.
   ===================================================================== */
export function createFactory(host, bridge){
const LAYOUT=plantLayout();
const SB=Object.fromEntries(LAYOUT.stations.filter(s=>s.line==='BASE').map(s=>[s.k,s]));
function partsOf(st){let x=st.x0;return (st.parts||[[st.type,st.w]]).map(([t,w])=>{const r={t,x0:x,x1:x+w,x:x+w/2,w};x+=w+.4;return r;});}
const pp=k=>partsOf(SB[k]);
// 복합 공정(10공정 묶음) 안의 하위 설비 좌표 별칭
const S={RI:pp('RW')[0],WS:pp('RW')[1],SK:SB.SK,ST:SB.ST,EX:pp('EX')[0],WC:pp('EX')[1],RL:pp('CT')[0],CT:pp('CT')[1],D1:SB.D1,M1:pp('SP')[0],SP:pp('SP')[1],AG:pp('SP')[2],D2:SB.D2,PH:pp('OV')[0],OV:pp('OV')[1],SN:pp('SN')[0],CL:pp('SN')[1]};
const PK=Object.fromEntries(PACK_LINES.map(L=>[L.id,Object.fromEntries(LAYOUT.stations.filter(s=>s.line===L.id).map(s=>[s.k,s]))]));
const FN=Object.fromEntries(LAYOUT.stations.filter(s=>s.line==='FIN').map(s=>[s.k,s]));const MX=LAYOUT.mergeX;
const LINES=LINE_DATA.map(l=>({...l,z:l.id==='BASE'||l.id==='FIN'?LAYOUT.mainZ:LAYOUT.packZ[PACK_LINES.findIndex(p=>p.id===l.id)],flow:Math.random()*10,f:1,machines:[]}));
const lineById=Object.fromEntries(LINES.map(l=>[l.id,l]));
const BX=LAYOUT.branchX;
const BH=1.0;                       // 공통 컨베이어 높이
const HALF_D=LAYOUT.halfD, XMIN=LAYOUT.xmin, XMAX=LAYOUT.xmax;

/* ---------- 렌더러 · 씬 ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.LinearToneMapping; renderer.toneMappingExposure=.9;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0b1118);
scene.fog=new THREE.Fog(0x0b1118,300,700);
const pmrem=new THREE.PMREMGenerator(renderer);
const envTex=pmrem.fromScene(new RoomEnvironment(),.04).texture;
scene.environment=envTex;

const camera=new THREE.PerspectiveCamera(40,1,.3,1200);
camera.position.set(-20,120,150);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.08;
controls.maxPolarAngle=Math.PI/2.1; controls.minDistance=4; controls.maxDistance=420;
controls.autoRotateSpeed=.3;

scene.add(new THREE.HemisphereLight(0xe8f2ff,0x1a2028,.42));
const sun=new THREE.DirectionalLight(0xfff6ea,1.0);
sun.position.set(40,120,60); sun.castShadow=true;
const smap=Math.min(4096,renderer.capabilities.maxTextureSize||2048);
sun.shadow.mapSize.set(smap,smap);
Object.assign(sun.shadow.camera,{left:-LAYOUT.total/2-6,right:LAYOUT.total/2+6,top:HALF_D+6,bottom:-HALF_D-6,near:10,far:320});
sun.shadow.bias=-.0005; sun.shadow.normalBias=.02; scene.add(sun);

/* ---------- 재질 ---------- */
const std=(color,metalness=.1,roughness=.7,extra={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:metalness>.5?.6:.22,...extra});
const MAT={
  ss:std(0xd3dae1,.85,.3), ssDark:std(0x8b96a1,.75,.42), frame:std(0xa7b1bb,.8,.38),
  belt:std(0xe9e4d6,0,.85), mesh:std(0x5f7d96,.6,.45), modular:std(0xf4f6f8,0,.6),
  blue:std(0x2849a6,.3,.45), motor:std(0xb9c1c9,.6,.4), white:std(0xf1f3f5,.05,.55),
  beige:std(0xd9d4c2,.1,.75), green:std(0x16c24a,0,.5), greenFrame:std(0x2f6b3a,.3,.55),
  pallet:std(0x1d5fe0,0,.55), blackPallet:std(0x1c2126,.1,.6), wood:std(0x9a7048,0,.85), greenBelt:std(0x1f6b4f,0,.6), brandBox:std(0xffffff,0,.8), bag:std(0x1fc8dc,.05,.45),
  carton:std(0xd09a52,0,.8), red:std(0xe5262e,.05,.45), dark:std(0x2b333c,.4,.6),
  yellow:std(0xf2c200,.1,.5), riceHeap:std(0xffffff,0,.88),
  film:std(0xd9e6f0,.3,.25,{transparent:true,opacity:.55}),
  water:std(0x4fa7d8,.1,.08,{transparent:true,opacity:.5,depthWrite:false}),
  glass:std(0xcfe6ff,.1,.05,{transparent:true,opacity:.2,depthWrite:false}),
  curtain:std(0xf2c500,0,.4,{transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide}),
  redLamp:std(0x7a1010,0,.3,{emissive:0xff2a2a,emissiveIntensity:.9}),
  greenLamp:std(0x0b3a1a,0,.3,{emissive:0x22e06a,emissiveIntensity:1.1}),
  screen:std(0x08131f,0,.3,{emissive:0x1d7fd6,emissiveIntensity:.8}),
  digits:std(0x220606,0,.4,{emissive:0xff3030,emissiveIntensity:1.4}),
  skin:std(0xd9b08c,0,.7), glove:std(0x4a8be0,0,.5), fireRed:std(0xc81e1e,.2,.4),
};

/* ---------- 캔버스 텍스처 ---------- */
const textures=[];
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);}textures.push(t);return t;}
const F='"Noto Sans KR","Malgun Gothic",sans-serif';
function discPattern(bg,disc,repeat,grid=false){return canvasTex(256,128,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle='rgba(255,255,255,.06)';for(let x=0;x<w;x+=6){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
  if(grid){for(let y=12;y<h;y+=26)for(let x=12+(y/26%2)*13;x<w;x+=26){g.beginPath();g.arc(x,y,11,0,7);g.fillStyle=disc;g.fill();g.strokeStyle='rgba(120,100,60,.3)';g.stroke();}return;}
  for(let i=0;i<70;i++){const x=Math.random()*w,y=Math.random()*h,r=7+Math.random()*2;g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=disc;g.fill();g.strokeStyle='rgba(120,90,40,.25)';g.stroke();}},repeat);}
const dryerTierTex=discPattern('#3b434c','#efe3c2',[3,1]);
const tableTex=discPattern('#c9d0d6','#efe6cc',[2,1]);
const cutterBeltTex=discPattern('#dcd8cc','#fbf8f0',[2,1],true);   // 타발 직후: 정렬된 원형 생지
const crateFillTex=discPattern('#e8dcbc','#f3ead2',[1,1]);
const diamondTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#8f989f';g.fillRect(0,0,w,h);g.strokeStyle='#b8c0c6';g.lineWidth=5;g.lineCap='round';for(let y=8;y<h;y+=32)for(let x=8;x<w;x+=32){const o=(y/32|0)%2?16:0;g.beginPath();g.moveTo(x+o-5,y-5);g.lineTo(x+o+5,y+5);g.stroke();g.beginPath();g.moveTo(x+o+11,y+11);g.lineTo(x+o+21,y+1);g.stroke();}},[60,30]);
const riceTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#ece6d6';g.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const x=Math.random()*w,y=Math.random()*h;g.save();g.translate(x,y);g.rotate(Math.random()*Math.PI);g.fillStyle=Math.random()<.5?'#fbf8f0':'#d6ceb9';g.beginPath();g.ellipse(0,0,3.2,1.4,0,0,7);g.fill();g.restore();}},[3,3]);
MAT.riceHeap.map=riceTex;
// PP 직조 포대 무늬 (#1~#4 청록 쌀 가마니)
const wovenTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#24c3d6';g.fillRect(0,0,w,h);for(let i=0;i<w;i+=4){g.fillStyle=(i/4)%2?'rgba(255,255,255,.13)':'rgba(0,70,90,.14)';g.fillRect(i,0,2,h);g.fillRect(0,i,w,2);}},[3,2]);
MAT.bag.map=wovenTex;MAT.bag.color.set(0xffffff);MAT.bag.roughness=.42;
// 녹색 플라스틱 크레이트: 세로 리브 + 손잡이 구멍 (#44, #45)
const crateTex=canvasTex(128,96,(g,w,h)=>{g.fillStyle='#14c24a';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,80,25,.38)';for(let x=5;x<w;x+=11)g.fillRect(x,14,4,h-20);g.fillRect(0,0,w,7);g.fillRect(0,h-6,w,6);g.fillStyle='#06461a';rr(g,w/2-20,16,40,11,5);g.fill();});
MAT.green.map=crateTex;MAT.green.color.set(0xffffff);
// 크라프트 카톤: 골판지 결 + 테이프 띠 + 라벨
const cartonTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#c9955a';g.fillRect(0,0,w,h);g.fillStyle='rgba(90,60,20,.13)';for(let y=0;y<h;y+=3)g.fillRect(0,y,w,1);g.fillStyle='#ddc093';g.fillRect(w/2-11,0,22,h);g.fillStyle='#f4f1ea';g.fillRect(12,74,40,28);g.fillStyle='#c0392b';g.fillRect(16,78,32,7);g.fillStyle='#555';g.fillRect(16,90,26,3);});
MAT.carton.map=cartonTex;MAT.carton.color.set(0xffffff);
// 제품 카톤 (일반 디자인): 크라프트 + 빨강 띠 + 노랑 블록
const brandBoxTex=canvasTex(256,192,(g,w,h)=>{g.fillStyle='#c99a5e';g.fillRect(0,0,w,h);g.fillStyle='rgba(90,60,20,.12)';for(let y=0;y<h;y+=3)g.fillRect(0,y,w,1);
  g.fillStyle='#d4232a';g.fillRect(0,0,w,34);g.fillRect(14,58,118,62);g.fillStyle='#f6c400';g.fillRect(14,120,118,22);g.fillStyle='#fff';g.font='900 50px Arial Black,Arial';g.textAlign='center';g.textBaseline='middle';g.font='900 30px Arial Black,Arial';g.fillText('RICE',73,78);g.fillText('SNACK',73,106);
  g.fillStyle='#f4f1ea';g.fillRect(156,70,70,56);g.fillStyle='#666';for(let i=0;i<4;i++)g.fillRect(164,80+i*11,54,4);g.fillStyle='#fff';g.font='700 16px Arial';g.fillText('FAMILY PACK',w/2,17);});
MAT.brandBox.map=brandBoxTex;
const outerBagTex=canvasTex(256,160,(g,w,h)=>{g.fillStyle='#e5262e';g.fillRect(0,0,w*.48,h);g.fillStyle='#f7c51e';g.fillRect(w*.48,0,w*.52,h);g.fillStyle='#fff';g.font='900 46px Arial Black,Arial';g.textAlign='center';g.textBaseline='middle';g.font='900 32px Arial Black,Arial';g.fillText('RICE SNACK',w*.5,h*.48);g.fillStyle='#d97706';g.beginPath();g.arc(w*.8,h*.72,20,0,7);g.fill();});
const innerBagTex=canvasTex(128,96,(g,w,h)=>{g.fillStyle='#e0262e';g.fillRect(0,0,w,h);g.fillStyle='#f7c51e';g.fillRect(0,h*.62,w,h*.2);g.fillStyle='#fff';g.font='900 26px Arial';g.textAlign='center';g.font='900 18px Arial';g.fillText('SNACK',w/2,h*.48);});
const stripeTex=canvasTex(128,256,(g,w,h)=>{const c=['#c8414b','#f1f1ee','#3d63a8','#f1f1ee'];for(let y=0,i=0;y<h;y+=16,i++){g.fillStyle=c[i%4];g.fillRect(0,y,w,16);}g.fillStyle='rgba(0,0,0,.08)';for(let x=0;x<w;x+=11)g.fillRect(x,0,3,h);});
const cwScreenTex=canvasTex(256,160,(g,w,h)=>{g.fillStyle='#0a0d10';g.fillRect(0,0,w,h);g.fillStyle='#1d8f3e';g.fillRect(10,10,w-20,16);g.fillStyle='#ffd21f';g.font='700 62px monospace';g.textAlign='center';g.fillText('216.15',w*.46,96);g.font='700 26px monospace';g.fillText('g',w*.88,96);g.fillStyle='#e23b3b';g.fillRect(10,122,w*.25,10);g.fillStyle='#2bd36a';g.fillRect(10+w*.25,122,w*.45,10);g.fillStyle='#e8a33b';g.fillRect(10+w*.7,122,w*.22,10);g.fillStyle='#9fb3c8';g.font='16px monospace';g.fillText('180g · 211–223g',w/2,152);});
const shutterTex=canvasTex(64,128,(g,w,h)=>{g.fillStyle='#8f9aa5';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=8){g.fillStyle='#6f7a85';g.fillRect(0,y,w,2);g.fillStyle='#b4bec8';g.fillRect(0,y+3,w,1);}},[3,1]);
const jaepackTex=textTex(['jaepack'],{w:256,h:96,bg:'#d7dce0',fg:'#4a5560',size:52});
// 타발 스크랩: 원형 구멍이 뚫린 망상 시트 (#29, #30)
const netTex=canvasTex(128,160,(g,w,h)=>{g.fillStyle='#f4efe3';g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-out';for(let y=16;y<h;y+=30)for(let x=16+(y/30%2)*15;x<w;x+=30){g.beginPath();g.arc(x,y,12,0,7);g.fill();}});
function textTex(lines,{w=256,h=128,bg='#f4f4f4',fg='#1d2a36',size=48}={}){return canvasTex(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';lines.forEach((t,i)=>{g.font=`700 ${i?size*.55:size}px ${F}`;g.fillText(t,w/2,h/2+(i-(lines.length-1)/2)*size*.95);});});}
const panelFaces={};
function panelFace(kind){
  if(panelFaces[kind]) return panelFaces[kind];
  const cfg={temp:{disp:18,cols:6,inv:0},dryer:{disp:9,cols:5,inv:14},hmi:{disp:0,cols:4,inv:0,hmi:true},small:{disp:2,cols:2,inv:0}}[kind];
  return panelFaces[kind]=canvasTex(512,640,(g,w,h)=>{
    g.fillStyle='#d6d1bd';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(w/2-2,0,4,h);
    const half=cfg.inv?w/2:w;let col=0,row=0;
    for(let i=0;i<cfg.disp;i++){const cw=(half-40)/cfg.cols,x=20+col*cw,y=40+row*120;g.fillStyle='#14181c';g.fillRect(x+6,y,cw-12,62);g.fillStyle=i%3?'#ff8a2a':'#56e39a';g.font='700 30px monospace';g.textAlign='center';g.fillText(String(88+(i*7)%6),x+cw/2,y+42);
      g.beginPath();g.arc(x+cw/2,y+88,10,0,7);g.fillStyle='#38e070';g.fill();if(++col>=cfg.cols){col=0;row++;}}
    for(let i=0;i<cfg.inv;i++){const cw=(w/2-40)/5,x=w/2+20+(i%5)*cw,y=40+Math.floor(i/5)*130;g.fillStyle='#2a3036';g.fillRect(x+6,y,cw-12,70);g.fillStyle='#a8c6a0';g.fillRect(x+12,y+8,cw-24,24);g.fillStyle='#38e070';g.beginPath();g.arc(x+cw/2,y+96,10,0,7);g.fill();}
    if(cfg.hmi){g.fillStyle='#1b2a52';g.fillRect(w*.56,90,w*.36,150);g.fillStyle='#4fa0ff';for(let i=0;i<6;i++)g.fillRect(w*.58+(i%3)*58,110+Math.floor(i/3)*60,46,40);
      g.fillStyle='#ffffff';g.fillRect(40,60,w*.4,140);g.fillStyle='#2e9e4a';g.font=`700 52px ${F}`;g.textAlign='center';g.fillText('5S',40+w*.2,130);
      for(let i=0;i<4;i++){g.beginPath();g.arc(70+i*45,240,14,0,7);g.fillStyle='#ff3b3b';g.fill();}}
    const wx=w*(cfg.inv?.72:.6);g.fillStyle='#f2c200';g.fillRect(wx,h-220,110,90);g.fillStyle='#c81e1e';g.font=`700 22px ${F}`;g.textAlign='center';g.fillText('CHÚ Ý',wx+55,h-180);
    for(let i=0;i<10;i++){g.beginPath();g.arc(40+(i%5)*44,h-150+Math.floor(i/5)*48,12,0,7);g.fillStyle='#22262a';g.fill();}
  });
}

/* ---------- 지오메트리 헬퍼 ---------- */
const GC=new Map();const k3=v=>(+v).toFixed(3);
const memo=(key,f)=>{let g=GC.get(key);if(!g){g=f();GC.set(key,g);}return g;};
const gBox=(w,h,d)=>memo(`b${k3(w)}|${k3(h)}|${k3(d)}`,()=>new THREE.BoxGeometry(w,h,d));
const gCyl=(rt,rb,h,seg=20)=>memo(`c${k3(rt)}|${k3(rb)}|${k3(h)}|${seg}`,()=>new THREE.CylinderGeometry(rt,rb,h,seg));
const gSph=(r,seg=12)=>memo(`s${k3(r)}|${seg}`,()=>new THREE.SphereGeometry(r,seg,Math.max(6,seg*.66|0)));
const gPlane=(w,h)=>memo(`p${k3(w)}|${k3(h)}`,()=>new THREE.PlaneGeometry(w,h));
// 불린 쌀 더미: 표면이 울퉁불퉁한 산 모양 (반죽 압출 전 단계)
function heapGeometry(seed){const g=new THREE.SphereGeometry(1,30,14,0,Math.PI*2,0,Math.PI/2),pos=g.attributes.position;let r=Math.floor(Math.abs(seed)*1000)+7;const rnd=()=>((r=(r*9301+49297)%233280)/233280);
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i),rad=Math.min(1,Math.hypot(x,z));const top=Math.pow(1-rad,1.25);const n=y>.03?1+(rnd()-.5)*.16:1;pos.setXYZ(i,x*n,top*n,z*n);}
  g.computeVertexNormals();return g;}
// 쌀 가마니(50kg PP 포대): 불룩한 몸통 + 납작한 봉제 끝단, 바닥은 평평
function sackGeometry(){const w=1,h=.34,d=.6,g=new THREE.BoxGeometry(w,h,d,18,6,12),pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),u=Math.abs(2*x/w),v=Math.abs(2*z/d);
    const puff=Math.max(.18,(1-Math.pow(u,5)*.8)*(1-Math.pow(v,5)*.55));
    pos.setXYZ(i,x*(1-Math.pow(v,6)*.06),y<0?y*Math.max(.55,puff):y*puff,z*(1-Math.pow(u,6)*.14));}
  g.computeVertexNormals();return g;}
function add(p,geo,mat,x=0,y=0,z=0,shadow=true){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m;}
const B=(p,w,h,d,mat,x,y,z,sh)=>add(p,gBox(w,h,d),mat,x,y,z,sh);
const C=(p,rt,rb,h,mat,x,y,z,seg,sh)=>add(p,gCyl(rt,rb,h,seg),mat,x,y,z,sh);
const CX=(p,r,len,mat,x,y,z,seg=18)=>{const m=C(p,r,r,len,mat,x,y,z,seg);m.rotation.z=Math.PI/2;return m;};
const CZ=(p,r,len,mat,x,y,z,seg=18)=>{const m=C(p,r,r,len,mat,x,y,z,seg);m.rotation.x=Math.PI/2;return m;};
function sack(p,x,y,z,ry=0,rz=0,rx=0){const m=add(p,memo('sack',sackGeometry),MAT.bag,x,y,z);m.rotation.set(rx,ry,rz);return m;}
// 청색 플라스틱 팔레트: 상판 + 하부 런너 3줄 + 블록 9개
function pallet(p,x,y,z,w=1.25,d=1.05,mat=MAT.pallet){B(p,w,.04,d,mat,x,y+.13,z);for(const dz of [-d/2+.08,0,d/2-.08]){B(p,w,.03,.12,mat,x,y+.015,z+dz);for(const dx of [-w/2+.08,0,w/2-.08])B(p,.14,.08,.14,mat,x+dx,y+.07,z+dz);}}
function heap(p,x,y,z,r,h,sx=1,seed=1){const m=add(p,memo('heap'+seed,()=>heapGeometry(seed)),MAT.riceHeap,x,y,z);m.scale.set(r*sx,h,r);m.rotation.y=seed;return m;}
const UP=new THREE.Vector3(0,1,0);
function pipe(p,a,b,r,mat=MAT.ss,seg=12){const A=new THREE.Vector3(...a),E=new THREE.Vector3(...b),d=E.clone().sub(A);const m=add(p,gCyl(r,r,d.length(),seg),mat);m.position.copy(A).add(E).multiplyScalar(.5);m.quaternion.setFromUnitVectors(UP,d.normalize());return m;}
function pipeRun(p,pts,r,mat=MAT.ss){for(let i=0;i<pts.length-1;i++)pipe(p,pts[i],pts[i+1],r,mat);for(let i=1;i<pts.length-1;i++)add(p,gSph(r*1.08,10),mat,...pts[i]);}
function hose(p,pts,r=.09,mat=MAT.white){const curve=new THREE.CatmullRomCurve3(pts.map(a=>new THREE.Vector3(...a)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,40,r,8,false),mat);m.castShadow=true;p.add(m);return m;}
function legs(p,x1,x2,z1,z2,h,mat=MAT.frame,s=.09){for(const x of [x1,x2])for(const z of [z1,z2])B(p,s,h,s,mat,x,h/2,z);}
function slab(p,x1,y1,x2,y2,width,thick,mat,z=0){const dx=x2-x1,dy=y2-y1,m=B(p,Math.hypot(dx,dy),thick,width,mat,(x1+x2)/2,(y1+y2)/2,z);m.rotation.z=Math.atan2(dy,dx);return m;}
function belt(p,x1,y1,x2,y2,width=1,{mat=MAT.belt,z=0,legsOn=true,rail=MAT.ss}={}){
  slab(p,x1,y1,x2,y2,width,.08,mat,z);
  for(const s of [-1,1])slab(p,x1,y1+.05,x2,y2+.05,.05,.18,rail,z+s*(width/2+.03));
  for(const [x,y] of [[x1,y1],[x2,y2]])CZ(p,.075,width+.04,MAT.ssDark,x,y-.02,z,10);
  if(legsOn){const n=Math.max(1,Math.round(Math.abs(x2-x1)/2.2));for(let i=0;i<=n;i++){const t=i/n,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;if(y>.3)for(const s of [-1,1])B(p,.07,y-.05,.07,MAT.frame,x,(y-.05)/2,z+s*(width/2-.04));}}
}
function gearMotor(p,x,y,z,dir=1){B(p,.34,.36,.32,MAT.blue,x,y,z);CZ(p,.15,.42,MAT.motor,x,y,z+dir*.37,16);CZ(p,.155,.1,MAT.white,x,y,z+dir*.63,16);}
function beacon(p,x,y,z,pole=.4){C(p,.025,.025,pole,MAT.ssDark,x,y+pole/2,z,6);C(p,.09,.09,.08,MAT.white,x,y+pole+.04,z,12);C(p,.085,.085,.18,MAT.redLamp,x,y+pole+.17,z,12,false);}
function ctrlPanel(p,x,z,{w=1.4,h=2,face='small',beacons=1,stand=0}={}){
  const y0=.1+stand;B(p,w,h,.45,MAT.beige,x,y0+h/2,z);
  add(p,gPlane(w*.96,h*.94),std(0xffffff,0,.8,{map:panelFace(face)}),x,y0+h/2,z+.228,false);
  if(stand)legs(p,x-w/2+.08,x+w/2-.08,z-.15,z+.15,stand,MAT.frame,.07);
  for(let i=0;i<beacons;i++)beacon(p,x-w/2+.25+i*.3,y0+h,z,.1);
}
function crate(p,x,y,z,filled=true,rot=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;B(g,.6,.34,.42,MAT.green,0,.17,0);if(filled){B(g,.54,.02,.36,MAT.carton,0,.335,0,false);add(g,gPlane(.5,.32),std(0xffffff,0,.7,{map:crateFillTex}),0,.35,0,false).rotation.x=-Math.PI/2;}p.add(g);return g;}
function person(p,x,z,rot=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
  for(const s of [-.1,.1])C(g,.075,.07,.8,MAT.white,s,.4,0,10);
  C(g,.2,.22,.72,MAT.white,0,1.16,0,14);
  for(const s of [-.27,.27]){const a=C(g,.055,.05,.62,MAT.white,s,1.15,.12,8);a.rotation.x=-.7;C(g,.05,.05,.1,MAT.glove,s,.92,.36,8);}
  add(g,gSph(.15,14),MAT.white,0,1.68,0);B(g,.17,.09,.06,MAT.skin,0,1.7,.13);B(g,.16,.06,.04,MAT.white,0,1.63,.15);
  p.add(g);return g;
}
function signPlane(p,tex,w,h,x,y,z,rotY=0){const m=add(p,gPlane(w,h),std(0xffffff,0,.6,{map:tex}),x,y,z,false);m.rotation.y=rotY;return m;}
function texPlane(p,tex,w,d,x,y,z){const m=add(p,gPlane(w,d),std(0xffffff,0,.7,{map:tex}),x,y,z,false);m.rotation.x=-Math.PI/2;return m;}

/* ---------- 설비 빌더 (현장 사진 기반 개략 형상) ---------- */
const sa8Tex=textTex(['SA8'],{bg:'#c9d0d6',fg:'#b0201c',size:70});
const ishidaTex=textTex(['ISHIDA','METAL DETECTOR'],{bg:'#151a20',fg:'#f5f5f5',size:44});
const btlcTex=textTex(['BTLC'],{bg:'#c9d0d6',fg:'#a01818',size:64});
const BUILD={
  intake(g,w,body){ // #1~#4 투입 호퍼 + 벽 관통 경사 벨트
    const hx=-w/2+1.8;legs(g,hx-1.0,hx+1.0,-.75,.75,.42,MAT.frame,.08);
    const hp=C(g,1.72,.5,.55,body,hx,.72,0,4);hp.rotation.y=Math.PI/4;hp.scale.set(1,1,.8);   // 넓고 얕은 투입 받침통
    for(const z of [-.98,.98])B(g,2.5,.06,.06,MAT.ss,hx,1.0,z);for(const x of [hx-1.22,hx+1.22])B(g,.06,.06,2.0,MAT.ss,x,1.0,0);
    heap(g,hx-.1,.78,0,1.0,.36,1.15,2);                                   // 받침통 안 쌀 산 (#3, #4)
    belt(g,hx+.9,.85,w/2-.2,3.25,.9);
    slab(g,hx+.9,1.15,w/2-.2,3.55,.98,.04,MAT.ss);
    sack(g,hx-1.55,.42,.15,1.57,.95,.05);sack(g,hx-1.6,.45,-.6,1.5,.85,0);   // 받침통 가장자리에 기대 놓은 개봉 포대
    sack(g,hx-.4,.17,1.55,.1);sack(g,hx+.6,.17,1.6,-.05);sack(g,hx+.1,.46,1.58,.06,0,.03);
    legs(g,w/2-1.2,w/2-.6,-1.7,-1.3,1.8,MAT.frame,.06);B(g,.8,.8,.42,MAT.motor,w/2-.9,2.2,-1.5);
    return {h:3.8};
  },
  washer(g,w,body){ // #5,#7,#8 경사 스크류 세척기
    const x1=-w/2+.9,x2=w/2-.5,y1=1.0,y2=3.0;
    B(g,1.5,1.0,1.4,body,x1-.1,.55,0);
    heap(g,x1-.1,1.05,0,.62,.36,1.1,3);                                   // 세척 대기 불린 쌀
    slab(g,x1,y1+.25,x2,y2+.25,.7,.65,body);
    slab(g,x1,y1+.62,x2,y2+.62,.82,.08,MAT.ss);
    for(let i=1;i<=3;i++){const t=i/4,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;legs(g,x-.05,x+.05,-.3,.3,y,MAT.frame,.08);}
    gearMotor(g,x2+.1,y2+.35,-.55,-1);
    pipeRun(g,[[x2-.4,y2+.7,.2],[x2-.4,5.4,.2],[w/2+1.4,5.4,.2]],.12);
    return {h:3.6};
  },
  soak(g,w,body){ // #6,#10 원추형 침지 탱크 + 메자닌 작업대
    const py=3.0;legs(g,-w/2+.25,w/2-.25,-1.65,1.65,py,MAT.frame,.14);
    B(g,w-.3,.08,3.5,MAT.ssDark,0,py,0);
    for(const x of [-w/2+.3,0,w/2-.3])B(g,.05,1.0,.05,MAT.frame,x,py+.5,1.72);
    B(g,w-.4,.05,.05,MAT.frame,0,py+1.0,1.72);B(g,w-.4,.05,.05,MAT.frame,0,py+.5,1.72);
    for(const x of [-1.35,1.35]){
      C(g,1.05,.14,1.15,body,x,py-.6,0,24);C(g,1.05,1.05,2.2,body,x,py+1.1,0,24);C(g,1.0,1.0,.04,MAT.water,x,py+2.15,0,24,false);
      heap(g,x,py+2.12,0,.75,.32,1,4+x);                                  // 탱크 안 불린 쌀 더미
      pipeRun(g,[[x,py-1.2,0],[x,.45,0],[x+.6,.45,.6]],.09);CZ(g,.11,.06,MAT.red,x,1.2,.15,10);
    }
    const sx=w/2-.3;
    for(let i=0;i<9;i++){const t=i/9;B(g,.5,.04,.8,MAT.ssDark,sx-.35-t*2.2,.33+t*py,-2.25);}
    for(const z of [-1.86,-2.64])slab(g,sx,0,sx-2.6,py+.3,.05,.12,MAT.frame,z);
    return {h:5.9};
  },
  soak10(g,w,body){ // 침지조 10개 (사용자 확인) → 각 조 배출 쌀이 공용 컨베이어로 떨어져 합류
    const n=10,pitch=(w-1.2)/n,py=3.2,x0=-w/2+.6;
    for(let i=0;i<=n;i+=2){const x=x0+i*pitch;for(const z of [-1.3,1.3])B(g,.14,py,.14,MAT.frame,x,py/2,z);}
    for(const z of [-1.55,1.55])B(g,w-.8,.08,.75,MAT.ssDark,0,py,z);
    for(const z of [-1.95,1.95]){B(g,w-.8,.05,.05,MAT.frame,0,py+1.0,z);for(let i=0;i<=n;i++)B(g,.05,1.0,.05,MAT.frame,x0+i*pitch,py+.5,z);}
    belt(g,-w/2,BH,w/2,BH,1.0);                                            // 공용 집합 컨베이어
    pipeRun(g,[[-w/2+.4,py+2.6,.2],[w/2-.6,py+2.6,.2]],.1);                 // 세척 쌀 분배 배관
    for(let i=0;i<n;i++){const x=x0+pitch*(i+.5);
      C(g,.95,.14,1.0,body,x,py-.5,0,22);C(g,.95,.95,2.0,body,x,py+1.0,0,22);C(g,.9,.9,.04,MAT.water,x,py+1.95,0,22,false);
      heap(g,x,py+1.93,0,.62,.28,1,20+i);                                    // 침지 중인 불린 쌀
      pipe(g,[x,py+2.6,.2],[x,py+2.0,.2],.06);
      B(g,.3,.25,.3,MAT.ss,x,py-1.15,0);CZ(g,.1,.05,MAT.red,x,py-1.15,.2,10);   // 배출 밸브
      C(g,.06,.13,.8,MAT.riceHeap,x,1.5,0,10,false);                          // 컨베이어로 떨어지는 쌀 줄기
      heap(g,x,BH+.04,0,.34,.15,1.1,40+i);
    }
    const px=w/2-1.4;B(g,1.4,.22,.6,MAT.ssDark,px,.11,2.3);CX(g,.21,.7,MAT.motor,px+.35,.45,2.3,16);B(g,.42,.5,.42,body,px-.3,.47,2.3);   // 급배수 펌프 (#9, #11)
    hose(g,[[px-.3,.72,2.3],[px-.6,1.6,1.9],[x0+pitch*9.5,py-1.0,.9]],.09);
    const sx=-w/2+3.4;for(let i=0;i<9;i++){const t=i/9;B(g,.5,.04,.8,MAT.ssDark,sx-t*2.6,.33+t*py,-2.45);}
    for(const z of [-2.06,-2.84])slab(g,sx+.3,0,sx-2.9,py+.3,.05,.12,MAT.frame,z);
    return {h:6.0};
  },
  steamer(g,w,body){ // #15,#16 증숙 · 혼련
    legs(g,-w/2+.4,w/2-1.8,-.85,.85,.8,MAT.frame,.1);B(g,w-2.0,1.4,1.9,body,-.7,1.5,0);B(g,w-2.2,.35,1.7,MAT.ss,-.7,2.38,0);
    pipeRun(g,[[-w/2+.5,2.75,-1.1],[w/2-2,2.75,-1.1]],.08,MAT.ssDark);
    for(let i=0;i<3;i++){const x=-w/2+1+i*1.2;pipe(g,[x,2.75,-1.1],[x,2.2,-.95],.05,MAT.ssDark);CZ(g,.12,.04,MAT.red,x,2.55,-1.1,12);}
    for(const x of [-1.7,.3])C(g,.17,.17,1.7,MAT.ss,x,3.4,.3,12);
    const sh=C(g,.7,.25,.55,MAT.ss,-w/2+.8,2.85,0,4);sh.rotation.y=Math.PI/4;heap(g,-w/2+.8,3.1,0,.55,.4,1,9);
    const kx=w/2-.9;B(g,1.4,1.2,1.4,body,kx,1.1,0);gearMotor(g,kx,2.0,0,1);CX(g,.45,.9,MAT.ssDark,kx,1.75,0,18);
    return {h:4.3};
  },
  extruder(g,w,body){ // #17,#20~#22 로프형 반죽 압출
    B(g,2.2,1.0,1.2,body,-1.0,.6,0);CX(g,.3,1.7,MAT.ss,-.8,1.45,0,20);
    const hp=C(g,.6,.22,.6,body,-1.2,2.05,0,4);hp.rotation.y=Math.PI/4;
    B(g,.7,.7,.7,MAT.blue,-2.05,1.45,0);CX(g,.28,.7,MAT.motor,-2.4,1.45,0,16);
    C(g,.22,.3,.3,MAT.ssDark,.2,1.25,0,14).rotation.z=Math.PI/2;
    belt(g,.25,BH,w/2,BH,.7);gearMotor(g,w/2-.4,.7,.62,1);
    return {h:2.9};
  },
  watertank(g,w,body){ // #18,#19 냉각수조 + 체인 메쉬 컨베이어
    const x1=-w/2+.3,x2=w/2-1.5,L=x2-x1,cx=(x1+x2)/2;legs(g,x1+.2,x2-.2,-.6,.6,.4,MAT.frame,.1);
    B(g,L,.06,1.5,body,cx,.42,0);for(const z of [-.75,.75])B(g,L,.82,.06,body,cx,.8,z);for(const x of [x1,x2])B(g,.06,.82,1.5,body,x,.8,0);
    add(g,gBox(L-.1,.02,1.42),MAT.water,cx,1.06,0,false);
    belt(g,x1+.3,.95,x2-.1,.95,1.0,{mat:MAT.mesh,legsOn:false});
    belt(g,x2-.1,.95,w/2-.2,2.35,1.0,{mat:MAT.mesh});
    gearMotor(g,w/2-.35,2.35,-.75,-1);
    pipeRun(g,[[x1,2.05,-.55],[x2,2.05,-.55]],.05,MAT.white);for(const x of [x1,x2])B(g,.08,2.1,.08,MAT.frame,x,1.05,-.55);
    return {h:2.8};
  },
  sheeter(g,w,body){ // #25,#26 압연 롤러
    B(g,3.2,1.0,1.6,body,-.5,.55,0);for(const z of [-.9,.9])B(g,1.8,1.5,.12,MAT.ss,-1.0,1.65,z);
    CZ(g,.38,1.7,MAT.ssDark,-1.4,1.62,0,28);CZ(g,.34,1.7,MAT.ssDark,-.65,1.4,0,28);CZ(g,.22,1.72,MAT.belt,-.2,1.25,0,20);
    const hp=C(g,.75,.3,.6,body,-1.45,2.75,0,4);hp.rotation.y=Math.PI/4;
    for(const x of [-1.8,-.4])for(const z of [-.8,.8])B(g,.06,.85,.06,MAT.frame,x,2.65,z);
    B(g,1.5,.08,1.7,MAT.ssDark,-1.1,3.1,0);gearMotor(g,-1.1,3.35,-.2,1);
    for(const z of [-.95,.95]){C(g,.07,.07,.5,MAT.motor,-1.95,1.5,z,10);hose(g,[[-1.95,1.25,z],[-2.2,.9,z*1.1],[-2.3,.2,z*1.2]],.025,MAT.blue);}
    B(g,.95,1.05,.42,MAT.ss,1.25,1.95,.85);for(let i=0;i<4;i++)CZ(g,.06,.05,i<2?MAT.greenLamp:MAT.dark,1.03+(i%2)*.42,2.2-Math.floor(i/2)*.32,1.08,10);
    belt(g,-.1,BH,w/2,BH,1.05);
    return {h:3.6};
  },
  cutter(g,w,body){ // #23,#24,#27~#30 원형 타발 + 스크랩 회수
    legs(g,-w/2+.3,w/2-.3,-.6,.6,BH-.08,MAT.frame,.1);B(g,w-.4,.25,1.25,body,0,BH-.2,0);
    const dx=-w/2+1.6;
    belt(g,-w/2,BH,w/2,BH,1.1,{mat:MAT.modular,legsOn:false});
    texPlane(g,cutterBeltTex,w/2-dx-.3,1.0,(dx+.3+w/2)/2,BH+.045,0);      // 타발 후 원형 생지가 줄지어 나옴
    for(const z of [-.75,.75])B(g,.9,1.3,.14,body,dx,BH+.6,z);
    const spin=CZ(g,.3,1.4,MAT.ssDark,dx,BH+.36,0,28);
    for(let i=0;i<8;i++)CZ(g,.315,.05,MAT.ss,dx,BH+.36,-.6+i*.17,28);    // 원형 다이 날
    B(g,1.1,.18,1.7,MAT.ss,dx,BH+1.35,0);C(g,.09,.09,.6,MAT.motor,dx,BH+1.7,.55,12);hose(g,[[dx,BH+2.0,.55],[dx+.6,BH+2.3,.9],[dx+1.2,.2,1.3]],.025,MAT.blue);
    legs(g,-.9,1.7,1.1,2.0,1.05,MAT.frame,.07);B(g,2.7,.06,1.0,MAT.ss,.4,1.08,1.55);texPlane(g,tableTex,2.5,.9,.4,1.115,1.55);
    ctrlPanel(g,.9,2.75,{w:1.5,h:1.9,face:'temp',beacons:3});
    return {h:2.7,spin,spinAxis:'z'};
  },
  dryer(g,w,body){ // #31~#39 다단 메쉬 벨트 건조기
    const L=w-.8,y0=.35,H=4.4;
    B(g,L,y0,3.6,MAT.ssDark,0,y0/2,0);B(g,L,.3,3.7,body,0,y0+H+.15,0);
    B(g,L,H,1.8,body,0,y0+H/2,-.85);for(const x of [-L/2,L/2])B(g,.16,H,3.6,body,x,y0+H/2,0);
    for(let i=0;i<4;i++){const y=y0+.7+i*.95;B(g,L-.3,.06,1.6,MAT.mesh,0,y,.85,false);texPlane(g,dryerTierTex,L-.3,1.5,0,y+.035,.85);}
    const glass=add(g,gBox(L-.2,H-.1,.05),MAT.glass,0,y0+H/2,1.77,false);glass.renderOrder=2;
    for(let x=-L/2;x<=L/2+.01;x+=L/7){B(g,.12,H,.14,MAT.ss,x,y0+H/2,1.78);for(const y of [y0+1.1,y0+3.0])CZ(g,.16,.04,MAT.ss,x,y,1.88,14);}
    B(g,L,.1,.16,MAT.ss,0,y0+2.15,1.78);
    const lx=-L/2+2.4;B(g,1.6,.06,.9,std(0x7a3b2a,.4,.6),lx,2.7,2.25);legs(g,lx-.75,lx+.75,1.85,2.65,2.7,MAT.frame,.06);
    for(const z of [2.6,3.2])slab(g,lx+.8,0,lx+2.2,2.7,.05,.1,MAT.frame,z);for(let i=1;i<8;i++){const t=i/8;B(g,.25,.04,.6,MAT.ssDark,lx+2.2-t*1.4,t*2.7,2.9);}
    for(const x of [-L/3,0,L/3])C(g,.32,.32,2.6,MAT.ss,x,y0+H+1.6,-.8,16);
    pipe(g,[-L/3,y0+H+2.9,-.8],[L/3,y0+H+2.9,-.8],.34,MAT.ss,16);
    ctrlPanel(g,L/2-2,2.6,{w:2.4,h:2.0,face:'dryer',beacons:2});
    return {h:5.3};
  },
  detector(g,w,body){ // #40~#43 ISHIDA 금속검출기
    legs(g,-w/2+.2,w/2-.2,-.4,.4,BH-.05,MAT.frame,.07);belt(g,-w/2,BH,w/2,BH,.85,{mat:MAT.modular,legsOn:false});
    B(g,.7,.18,1.3,body,0,BH-.2,0);B(g,.7,.5,1.3,body,0,BH+.55,0);for(const z of [-.6,.6])B(g,.7,.6,.12,body,0,BH+.15,z);
    const s=B(g,.62,.46,.08,MAT.dark,0,BH+1.15,.45);s.rotation.x=-.5;add(g,gPlane(.56,.28),std(0xffffff,0,.4,{map:ishidaTex,emissive:0xffffff,emissiveIntensity:.15}),0,BH+1.17,.5,false).rotation.x=-.5;
    beacon(g,w/2-.25,BH-.2,.75,1.4);B(g,.12,.12,.08,MAT.yellow,.42,BH+.7,.68);
    C(g,.32,.28,.8,MAT.bag,-.2,.4,-1.05,16);
    return {h:2.4};
  },
  semipack(g,w,body){ // #42,#44~#48 반제품 선별 · 크레이트 계량 포장
    const tx=-w/2+2.1;legs(g,tx-1.9,tx+1.9,-.7,.7,.92,MAT.frame,.07);B(g,4.0,.06,1.6,body,tx,.95,0);
    texPlane(g,tableTex,3.8,1.4,tx,.985,0);
    person(g,tx-.8,-1.15,0);person(g,tx+.7,1.15,Math.PI);
    const sx=w/2-1.9;B(g,.9,.1,.9,MAT.ss,sx,.05,1.0);crate(g,sx,.1,1.0,true);C(g,.035,.035,1.0,MAT.ss,sx+.55,.6,1.35,8);
    B(g,.36,.24,.12,MAT.blue,sx+.55,1.15,1.35);B(g,.2,.06,.01,MAT.digits,sx+.55,1.18,1.415,false);
    pallet(g,w/2-.8,0,-1.0,1.25,1.05,MAT.pallet);for(let l=0;l<4;l++)for(let i=0;i<2;i++)for(let j=0;j<2;j++)crate(g,w/2-1.1+i*.62,.15+l*.35,-1.22+j*.44,l===3);
    for(let l=0;l<3;l++)crate(g,sx-.4,l*.35,-1.15,false);
    legs(g,w/2-.9,w/2-.2,1.7,2.2,.9,MAT.frame,.05);B(g,.8,.04,.6,MAT.ss,w/2-.55,.92,1.95);B(g,.32,.01,.42,MAT.white,w/2-.6,.95,1.95,false);B(g,.14,.02,.2,MAT.dark,w/2-.35,.95,1.9,false);
    for(let i=0;i<4;i++)B(g,1.1,.05,.8,MAT.carton,-w/2+.7,.025+i*.05,1.9);
    return {h:1.9};
  },
  aging(g,w){ // #45,#51 반제품 크레이트 팔레트 적재
    const im=new THREE.InstancedMesh(gBox(.6,.34,.42),MAT.green,6*5*4);im.castShadow=im.receiveShadow=true;const d=new THREE.Object3D();let n=0;
    for(let i=0;i<3;i++)for(let j=0;j<2;j++){const px=-w/2+1.3+i*2.6,pz=-.8+j*1.6;pallet(g,px,0,pz,1.25,.95,MAT.pallet);
      const layers=4+((i+j)%2);for(let l=0;l<layers;l++)for(let a=0;a<2;a++)for(let b=0;b<2;b++){d.position.set(px-.31+a*.62,.32+l*.35,pz-.21+b*.43);d.updateMatrix();im.setMatrixAt(n++,d.matrix);}}
    im.count=n;g.add(im);
    B(g,.35,1.6,.1,MAT.frame,w/2-.4,.8,1.6);B(g,.28,.2,.08,MAT.white,w/2-.4,1.5,1.66);
    B(g,.6,.12,1.1,MAT.red,w/2-.9,.1,2.0);C(g,.03,.03,1.1,MAT.dark,w/2-.9,.6,2.6,6).rotation.x=-.4;
    return {h:2.2};
  },
  cabinet(g,w,body){ // #49~#54 SA8 2차 건조기 + 배출 경사 컨베이어
    const bw=w-1.8,cx=-.6;B(g,bw,3.6,3.2,body,cx,1.85,0);B(g,bw+.1,.12,3.3,MAT.ssDark,cx,3.7,0);
    B(g,2.3,3.0,.06,MAT.ssDark,cx+.2,1.6,1.63);B(g,.06,.5,.06,MAT.ss,cx+1.15,1.7,1.68);
    signPlane(g,sa8Tex,.8,.4,cx-.4,3.3,1.62);
    B(g,.65,.85,.28,MAT.beige,cx+bw/2-.15,2.4,1.75);for(let i=0;i<2;i++)CZ(g,.05,.04,MAT.greenLamp,cx+bw/2-.32+i*.18,2.65,1.9,10);
    C(g,.32,.32,4.4,MAT.ss,cx-1,6.0,-.8,16);
    belt(g,w/2-1.5,.9,w/2+.2,2.7,.8,{mat:MAT.modular});
    B(g,.9,.5,1.0,MAT.glass,w/2+.25,2.7,0,false);B(g,.9,.05,1.0,MAT.ss,w/2+.25,2.45,0);
    pallet(g,w/2-1.2,0,-1.9,1.25,1.05,MAT.pallet);for(let i=0;i<2;i++)for(let l=0;l<3;l++)crate(g,w/2-1.5+i*.62,.15+l*.35,-1.9,l===2);
    return {h:3.9};
  },
  predrum(g,w,body){ // #55,#56 예열 회전드럼 (청색 하우징)
    const L=w-1.2;for(const x of [-L/2+.3,0,L/2-.3])for(const z of [-.9,.9])B(g,.12,1.9,.12,MAT.greenFrame,x,.95,z);
    B(g,L,.1,1.9,MAT.greenFrame,0,1.9,0);
    body=std(0x2a4f9a,.35,.5);
    B(g,L,1.8,2.0,body,0,2.85,0);for(let i=1;i<4;i++)B(g,.04,1.8,2.04,MAT.ss,-L/2+i*L/4,2.85,0);
    for(const y of [1.95,3.75])for(const z of [-1,1])B(g,L+.04,.06,.06,MAT.ss,0,y,z);
    const spin=CX(g,.72,.15,MAT.ssDark,L/2+.05,2.85,0,8);
    const hp=C(g,.55,.2,.5,MAT.ss,-L/2+.6,4.0,0,4);hp.rotation.y=Math.PI/4;
    C(g,.32,.32,4.3,MAT.ss,-.6,5.9,-.4,16);
    slab(g,L/2,2.4,w/2+.4,1.5,.7,.06,MAT.ss);
    ctrlPanel(g,L/2-.6,1.9,{w:.8,h:.75,face:'small',beacons:0,stand:.95});C(g,.12,.12,.55,MAT.fireRed,-L/2+.2,.28,1.5,12);
    return {h:4.2,spin,spinAxis:'x'};
  },
  fryer(g,w,body){ // #57~#60 연속 유탕기 + 배기 후드 + HMI 조작반
    const L=w-1.0;legs(g,-L/2+.3,L/2-.3,-.9,.9,.55,MAT.dark,.12);B(g,L,1.0,2.2,body,0,1.05,0);
    const glow=std(0xc58a2c,.3,.2,{emissive:0x6b3e08,emissiveIntensity:1.2});add(g,gBox(L-.6,.04,1.8),glow,0,1.56,0,false);
    for(let i=0;i<3;i++)B(g,L/3-.15,.55,2.0,MAT.ss,-L/3+i*L/3,2.0,0);
    for(const x of [-L/2+.5,L/2-.5])for(const z of [-1.1,1.1])B(g,.12,2.2,.12,MAT.ss,x,2.1,z);
    B(g,L,.55,2.6,MAT.ss,0,3.1,0);for(const x of [-L/4,L/4]){C(g,.36,.6,.5,MAT.ss,x,3.6,0,16);C(g,.36,.36,4.6,MAT.ss,x,6.1,0,16);}
    pipe(g,[-L/4,8.4,0],[L/2+2,8.4,0],.38,MAT.ss,16);
    for(const x of [-1.2,.2])C(g,.45,.45,1.6,MAT.ss,x,.9,-2.0,18);pipeRun(g,[[-1.2,1.75,-2.0],[-1.2,2.0,-1.1]],.08,MAT.ssDark);pipeRun(g,[[.2,1.75,-2.0],[.2,1.3,-1.1]],.08,MAT.ssDark);
    belt(g,-w/2,BH+.4,-L/2+.5,1.5,.9,{mat:MAT.mesh,legsOn:false});belt(g,L/2-1.4,1.45,w/2,1.75,.9,{mat:MAT.mesh});
    signPlane(g,btlcTex,.7,.35,L/2-.5,1.2,1.12);
    ctrlPanel(g,-L/2+1.2,2.7,{w:1.8,h:2.2,face:'hmi',beacons:0});for(let i=0;i<3;i++)beacon(g,-L/2+.6+i*.5,2.3,2.7,.12);
    C(g,.12,.12,.55,MAT.fireRed,L/2-.3,.28,1.6,12);
    return {h:4.4,glow};
  },
  drum(g,w,body){ // 분말 조미 드럼 (형태 추가 확인 필요)
    B(g,w-.6,.35,1.8,MAT.ssDark,0,.18,0);for(const x of [-w/2+.8,w/2-.8])B(g,.3,1.4,1.4,MAT.ss,x,1.0,0);
    const spin=CX(g,.75,w-2.0,body,0,1.85,0,24);for(const x of [-w/2+1.2,w/2-1.2])CX(g,.8,.12,MAT.ssDark,x,1.85,0,24);
    C(g,.55,.18,.8,MAT.ss,-w/2+1.0,3.4,-.5,16);pipe(g,[-w/2+1.0,3.0,-.5],[-w/2+1.8,2.1,-.1],.09,MAT.ss);
    legs(g,-w/2+.7,-w/2+1.3,-.8,-.2,3.0,MAT.frame,.05);gearMotor(g,w/2-.5,.75,-.6,-1);
    // 맛별 조미 분말 원추 호퍼 (#67·#68 배경: 흰 철골 위 SUS 호퍼 다수)
    const hz=-1.75;for(const x of [-w/2+.3,w/2-.3])for(const z of [hz-.5,hz+.5])B(g,.1,2.6,.1,MAT.white,x,1.3,z);B(g,w-.4,.1,1.1,MAT.white,0,2.6,hz);
    for(let i=0;i<4;i++){const x=-w/2+.9+i*(w-1.8)/3;C(g,.42,.42,.75,MAT.ss,x,3.05,hz,20);C(g,.42,.08,.55,MAT.ss,x,2.4,hz,20);C(g,.43,.43,.05,MAT.ssDark,x,3.44,hz,20);pipe(g,[x,2.12,hz],[x*.6,2.4,-.3],.04,MAT.ss);}
    return {h:3.8,spin,spinAxis:'x'};
  },
  cooler(g,w,body){ // 냉각 컨베이어 (사진 미확인)
    belt(g,-w/2,BH,w/2,BH,1.0,{mat:MAT.mesh});
    for(const x of [-w/2+.3,w/2-.3])for(const z of [-.65,.65])B(g,.07,2.3,.07,MAT.frame,x,1.15,z);
    B(g,w-.4,.06,1.4,MAT.ss,0,2.3,0);
    for(let i=0;i<3;i++){const x=-w/3+i*w/3;B(g,1.1,.35,1.1,body,x,2.1,0);C(g,.42,.42,.04,MAT.dark,x,1.91,0,20);}
    return {h:2.6};
  },
  packer(g,w,body){ // 개별 소포장 — 수평 필로우 포장기 (사용자 확인 · 기종 미확인)
    belt(g,-w/2,BH,-w/2+2.2,BH,.6,{mat:MAT.modular});for(let i=0;i<8;i++)B(g,.03,.12,.6,MAT.ssDark,-w/2+.2+i*.26,BH+.1,0);
    const x1=-w/2+2.2,x2=w/2-1.4,cx=(x1+x2)/2;legs(g,x1+.2,x2-.2,-.5,.5,.6,MAT.frame,.08);
    B(g,x2-x1,.55,1.3,body,cx,.85,-.1);B(g,x2-x1,.35,.12,MAT.ss,cx,BH+.25,.45);
    B(g,.8,.45,.9,MAT.ss,x1+.6,BH+.4,0);
    CZ(g,.42,.6,MAT.film,x1+.6,2.2,-.55,24);CZ(g,.1,.66,MAT.ssDark,x1+.6,2.2,-.55,12);legs(g,x1+.4,x1+.8,-.7,-.4,1.8,MAT.frame,.05);
    const spin=CZ(g,.22,.7,MAT.ssDark,x2-.5,BH+.3,0,8);CZ(g,.22,.7,MAT.ssDark,x2-.5,BH-.15,0,8);
    B(g,.5,.35,.06,MAT.screen,cx,1.75,.62);C(g,.03,.03,.7,MAT.ss,cx,1.35,.6,8);
    belt(g,x2,BH,w/2,BH,.6);
    return {h:2.8,spin,spinAxis:'z'};
  },
  outerpack(g,w,body){ // 묶음 외포장 (사용자 확인 · 기종 미확인)
    belt(g,-w/2,BH,-w/2+2.4,BH,.9,{mat:MAT.modular});for(let i=0;i<4;i++)B(g,.04,.2,.9,MAT.ss,-w/2+.4+i*.6,BH+.14,0);
    const x1=-w/2+2.4,x2=w/2-1.5,cx=(x1+x2)/2;B(g,x2-x1,1.2,1.6,body,cx,1.0,-.1);
    add(g,gBox(x2-x1-.2,.6,.05),MAT.glass,cx,1.9,.72,false);B(g,x2-x1,.1,1.6,MAT.ss,cx,2.25,-.1);
    const spin=CZ(g,.5,.9,MAT.film,cx,2.75,-.3,12);legs(g,cx-.4,cx+.4,-.6,-.1,2.3,MAT.frame,.05);
    B(g,.55,.4,.06,MAT.screen,x2-.4,1.9,.75);beacon(g,x1+.3,2.3,.6,.3);
    belt(g,x2,BH,w/2,BH,.9);
    return {h:3.5,spin,spinAxis:'z'};
  },
  checkweigher(g,w,body){ // #61~#63 ISHIDA DACS 중량선별기 + ISHIDA 금속검출기 + 수동 확인 저울
    legs(g,-w/2+.2,w/2-.2,-.4,.4,BH-.05,MAT.frame,.07);
    belt(g,-w/2,BH,-.2,BH,.8,{mat:MAT.dark,legsOn:false});belt(g,.1,BH,w/2,BH,.8,{mat:MAT.greenBelt,legsOn:false});
    const cx=-1.5;add(g,gBox(2.2,.42,1.0),MAT.glass,cx,BH+.3,0,false);B(g,2.2,.03,1.02,MAT.ss,cx,BH+.52,0);   // 투명 커버
    for(let i=0;i<12;i++)B(g,.01,.03,.04,MAT.dark,cx-1.0+i*.18,BH+.53,.52,false);                                // 눈금자
    B(g,.75,1.55,.42,body,cx,1.95,-.75);const scr=B(g,.62,.5,.04,MAT.dark,cx,2.45,-.53);void scr;
    add(g,gPlane(.56,.36),std(0xffffff,0,.4,{map:cwScreenTex,emissive:0xffffff,emissiveIntensity:.35}),cx,2.46,-.505,false);
    B(g,.16,.16,.06,MAT.yellow,cx+.25,1.75,-.52);CZ(g,.05,.06,MAT.red,cx+.25,1.75,-.48,10);beacon(g,cx-.3,2.72,-.75,.2);
    B(g,.42,.12,.02,MAT.white,cx-.15,1.62,-.53,false);B(g,.5,.14,.02,MAT.white,cx,1.42,-.53,false);             // 라벨 'CKTTL-1A'
    const mx=1.3;B(g,.7,.18,1.2,body,mx,BH-.2,0);B(g,.7,.45,1.2,body,mx,BH+.55,0);for(const z of [-.55,.55])B(g,.7,.6,.12,body,mx,BH+.15,z);
    B(g,.55,.4,.08,MAT.dark,mx+.55,1.75,-.72);add(g,gPlane(.48,.3),std(0xffffff,0,.4,{map:ishidaTex,emissive:0xffffff,emissiveIntensity:.2}),mx+.55,1.75,-.675,false);
    C(g,.04,.04,.9,MAT.ss,mx+.55,1.1,-.72,8);
    legs(g,.05,.65,.75,1.25,.75,MAT.ss,.05);B(g,.55,.12,.45,MAT.blue,.35,.82,1.0);B(g,.3,.08,.02,MAT.digits,.35,.82,1.235,false);   // 수동 확인 저울 (#62)
    C(g,.3,.26,.75,MAT.bag,w/2-.4,.38,1.25,14);                                                                  // NG 리젝트 백
    const tarp=add(g,gPlane(3.2,3.4),std(0xffffff,0,.85,{map:stripeTex,side:THREE.DoubleSide}),cx+.4,1.75,-2.35,false);void tarp;   // 줄무늬 천막 (#61·#62)
    return {h:2.9};
  },
  caseerector(g,w,body){ // #64~#66 jaepack 자동 제함기(MGTD-A) + 롤러 컨베이어 + 수작업 입상
    belt(g,-w/2,BH,-w/2+6.6,BH,.65,{mat:MAT.greenBelt});                                    // 묶음 공급 녹색 벨트 (#66)
    const ez=-1.4,ex=-w/2+1.8;for(const x of [ex-1.3,ex+1.3])for(const z of [ez-.85,ez+.85])B(g,.08,2.3,.08,MAT.ss,x,1.15,z);
    B(g,2.7,.08,1.8,MAT.ss,ex,2.3,ez);add(g,gBox(2.6,1.9,.03),MAT.glass,ex,1.2,ez+.88,false);for(const x of [ex-.65,ex+.65])B(g,.04,1.9,.05,MAT.ss,x,1.2,ez+.9);
    B(g,1.6,.9,1.3,MAT.ssDark,ex+.3,.75,ez);signPlane(g,jaepackTex,.7,.26,ex+.3,.35,ez+.92);
    for(let i=0;i<22;i++)B(g,.04,1.25,.9,MAT.carton,ex-1.05+i*.045,.95,ez,false);            // 카톤 블랭크 매거진
    B(g,.7,2.2,.5,std(0xc9ced2,.3,.5),ex+1.75,1.2,ez-.55);B(g,.4,.26,.03,MAT.screen,ex+1.75,1.75,ez-.29);CZ(g,.07,.05,MAT.red,ex+1.62,2.05,ez-.27,12);CZ(g,.05,.05,MAT.blue,ex+1.9,2.05,ez-.27,10);
    for(let x=ex+1.4;x<w/2;x+=.26)CZ(g,.045,1.0,MAT.ss,x,BH-.02,ez+.2,10);for(const z of [ez-.32,ez+.72])B(g,w/2-ex-1.4,.06,.05,MAT.ss,(ex+1.4+w/2)/2,BH+.04,z);
    legs(g,ex+1.5,w/2-.15,ez-.3,ez+.7,BH-.05,MAT.frame,.06);
    for(const x of [ex+2.4,ex+3.4]){const bx=B(g,.62,.42,.48,MAT.brandBox,x,BH+.24,ez+.2);void bx;B(g,.56,.02,.42,MAT.dark,x,BH+.455,ez+.2,false);}   // 열린 카톤
    person(g,ex+2.9,1.25,Math.PI);
    return {h:2.5};
  },
  palletizer(g,w,body){ // #67·#68 6축 협동로봇 팔레타이저 — 회색 캐비닛 위 베이스 · 흰 관절/검정 링크 · 진공 그리퍼 · 검정 팔레트
    const iz=-1.2,pickX=-.9,BOX=[.62,.42,.48];
    // 공급: 흰 벨트 + 끝단 SUS 스토퍼 (#68)
    belt(g,-w/2,BH,pickX+.36,BH,.9,{mat:MAT.belt});B(g,.06,.45,1.0,MAT.ss,pickX+.4,BH+.22,iz);for(const z of [iz-.5,iz+.5])B(g,1.2,.3,.04,MAT.ss,pickX-.2,BH+.2,z);
    hose(g,[[pickX+.5,.05,iz+.6],[pickX+1.4,.05,iz+.2],[pickX+2.4,.05,iz+.9]],.03,MAT.blue);
    // 앞쪽 회색 롤러 테이블 + 녹색 가이드 (#67)
    const rz=1.55;for(let x=-w/2+.4;x<-w/2+2.6;x+=.22)CZ(g,.045,.85,MAT.ss,x,.82,rz,10);for(const z of [rz-.45,rz+.45])B(g,2.4,.09,.05,std(0x2bb673,.1,.5),-w/2+1.5,.92,z);
    legs(g,-w/2+.4,-w/2+2.6,rz-.4,rz+.4,.78,MAT.frame,.06);B(g,2.3,.12,.95,std(0xd3d7db,.2,.5),-w/2+1.5,.72,rz);
    // 회색 캐비닛 (환기 루버 · 비상 스위치 · 상태등)
    const bx=-.4,bz=-.1,ch=1.5,cab=std(0xd3d7db,.2,.5);B(g,.8,ch,.8,cab,bx,ch/2,bz);B(g,.02,ch-.2,.02,MAT.dark,bx+.05,ch/2,bz+.41,false);
    for(let i=0;i<5;i++)B(g,.18,.015,.01,MAT.dark,bx-.25,ch-.25-i*.04,bz+.405,false);B(g,.1,.1,.03,MAT.yellow,bx-.36,ch-.3,bz+.41);CZ(g,.035,.04,MAT.red,bx-.36,ch-.3,bz+.43,10);
    B(g,.5,.08,.25,MAT.dark,bx+.12,ch+.04,bz+.22);B(g,.06,.03,.06,MAT.greenLamp,bx+.3,ch+.09,bz+.22);
    // 팔레트 + 적재 (인스턴스 12칸) + 빈 팔레트 적치
    const PX=.72,PZ=.55;pallet(g,PX,0,PZ,1.25,1.05,MAT.blackPallet);
    const SLOTS=[];for(let l=0;l<3;l++)for(let i=0;i<2;i++)for(let j=0;j<2;j++)SLOTS.push([PX-.31+i*.62,.17+BOX[1]/2+l*(BOX[1]+.01),PZ-.25+j*.5]);
    const stack=new THREE.InstancedMesh(gBox(...BOX),MAT.brandBox,SLOTS.length);stack.castShadow=stack.receiveShadow=true;g.add(stack);
    const dmy=new THREE.Object3D();SLOTS.forEach((p,k)=>{dmy.position.set(...p);dmy.updateMatrix();stack.setMatrixAt(k,dmy.matrix);});
    for(let k=0;k<6;k++)pallet(g,w/2-.7,k*.16,-1.5,1.1,1.0,MAT.blackPallet);
    B(g,.06,1.1,.06,std(0xf2c200,.1,.5),bx-.65,.55,1.0);
    // 6축 로봇 팔 (J1 베이스 선회 · J2 어깨 · J3 팔꿈치 · J4 손목1 · J5 손목2 · J6 툴 회전)
    const WHITE=std(0xeef1f3,.15,.35),BLK=std(0x22262b,.2,.45),L1=1.0,L2=.95,D=.42;
    const j1=new THREE.Group();j1.position.set(bx,ch+.02,bz);g.add(j1);C(j1,.14,.15,.12,WHITE,0,.06,0,24);C(j1,.12,.12,.2,WHITE,0,.2,0,24);
    const j2=new THREE.Group();j2.position.y=.28;j1.add(j2);CZ(j2,.12,.24,WHITE,0,0,0,24);C(j2,.12,.12,.05,BLK,0,0,.13,24).rotation.x=Math.PI/2;
    const up=CX(j2,.065,L1-.18,BLK,L1/2,0,.13,18);void up;CX(j2,.075,.06,WHITE,.12,0,.13,18);
    const j3=new THREE.Group();j3.position.set(L1,0,0);j2.add(j3);CZ(j3,.1,.36,WHITE,0,0,.05,22);
    CX(j3,.055,L2-.14,BLK,L2/2,0,-.06,18);
    const j4=new THREE.Group();j4.position.set(L2,0,0);j3.add(j4);CZ(j4,.075,.2,WHITE,0,0,-.04,20);
    const j5=new THREE.Group();j5.position.y=-.13;j4.add(j5);C(j5,.07,.07,.16,WHITE,0,0,0,20);C(j5,.072,.072,.04,BLK,0,-.05,0,20);
    const j6=new THREE.Group();j6.position.y=-.14;j5.add(j6);C(j6,.06,.06,.08,WHITE,0,0,0,18);
    const grip=new THREE.Group();grip.position.y=-.06;j6.add(grip);C(grip,.03,.03,.1,MAT.ss,0,-.05,0,10);   // 툴 플랜지 → 그리퍼 (D=0.42 = 손목~흡착면)
    B(grip,.5,.07,.34,std(0x2f5fd0,.25,.4),0,-.13,0);for(const s of [-.12,.12])B(grip,.04,.06,.3,MAT.ss,s,-.08,0);
    for(let i=0;i<4;i++)for(let k=0;k<2;k++)C(grip,.035,.03,.04,std(0x3b6ff0,0,.5),-.18+i*.12,-.185,-.08+k*.16,10);
    hose(grip,[[-.15,-.1,.15],[-.2,.08,.2],[-.05,.2,.05]],.012,std(0xff7a18,0,.5));hose(grip,[[.15,-.1,.15],[.2,.08,.2],[.05,.2,.05]],.012,std(0x2a7bff,0,.5));
    hose(j1,[[.1,.25,-.08],[.3,.55,-.15],[.6,.5,-.1]],.02,BLK);
    const carried=add(grip,gBox(...BOX),MAT.brandBox,0,-.205-BOX[1]/2,0);carried.visible=false;
    const pickBox=add(g,gBox(...BOX),MAT.brandBox,pickX,BH+.06+BOX[1]/2,iz);
    // 역기구학: 흡착면 목표점 T → 손목 W=T+(0,D,0) → J1 선회, J2·J3 2링크 평면 IK(팔꿈치 위), J4로 툴 수직 유지, J6로 박스 방향 정렬
    const SH=new THREE.Vector3(bx,ch+.02+.28,bz);
    function solve(T){const dx=T.x-SH.x,dz=T.z-SH.z,r=Math.hypot(dx,dz),y=T.y+D-SH.y,yaw=Math.atan2(-dz,dx);
      let d2=Math.min(Math.hypot(r,y),(L1+L2)*.995);const ce=Math.max(-1,Math.min(1,(d2*d2-L1*L1-L2*L2)/(2*L1*L2))),e=Math.acos(ce);
      const a=Math.atan2(y,r)+Math.atan2(L2*Math.sin(e),L1+L2*Math.cos(e));
      j1.rotation.y=yaw;j2.rotation.z=a;j3.rotation.z=-e;j4.rotation.z=-(a-e);j6.rotation.y=-yaw;}
    const cyl=v=>({yaw:Math.atan2(-(v.z-SH.z),v.x-SH.x),r:Math.hypot(v.x-SH.x,v.z-SH.z),y:v.y});
    const fromCyl=c=>new THREE.Vector3(SH.x+Math.cos(c.yaw)*c.r,c.y,SH.z-Math.sin(c.yaw)*c.r);
    const ease=t=>t*t*t*(t*(t*6-15)+10);
    function mix(A,Bv,t,arc=0){const a=cyl(A),b=cyl(Bv);let dy=b.yaw-a.yaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;const k=ease(t);
      return fromCyl({yaw:a.yaw+dy*k,r:a.r+(b.r-a.r)*k,y:a.y+(b.y-a.y)*k+Math.sin(Math.PI*k)*arc});}
    const V=(x,y,z)=>new THREE.Vector3(x,y,z),TOP=BOX[1]+.005;
    const pick=V(pickX,BH+.06+TOP,iz),abovePick=V(pickX,pick.y+.4,iz);
    const place=k=>{const s=SLOTS[k];return V(s[0],s[1]+BOX[1]/2+.005,s[2]);},abovePlace=k=>{const p=place(k);return V(p.x,Math.max(p.y,.17+3*BOX[1])+.45,p.z);};
    // 1사이클 ≈ 7.2초: 픽 위치 이동 → 하강 → 흡착 → 상승 → 운반(호) → 하강 → 해제 → 상승
    const SEG=[['go',1.5],['down',.7],['grip',.4],['lift',.6],['move',1.9],['lower',.8],['release',.4],['rise',.6]];
    const CYCLE=SEG.reduce((s,x)=>s+x[1],0);
    let clock=0,last=null,placed=5,slot=5,from=abovePick.clone();   // 일부 적재된 팔레트에서 시작
    function setPlaced(n){stack.count=n;}
    setPlaced(placed);
    const anim=(t,run)=>{const dt=last===null?0:Math.min(.05,Math.max(0,t-last));last=t;if(run)clock+=dt;
      while(clock>=CYCLE){clock-=CYCLE;from=abovePlace(slot);placed++;slot=placed%SLOTS.length;if(placed>=SLOTS.length){placed=0;slot=0;}setPlaced(placed);}
      let c=clock,i=0;while(i<SEG.length-1&&c>=SEG[i][1]){c-=SEG[i][1];i++;}const u=Math.min(1,c/SEG[i][1]),ph=SEG[i][0];
      let T;
      if(ph==='go')T=mix(from,abovePick,u,.12);else if(ph==='down')T=mix(abovePick,pick,u);else if(ph==='grip')T=pick;else if(ph==='lift')T=mix(pick,abovePick,u);
      else if(ph==='move')T=mix(abovePick,abovePlace(slot),u,.18);else if(ph==='lower')T=mix(abovePlace(slot),place(slot),u);else if(ph==='release')T=place(slot);else T=mix(place(slot),abovePlace(slot),u);
      solve(T);
      const holding=['lift','move','lower'].includes(ph)||(ph==='grip'&&u>.5)||(ph==='release'&&u<.5);
      carried.visible=holding;pickBox.visible=!holding&&['go','down','grip'].includes(ph)||ph==='rise'||ph==='release';
      if(ph==='release'&&u>=.5)setPlaced(placed+1);
    };
    anim(0,true);void body;return {h:3.1,anim};
  },
};

/* ---------- 설비(머신) 생성 ---------- */
const machines=[],byId={},pickables=[];
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function label(main,sub,{w=512,h=128,size=46,border='#38bdf8',scale=6,bg='rgba(12,19,27,.86)'}={}){
  // 글자 폭을 먼저 재서 캔버스 폭을 늘림 (긴 공정명이 잘리지 않도록). 세로 크기는 유지, 가로만 비례 확장
  const m=document.createElement('canvas').getContext('2d');m.font=`700 ${size}px ${F}`;let tw=m.measureText(main).width;
  if(sub){m.font=`500 ${size*.55}px ${F}`;tw=Math.max(tw,m.measureText(sub).width);}
  const w0=w;w=Math.max(w,Math.ceil(tw+size*1.4));scale*=w/w0;
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  rr(g,4,4,w-8,h-8,22);g.fillStyle=bg;g.fill();g.lineWidth=4;g.strokeStyle=border;g.stroke();
  g.textAlign='center';g.textBaseline='middle';
  if(sub){g.font=`700 ${size}px ${F}`;g.fillStyle='#e2e8f0';g.fillText(main,w/2,h*.4);g.font=`500 ${size*.55}px ${F}`;g.fillStyle='#8aa0b6';g.fillText(sub,w/2,h*.74);}
  else{g.font=`700 ${size}px ${F}`;g.fillStyle='#e2e8f0';g.fillText(main,w/2,h/2+2);}
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;t.encoding=THREE.sRGBEncoding;textures.push(t);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));
  s.scale.set(scale,scale*h/w,1);s.renderOrder=10;return s;
}
const VER_TAG={assumed:' · 확인 필요',user:' · 사용자 확인'};
function compose(g,st,body){let x=-st.w/2;const res={h:0};for(const [t,w] of st.parts){const sub=new THREE.Group();sub.position.x=x+w/2;g.add(sub);const r=BUILD[t](sub,w,body)||{h:3};res.h=Math.max(res.h,r.h);if(r.spin&&!res.spin){res.spin=r.spin;res.spinAxis=r.spinAxis;}if(r.glow)res.glow=r.glow;if(r.anim)res.anim=r.anim;x+=w+.4;}return res;}
LAYOUT.stations.forEach((st,i)=>{
  const L=lineById[st.line];
  const m={id:st.id,code:`${L.name}-${st.k}-01`,line:L,st,idx:i,x:st.x,z:st.z,sv:st.sv,pv:st.sv,status:'run'};
  const zcol=new THREE.Color((ZONES.find(z=>z.id===st.zone)||{color:'#94a3b8'}).color);
  const g=new THREE.Group(),body=std(new THREE.Color(0xc9d1d9).lerp(zcol,.8).getHex(),.25,.45);
  const r=st.parts?compose(g,st,body):((BUILD[st.type]||BUILD.cooler)(g,st.w,body)||{h:3});
  m.body=body;m.baseColor=body.color.clone();
  const pad=add(g,gPlane(st.w+.8,4.4),new THREE.MeshBasicMaterial({color:zcol,transparent:true,opacity:.42,depthWrite:false}),0,.035,0,false);pad.rotation.x=-Math.PI/2;
  for(const z of [-2.2,2.2])B(g,st.w+.8,.04,.12,std(zcol.getHex(),.2,.4,{emissive:zcol.getHex(),emissiveIntensity:.5}),0,.05,z,false);
  m.h=r.h;m.spin=r.spin;m.spinAxis=r.spinAxis;m.glow=r.glow;m.anim=r.anim;
  g.traverse(o=>{if(o.isMesh)o.userData.mid=m.id;});
  const tx=st.w/2+.1,tz=2.0,top=Math.min(r.h,3.4)+.3;
  C(g,.04,.04,top,MAT.dark,tx,top/2,tz,6);m.andon={};
  [['down',0xef4444],['idle',0xf59e0b],['run',0x22c55e],['maint',0x60a5fa]].forEach(([k,c],j)=>{
    const mt=std(0x1a1f26,0,.4,{emissive:c,emissiveIntensity:0,transparent:true,opacity:.95});
    const s=C(g,.15,.15,.24,mt,tx,top+.14+j*.26,tz,14,false);s.userData.mid=m.id;m.andon[k]={mt,c};
  });
  const title=st.no?`${String(st.no).padStart(2,'0')} · ${st.ko}`:st.ko;
  m.lbl=label(title,`${m.code}${VER_TAG[st.verified]||''}`,{scale:5.4,size:52,border:st.pack?'#22c55e':st.inspection?'#f59e0b':'#2b3d50'});
  m.lbl.position.set(0,r.h+1.9,0);g.add(m.lbl);
  g.position.set(m.x,0,m.z);scene.add(g);m.group=g;
  g.traverse(o=>{if(o.isMesh&&o.userData.mid)pickables.push(o);});
  machines.push(m);byId[m.id]=m;L.machines.push(m);
});

/* ---------- 건물 · 구역 · 환경 ---------- */
B(scene,1200,.2,1200,std(0x0d1319,0,1),0,-.16,0,false);
B(scene,LAYOUT.total+2,.1,HALF_D*2+2,std(0x2a333c,.05,.85,{envMapIntensity:.08}),(XMIN+XMAX)/2,-.05,0,false);
function floorPlane(x1,x2,z1,z2,mat,y=.012){const p=add(scene,gPlane(x2-x1,z2-z1),mat,(x1+x2)/2,y,(z1+z2)/2,false);p.rotation.x=-Math.PI/2;return p;}
const tint=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false});
const zoneById=Object.fromEntries(LAYOUT.zones.map(z=>[z.id,z]));
LAYOUT.zones.forEach(z=>floorPlane(z.x1,z.x2,-HALF_D,HALF_D,tint(z.color,z.id==='PACK2'?.34:.26),.01));
const diamondMat=std(0xffffff,.55,.45,{map:diamondTex});
['RAW','SOAK','DOUGH'].forEach(id=>floorPlane(zoneById[id].x1+(id==='RAW'?15:.4),zoneById[id].x2-.4,-3.6,3.6,diamondMat,.02));
const WALK=[-5.6,5.6,-HALF_D+2.6,HALF_D-2.6];
WALK.forEach(z=>{floorPlane(XMIN+1,XMAX-1,z-1.1,z+1.1,tint(0x16a34a,.32),.025);for(const d of [-1.1,1.1])floorPlane(XMIN+1,XMAX-1,z+d-.05,z+d+.05,tint(0xfacc15,.6),.03);});
const wallMat=std(0xe3e8ec,.1,.6,{transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
const roomMat=std(0xd8f3e8,.1,.6,{transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide});
const wallCap=std(0x52708f,.3,.6);
function wall(x,z,w,d,h=7,mat=wallMat){add(scene,gBox(w,h,d),mat,x,h/2,z,false);B(scene,w,.2,d+.05,wallCap,x,h,z,false);}
const cx=(XMIN+XMAX)/2;
wall(cx,-HALF_D,LAYOUT.total,.3);wall(cx,HALF_D,LAYOUT.total,.3);wall(XMIN,0,.3,HALF_D*2);wall(XMAX,0,.3,HALF_D*2);
// 구역 칸막이 · 통로 문 · 컨베이어 개구부의 노란 PVC 스트립 커튼 (#11, #18). 최종 포장실은 별도 방(진한 벽)
['RAW','SOAK','DOUGH','DRY1','SEMI','FRY','PACK1','PACK2'].forEach(id=>{
  const x=zoneById[id].x2,lanes=id==='FRY'?LAYOUT.packZ:[LAYOUT.mainZ],room=id==='PACK1'||id==='PACK2',h=room?6.5:5.5;
  const open=[...lanes.map(z=>[z-1.6,z+1.6]),...[-5.6,5.6].map(z=>[z-1.2,z+1.2])].sort((p,q)=>p[0]-q[0]);
  const seg=(a,c)=>{if(c-a<.1)return;if(!room){wall(x,(a+c)/2,.2,c-a,h);return;}const zc=(a+c)/2,len=c-a;
    B(scene,.16,1.05,len,std(0xe9eef1,.1,.6),x,.525,zc,false);add(scene,gBox(.05,h-1.05,len),MAT.glass,x,1.05+(h-1.05)/2,zc,false);
    for(let z=a;z<=c+.01;z+=1.6)B(scene,.09,h,.09,MAT.white,x,h/2,Math.min(z,c),false);B(scene,.14,.1,len,MAT.white,x,1.08,zc,false);};
  let z0=-HALF_D;open.forEach(([a,c])=>{seg(z0,a);z0=Math.max(z0,c);});seg(z0,HALF_D);
  B(scene,.25,.25,HALF_D*2,wallCap,x,h,0,false);
  lanes.forEach(lz=>{for(let s=-1.5;s<=1.5;s+=.3)add(scene,gBox(.02,4.2,.26),MAT.curtain,x,2.45,lz+s,false);});
});
for(let x=XMIN;x<=XMAX+.1;x+=LAYOUT.total/12)for(const z of [-HALF_D,HALF_D])B(scene,.7,7.4,.7,wallCap,x,3.7,z);

// 원료 포대 적치 (청록색 50kg PP 포대 · 청색 플라스틱 팔레트)
{const raw=zoneById.RAW,bagIM=new THREE.InstancedMesh(sackGeometry(),MAT.bag,420);bagIM.castShadow=bagIM.receiveShadow=true;const d=new THREE.Object3D();let n=0;
 for(let r=0;r<2;r++)for(let c=0;c<6;c++){const px=raw.x1+2.5+r*3.6,pz=-HALF_D+3.6+c*5.6;if(Math.abs(pz)<2.4)continue;pallet(scene,px,0,pz,1.3,1.3);
  const layers=4+((r+c)%3);for(let l=0;l<layers&&n<420;l++)for(let k=0;k<2;k++){const cross=l%2;
   d.position.set(px+(cross?(k-.5)*.62:0),.33+l*.27,pz+(cross?0:(k-.5)*.62));d.rotation.set((Math.random()-.5)*.06,(cross?Math.PI/2:0)+(Math.random()-.5)*.14,(Math.random()-.5)*.05);d.updateMatrix();bagIM.setMatrixAt(n++,d.matrix);}}
 bagIM.count=n;scene.add(bagIM);person(scene,raw.x1+10,1.9,-Math.PI/2);}
for(let i=0;i<3;i++)B(scene,1.4,.9+i*.2,1.1,MAT.carton,zoneById.PACK2.x1+2+i*1.6,(.9+i*.2)/2,-HALF_D+1.4);   // 카톤 원지 적치 (#5)
// 완제품 창고: 랙 + 카톤 팔레트 + 도크 도어 + 지게차
{const fg=zoneById.FG,beam=std(0xf97316,.3,.5),up=std(0x2563eb,.3,.5),cIM=new THREE.InstancedMesh(gBox(1.1,1.0,1.0),MAT.brandBox,240);cIM.castShadow=cIM.receiveShadow=true;const d=new THREE.Object3D();let n=0;
 for(let r=0;r<3;r++){const z=-13+r*13;for(const side of [-1.5,1.5])for(let x=fg.x1+2;x<=fg.x2-6;x+=3.4){[0,2.2,4.4].forEach(y=>{B(scene,3.3,.12,2.4,beam,x+1.7,y+.1,z+side,false);if(n<240&&(Math.round(x*7+y*3)+r)%5>0){B(scene,1.2,.14,1.0,MAT.blackPallet,x+1.0,y+.25,z+side,false);d.position.set(x+1.0,y+.82,z+side);d.updateMatrix();cIM.setMatrixAt(n++,d.matrix);}});for(const dz of [-1.1,1.1])B(scene,.12,6.6,.12,up,x,3.3,z+side+dz,false);}}
 cIM.count=n;scene.add(cIM);
 const shutMat=std(0xffffff,.5,.45,{map:shutterTex});
 LAYOUT.packZ.forEach(z=>{const dz=z+6;add(scene,gBox(.1,4.4,3.8),shutMat,XMAX-.22,2.2,dz,false);B(scene,.4,.35,4.0,MAT.ssDark,XMAX-.3,4.55,dz,false);B(scene,1.8,.25,3.2,MAT.dark,XMAX-1.2,.12,dz,false);
   for(const s of [-1.3,1.3]){pallet(scene,XMAX-4.2,0,dz+s,1.2,1.0,MAT.blackPallet);const im=new THREE.InstancedMesh(gBox(.58,.4,.47),MAT.brandBox,24);im.castShadow=im.receiveShadow=true;const d=new THREE.Object3D();let n=0;
     for(let l=0;l<6;l++)for(let i=0;i<2;i++)for(let j=0;j<2;j++){d.position.set(XMAX-4.2-.3+i*.6,.36+l*.41,dz+s-.24+j*.48);d.updateMatrix();im.setMatrixAt(n++,d.matrix);}scene.add(im);}});
 const fx=fg.x1+3.5,fz=6.5;B(scene,1.6,.9,1.0,MAT.yellow,fx,.75,fz);B(scene,.8,.7,1.0,MAT.dark,fx+.2,1.55,fz);for(const z of [-.4,.4])B(scene,.08,2.6,.08,MAT.dark,fx+.9,1.3,fz+z);for(const z of [-.25,.25])B(scene,1.0,.05,.12,MAT.ssDark,fx+1.45,.12,fz+z);
 for(const x of [fx-.5,fx+.5])for(const z of [-.45,.45])CZ(scene,.22,.18,MAT.dark,x,.22,fz+z,12);}

// 최종 포장실 냉풍기 (#63 주황/회색 대형 이동식 냉풍기)
function evapCooler(x,z,ry){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);B(g,1.3,1.5,1.0,std(0x8d969e,.2,.55),0,.95,0);B(g,1.2,.9,.06,std(0xf26b1d,.1,.5),0,1.3,.52);for(let i=0;i<6;i++)B(g,1.05,.04,.08,MAT.dark,0,.95+i*.14,.56);for(const x2 of [-.5,.5])for(const z2 of [-.4,.4])CZ(g,.08,.06,MAT.dark,x2,.1,z2,10);}
{const qx=FN.QC.x;evapCooler(qx-1,-HALF_D+4.6,0);evapCooler(qx+5,HALF_D-4.6,Math.PI);}

/* ---------- 라인 연결부 (벨트 · 배관 · 슈트 · 국가별 분기) ---------- */
{const g=new THREE.Group();g.position.z=LAYOUT.mainZ;scene.add(g);
  [['EX','WC'],['RL','CT'],['CT','D1'],['D1','M1'],['M1','SP']].forEach(([a,b])=>{const x1=S[a].x1-.05,x2=S[b].x0+.05;
    if(x2-x1>.05)belt(g,x1,BH,x2,BH,a==='CT'||a==='D1'?1.0:.85,{mat:a==='CT'?MAT.modular:a==='D1'||a==='M1'?MAT.mesh:MAT.belt});});
  slab(g,S.RI.x1-.2,3.3,S.WS.x0+.8,1.9,.8,.06,MAT.ss);                                 // 투입 → 세미 슈트
  pipeRun(g,[[S.WS.x1+1.4,5.4,.2],[S.SK.x0+.4,5.4,.2],[S.SK.x0+.4,5.8,.2]],.12);        // 세미 → 침지 분배 배관
  belt(g,S.SK.x1-.05,BH,S.ST.x0+.8,3.0,.9);                                             // 침지 합류 → 증숙 (탈수 없음)
  slab(g,S.WC.x1-.2,2.4,S.RL.x0+1.25,2.85,.7,.05,MAT.ss);                               // 냉각수조 → 압연 호퍼
  belt(g,S.CT.x0+1.25,1.55,S.RL.x0+1.35,2.8,.8,{mat:MAT.mesh,z:-.02});                 // 스크랩 회수 벨트
  slab(g,S.D2.x1+.2,2.7,S.PH.x0+.65,3.95,.7,.05,MAT.ss);                                // SA8 배출 → 예열 호퍼
  slab(g,S.PH.x1-.4,2.1,S.OV.x0+.55,BH+.42,.7,.05,MAT.ss);                             // 예열 → 유탕 슈트
  slab(g,S.OV.x1,1.75,S.SN.x0+.8,2.05,.7,.05,MAT.ss);                                   // 유탕 → 조미 슈트
  slab(g,S.SN.x1-.4,1.35,S.CL.x0+.15,BH+.05,.7,.05,MAT.ss);                            // 조미 → 냉각 슈트
  belt(g,S.CL.x1-.05,BH,BX+.55,BH,.9);                                                  // 완제품 → 분기점
  person(g,S.CT.x0+2.6,2.5,Math.PI);}
// 국가별 분기 컨베이어 (z 방향)
const ZMIN=Math.min(...LAYOUT.packZ),ZMAX=Math.max(...LAYOUT.packZ);
{const gb=new THREE.Group();gb.position.set(BX,0,0);gb.rotation.y=-Math.PI/2;scene.add(gb);belt(gb,ZMIN-.6,BH,ZMAX+.6,BH,1.0,{mat:MAT.modular});
 LAYOUT.packZ.forEach(z=>{B(scene,.9,.35,.12,MAT.yellow,BX+.2,BH+.3,z-.55);});
 const sign=label('완제품 → 국가별 포장 분기','Distribution by market',{scale:7,size:44,border:'#ec4899'});sign.position.set(BX,5.2,ZMIN-3.2);scene.add(sign);}
// 국가별 소포장 A·B·C → 합류 컨베이어 → 최종 포장 라인 1개 (묶음 외포장부터)
PACK_LINES.forEach(L=>{const st=PK[L.id],z=lineById[L.id].z,g=new THREE.Group();g.position.z=z;scene.add(g);
  belt(g,BX+.4,BH,st.WP.x0+.05,BH,.85,{mat:MAT.greenBelt});belt(g,st.WP.x1-.05,BH,MX+.5,BH,.85,{mat:MAT.greenBelt});});
{const gm=new THREE.Group();gm.position.set(MX,0,0);gm.rotation.y=-Math.PI/2;scene.add(gm);belt(gm,ZMIN-.6,BH,ZMAX+.6,BH,1.0,{mat:MAT.greenBelt});
 const sign=label('소포장 A·B·C 합류 → 최종 포장 라인','Merge into one final line',{scale:7,size:44,border:'#10b981'});sign.position.set(MX,5.2,ZMIN-3.2);scene.add(sign);
 const g=new THREE.Group();g.position.z=LAYOUT.mainZ;scene.add(g);belt(g,MX+.4,BH,FN.OP.x0+.05,BH,.95,{mat:MAT.greenBelt});
 [['OP','QC'],['QC','CP']].forEach(([a,b])=>belt(g,FN[a].x1-.05,BH,FN[b].x0+.05,BH,.95,{mat:MAT.greenBelt}));
 belt(g,FN.CP.x1-.05,BH,FN.PL.x0+.05,BH,.95,{z:-1.2});                                     // 박스 → 로봇 팔레타이저
 person(g,FN.OP.x0+.6,-2.2,0);}

/* ---------- 제품 흐름 (단계별 형상·색상, 3D 경로) ---------- */
function makePath(pts){pts=pts.map(p=>p.length===2?[p[0],p[1],LAYOUT.mainZ]:p);const seg=[];let len=0;
  for(let i=0;i<pts.length-1;i++){const [x1,y1,z1]=pts[i],[x2,y2,z2]=pts[i+1],dx=x2-x1,dy=y2-y1,dz=z2-z1,l=Math.hypot(dx,dy,dz);if(l<1e-6)continue;
    seg.push({x1,y1,z1,dx,dy,dz,l,s:len,yaw:Math.atan2(-dz,dx),pitch:Math.atan2(dy,Math.hypot(dx,dz))});len+=l;}return {seg,len};}
function at(path,s){s=((s%path.len)+path.len)%path.len;let k=path.seg.length-1;for(let i=0;i<path.seg.length;i++){if(s<=path.seg[i].s+path.seg[i].l){k=i;break;}}const q=path.seg[k],t=(s-q.s)/q.l;return [q.x1+q.dx*t,q.y1+q.dy*t,q.z1+q.dz*t,q.yaw,q.pitch];}
const P={dough:std(0xf2ede1,0,.45),raw:std(0xfbf8ef,0,.5,{emissive:0x222018,emissiveIntensity:.3}),dried:std(0xf1d58c,0,.55,{emissive:0x3a2c08,emissiveIntensity:.2}),
  golden:std(0xf0a830,0,.4,{emissive:0x6a3a00,emissiveIntensity:.45}),seasoned:std(0xd2561e,0,.55,{emissive:0x4a1500,emissiveIntensity:.3}),inner:std(0xffffff,.25,.32,{map:innerBagTex,emissive:0x220000,emissiveIntensity:.2}),outer:std(0xffffff,.25,.28,{map:outerBagTex,emissive:0x221500,emissiveIntensity:.2,side:THREE.DoubleSide}),carton:MAT.brandBox,
  net:std(0xffffff,0,.5,{map:netTex,transparent:true,alphaTest:.4,side:THREE.DoubleSide})};
// 필로우 봉지: 가운데는 불룩하고 양 끝 실링부는 납작하게 눌린 형태
function pillowGeometry(w,h,d){const g=new THREE.BoxGeometry(w,h,d,16,4,10),pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),u=Math.abs(2*x/w),v=Math.abs(2*z/d);
    const puff=Math.max(.08,(1-Math.pow(u,6))*(1-Math.pow(v,4)*.55));pos.setY(i,y*puff);pos.setZ(i,z*(1-Math.pow(u,8)*.06));}
  g.computeVertexNormals();return g;}
const geos={rice:heapGeometry(11).scale(.4,.22,.4),rope:new THREE.CylinderGeometry(.14,.14,.4,12).rotateZ(Math.PI/2),sheet:new THREE.BoxGeometry(.52,.06,1.05),
  disc:new THREE.CylinderGeometry(.24,.24,.07,26),net:new THREE.PlaneGeometry(.5,.8).rotateX(-Math.PI/2),inner:pillowGeometry(.4,.12,.26),
  outer:pillowGeometry(.78,.26,.52),carton:new THREE.BoxGeometry(.62,.44,.5)};
const STAGES=[
  {n:26, geo:geos.rice, mat:MAT.riceHeap,pts:[[S.RI.x0+2.7,BH+.04],[S.RI.x1-.25,3.33]],orient:true,jitter:.12},
  {n:46, geo:geos.rice, mat:MAT.riceHeap,pts:[[S.SK.x0+.5,BH+.04],[S.SK.x1,BH+.04],[S.ST.x0+.8,3.04]],orient:true,jitter:.16},   // 10조에서 합쳐진 불린 쌀
  {n:110,geo:geos.rope, mat:P.dough,pts:[[S.EX.x0+2.75,BH+.12],[S.WC.x0+.35,BH+.12],[S.WC.x0+1.0,1.02],[S.WC.x1-1.65,1.02],[S.WC.x1-.25,2.47],[S.RL.x0+1.25,2.9]],orient:true},
  {n:28, geo:geos.sheet,mat:P.dough,pts:[[S.RL.x0+2.6,BH+.07],[S.CT.x0+1.6,BH+.07]]},
  {n:200,geo:geos.disc, mat:P.raw,  pts:[[S.CT.x0+1.95,BH+.085],[S.D1.x0+.5,BH+.085]],rows:3},
  {n:16, geo:geos.net,  mat:P.net,  pts:[[S.CT.x0+1.3,1.64],[S.RL.x0+1.35,2.89]],orient:true},
  {n:150,geo:geos.disc, mat:P.dried,pts:[[S.D1.x1-.4,BH+.08],[S.SP.x0+.25,BH+.08]],rows:3},
  {n:44, geo:geos.disc, mat:P.dried,pts:[[S.D2.x1-1.45,.98],[S.D2.x1+.15,2.78]],rows:3,orient:true},
  {n:70, geo:geos.disc, mat:P.dried,pts:[[S.PH.x1-.35,2.15],[S.OV.x0+.55,BH+.48],[S.OV.x0+1.6,1.6]],rows:3,orient:true},
  {n:150,geo:geos.disc, mat:P.golden,pts:[[S.OV.x0+1.6,1.6],[S.OV.x1-1.4,1.6],[S.OV.x1,1.83],[S.SN.x0+.8,2.12]],rows:3,orient:true},
  {n:150,geo:geos.disc, mat:P.seasoned,pts:[[S.SN.x1-.4,1.42],[S.CL.x0+.15,BH+.09],[S.CL.x1,BH+.09],[BX,BH+.09]],rows:3,orient:true},
  ...PACK_LINES.flatMap(L=>{const st=PK[L.id],z=lineById[L.id].z;return [
    {line:L.id,n:60,geo:geos.disc,mat:P.seasoned,pts:[[BX,BH+.09,0],[BX,BH+.09,z],[st.WP.x0+2.2,BH+.09,z]],rows:3,orient:true},
    {line:L.id,n:Math.round((Math.abs(z)+MX-st.WP.x1+3.8)/.75),geo:geos.inner,mat:P.inner,pts:[[st.WP.x1-1.4,BH+.08,z],[MX,BH+.08,z],[MX,BH+.08,LAYOUT.mainZ],[FN.OP.x0+2.2,BH+.08,LAYOUT.mainZ]]}];}),   // 개별 소포장 → 합류
  {line:'FIN',n:16,geo:geos.outer,mat:P.outer,pts:[[FN.OP.x1-1.5,BH+.13],[FN.CP.x0+6.4,BH+.13]]},              // 묶음 외포장 → 중량·금속 → 입상
  {line:'FIN',n:8, geo:geos.carton,mat:P.carton,pts:[[FN.CP.x0+5.6,BH+.27,-1.2],[FN.PL.x0+2.5,BH+.27,-1.2]]},  // 박스 → 로봇
].map(s=>{const path=makePath(s.pts),o={line:'BASE',...s,path};
  if(s.geo===geos.disc){o.rows=2;o.lane=.52;const rows=2,gap=.78;o.n=Math.max(rows,Math.round(path.len/gap)*rows);   // 원형 생지 간격 0.62m — 하나하나 보이게
    const rim=s.mat.clone();rim.color.multiplyScalar(.55);rim.emissiveIntensity=0;o.mat=[rim,s.mat,s.mat];}
  return o;});
const FLOWS=STAGES.map(stg=>{const im=new THREE.InstancedMesh(stg.geo,stg.mat,stg.n);im.castShadow=true;im.frustumCulled=false;scene.add(im);
  const off=Array.from({length:stg.n},(_,i)=>[stg.rows?((i%stg.rows)-(stg.rows-1)/2)*(stg.lane||.3)+(stg.lane?(Math.floor(i/stg.rows)%2)*.12:0)+(Math.random()-.5)*.03:stg.jitter?(Math.random()-.5)*2*stg.jitter:0,Math.random()*6]);
  return {stg,im,off};});

/* ---------- 흐름 방향 화살표 띠 (바닥, 흐름 속도로 이동 · 정지 시 빨강) ---------- */
const arrowTex=canvasTex(128,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#ffffff';g.beginPath();g.moveTo(20,8);g.lineTo(70,32);g.lineTo(20,56);g.lineTo(42,32);g.closePath();g.fill();g.globalAlpha=.55;g.beginPath();g.moveTo(74,8);g.lineTo(124,32);g.lineTo(74,56);g.lineTo(96,32);g.closePath();g.fill();});
arrowTex.encoding=THREE.LinearEncoding;
const ARROW_TILE=3.0,strips=[];
function arrowStrip(x1,z1,x2,z2,line){const len=Math.hypot(x2-x1,z2-z1);if(len<1)return;const t=arrowTex.clone();t.needsUpdate=true;t.wrapS=THREE.RepeatWrapping;t.repeat.set(len/ARROW_TILE,1);textures.push(t);
  const mat=new THREE.MeshBasicMaterial({map:t,color:0x38e8ff,transparent:true,opacity:1,depthWrite:false,toneMapped:false});
  const g=new THREE.Group();g.position.set((x1+x2)/2,.06,(z1+z2)/2);g.rotation.y=Math.atan2(-(z2-z1),x2-x1);scene.add(g);
  const p=add(g,new THREE.PlaneGeometry(len,1.5),mat,0,0,0,false);p.rotation.x=-Math.PI/2;p.renderOrder=3;strips.push({t,mat,line});}
arrowStrip(S.RI.x0,LAYOUT.mainZ+3.2,BX-1.4,LAYOUT.mainZ+3.2,'BASE');
arrowStrip(BX+1.7,1,BX+1.7,ZMAX-1.2,'BASE');arrowStrip(BX+1.7,-1,BX+1.7,ZMIN+1.2,'BASE');
PACK_LINES.forEach(L=>{const z=lineById[L.id].z;arrowStrip(BX+2.8,z+(z?3.2:-3.2),MX-1.2,z+(z?3.2:-3.2),L.id);});
arrowStrip(MX-1.5,ZMIN+1,MX-1.5,-1.2,'FIN');arrowStrip(MX-1.5,ZMAX-1,MX-1.5,1.2,'FIN');arrowStrip(MX+1.2,3.2,FN.PL.x1,3.2,'FIN');

/* ---------- 라벨 ---------- */
const lineLabels=[];
{const ll=label('베이스 라인','10개 공정 · 공통 쌀과자 베이스',{scale:12,size:52,border:'#38bdf8'});ll.position.set(S.RI.x0-1.5,7.6,LAYOUT.mainZ-3.5);scene.add(ll);lineLabels.push(ll);}
PACK_LINES.forEach(L=>{const ll=label(L.name,L.market,{scale:8,size:52,border:'#ec4899'});ll.position.set(BX+5,6.2,lineById[L.id].z-3.4);scene.add(ll);lineLabels.push(ll);});
{const ll=label('최종 포장 라인','묶음 외포장 → 중량·금속 → 박스 → 로봇',{scale:10,size:52,border:'#10b981'});ll.position.set(FN.OP.x0+2,7.2,-4.2);scene.add(ll);lineLabels.push(ll);}
LAYOUT.zones.forEach(z=>{const s=label(z.ko,z.en,{scale:z.x2-z.x1<16?11:15,size:46,border:z.color});s.position.set((z.x1+z.x2)/2,15,-HALF_D+3);scene.add(s);lineLabels.push(s);});

/* ---------- 선택 프레임 ---------- */
const selMat=new THREE.MeshBasicMaterial({color:0x38bdf8,transparent:true,opacity:.9});
const selFrame=new THREE.Group();scene.add(selFrame);selFrame.visible=false;
function showFrame(m){selFrame.children.forEach(c=>c.geometry.dispose());selFrame.clear();const w=m.st.w+1.4,d=5.2,t=.18;
  [[w,t,0,-d/2],[w,t,0,d/2],[t,d,-w/2,0],[t,d,w/2,0]].forEach(([a,b,x,z])=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(a,b),selMat);p.rotation.x=-Math.PI/2;p.position.set(x,.05,z);selFrame.add(p);});
  selFrame.position.set(m.x,0,m.z);selFrame.visible=true;}

/* ---------- 카메라 프리셋 ---------- */
const zc=id=>(zoneById[id].x1+zoneById[id].x2)/2;
const mainMid=(S.RI.x0+S.CL.x1)/2,packMid=(zoneById.PACK1.x1+zoneById.PACK2.x2)/2,rawMid=(zoneById.RAW.x1+15+zoneById.SOAK.x2)/2;
function cameraPreset(key){
  const fit=LAYOUT.total/(2*Math.tan(THREE.MathUtils.degToRad(20))*Math.max(.5,camera.aspect))*.92,d=Math.max(95,fit);
  const P={overview:[cx-8,d*.36,d*.58,cx,0,4],top:[cx,d*1.15,.1,cx,0,0],
    raw:[rawMid+8,30,44,rawMid,2,0],wet:[zc('DOUGH')+8,24,40,zc('DOUGH')-2,2,0],
    semi:[SB.SP.x+8,24,40,SB.SP.x-3,1,0],fry:[zc('FRY')+6,28,44,zc('FRY')-2,2,0],fg:[packMid+6,44,56,packMid,1,0]};
  return P[key]||P.overview;
}

/* ---------- 데이터 집계 창 (3D 위 HTML, 설비 위치 추적) ---------- */
const calloutLayer=document.createElement('div');calloutLayer.className='callout-layer';host.appendChild(calloutLayer);
const callEls=new Map(),projV=new THREE.Vector3();
const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function updateCallouts(list,distance){
  const W=host.clientWidth,H=host.clientHeight,seen=new Set();
  for(const c of list||[]){const m=byId[c.id];if(!m)continue;seen.add(c.id);let el=callEls.get(c.id);
    if(!el){el=document.createElement('button');el.type='button';el.className='callout';el._html='';el.addEventListener('click',()=>bridge.current.onSelect(c.id));calloutLayer.appendChild(el);callEls.set(c.id,el);}
    const html=`<b>${esc(c.title)}</b>`+c.rows.map(([k,v,cls])=>`<span class="${cls||''}"><i>${esc(k)}</i><em>${esc(v)}</em></span>`).join('');
    if(el._html!==html){el.innerHTML=html;el._html=html;}
    projV.set(m.x+(c.dx||0),m.h+.4,m.z);projV.project(camera);
    const vis=projV.z<1&&Math.abs(projV.x)<1.02&&Math.abs(projV.y)<1.02;el.style.display=vis?'':'none';if(!vis)continue;
    el.style.transform=`translate(${((projV.x*.5+.5)*W).toFixed(1)}px,${((-projV.y*.5+.5)*H).toFixed(1)}px)`;
    el.classList.toggle('compact',distance>105);el.classList.toggle('alert',!!c.alert);el.style.zIndex=String(1000-Math.round(projV.z*900));}
  for(const [id,el] of callEls)if(!seen.has(id)){el.remove();callEls.delete(id);}
  return seen;
}

/* ---------- 상호작용 ---------- */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
let start=null,frame=0,disposed=false,selected=null,hover=null,fly=null,focusKey=null;
const tip=document.createElement('div');tip.className='machine-tooltip';tip.hidden=true;host.appendChild(tip);
function flyTo(v){fly={position:new THREE.Vector3(v[0],v[1],v[2]),target:new THREE.Vector3(v[3],v[4],v[5])};}
controls.addEventListener('start',()=>{fly=null;});
function hit(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const h=ray.intersectObjects(pickables,false)[0];return h?byId[h.object.userData.mid]:null;}
renderer.domElement.addEventListener('pointerdown',e=>{start=e.button===0?{x:e.clientX,y:e.clientY}:null;});
renderer.domElement.addEventListener('pointerup',e=>{if(e.button===0&&start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<5){const m=hit(e);if(m)bridge.current.onSelect(m.id);}start=null;});
renderer.domElement.addEventListener('pointermove',e=>{hover=hit(e);renderer.domElement.style.cursor=hover?'pointer':'grab';tip.hidden=!hover;if(!hover)return;
  const r=host.getBoundingClientRect(),m=hover;tip.textContent=`${m.code} · ${m.st.ko}  |  ${m.st.tlabel} ${m.pv.toFixed(1)} / ${m.sv} °C`;
  tip.style.left=Math.max(8,Math.min(r.width-300,e.clientX-r.left+14))+'px';tip.style.top=Math.max(8,Math.min(r.height-50,e.clientY-r.top+14))+'px';});
renderer.domElement.addEventListener('pointerleave',()=>{hover=null;tip.hidden=true;});
renderer.domElement.addEventListener('pointercancel',()=>{start=null;hover=null;tip.hidden=true;});
const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(!bridge.current.selected&&!bridge.current.line)flyTo(cameraPreset(bridge.current.camera));};
const observer=new ResizeObserver(resize);observer.observe(host);resize();

const lineFactor=L=>{const s=L.machines.map(m=>m.status);return s.includes('down')||s.includes('maint')?0:s.includes('idle')?.35:1;};
const dummy=new THREE.Object3D();dummy.rotation.order='YZX';
const RED=new THREE.Color(0xef4444),GREEN=new THREE.Color(0x22c55e),HOVER=new THREE.Color(0x0b2a3a),SEL=new THREE.Color(0x0e3a55);
let previous=performance.now();
function loop(now){if(disposed)return;frame=requestAnimationFrame(loop);const dt=Math.max(0,Math.min(.05,(now-previous)/1000));previous=now;
  const b=bridge.current,t=now/1000,blink=.5+.5*Math.sin(t*7);
  const nextFocus=JSON.stringify([b.camera,b.line,b.selected,b.focusRevision]);
  if(nextFocus!==focusKey){focusKey=nextFocus;selected=b.selected;tip.hidden=true;
    if(byId[selected]){const m=byId[selected];showFrame(m);const k=Math.max(6,m.st.w)*.9;flyTo([m.x+k*.6,3+m.h*.8+k*.35,m.z+k*1.2,m.x,1.6,m.z]);}
    else{selFrame.visible=false;const L=lineById[b.line];
      if(L&&L.id==='BASE')flyTo([mainMid-10,80,95,mainMid,1,0]);else if(L)flyTo([packMid+4,32,L.z+38,packMid,1,L.z]);else flyTo(cameraPreset(b.camera));}}
  if(fly){const k=1-Math.pow(.015,dt);camera.position.lerp(fly.position,k);controls.target.lerp(fly.target,k);if(camera.position.distanceTo(fly.position)<.15&&controls.target.distanceTo(fly.target)<.15)fly=null;}
  controls.autoRotate=b.rotate&&!fly;controls.update();
  const distance=camera.position.distanceTo(controls.target);
  const shown=updateCallouts(b.callouts,distance);
  const incoming=new Map((b.machines||[]).map(x=>[x.id,x]));
  machines.forEach(m=>{const inc=incoming.get(m.id);if(inc){m.status=inc.status;m.pv=inc.pv;m.metrics=equipmentMetrics(inc);}
    if(b.mode==='temp')m.body.color.copy(Math.abs(m.pv-m.sv)>Math.max(2,m.sv*.04)?RED:GREEN);
    else if(b.mode==='oee')m.body.color.copy(RED).lerp(GREEN,Math.max(0,Math.min(1,((m.metrics?.oee||0)-.5)/.45)));
    else m.body.color.copy(m.baseColor);
    m.body.emissive.setRGB(0,0,0);if(m.status==='down')m.body.emissive.setRGB(.35*blink,0,0);
    if(hover===m)m.body.emissive.add(HOVER);if(selected===m.id)m.body.emissive.add(SEL);
    m.lbl.visible=b.labels&&!shown.has(m.id)&&(distance<120||selected===m.id||(b.line===m.line.id&&distance<180));
    Object.entries(m.andon).forEach(([k,a])=>{const on=k===m.status;a.mt.color.set(on?a.c:0x1a1f26);a.mt.emissiveIntensity=on?(k==='down'?.4+1.8*blink:1.6):0;});
    if(m.spin&&m.status==='run')m.spin.rotation[m.spinAxis==='x'?'x':'y']+=dt*1.6;
    if(m.anim)m.anim(t,m.status==='run');
    if(m.glow)m.glow.emissiveIntensity=m.status==='down'||m.status==='maint'?.1:1.1+.25*Math.sin(t*3+m.z);
  });
  lineLabels.forEach(x=>x.visible=b.labels);selMat.opacity=.55+.4*blink;
  LINES.forEach(L=>{L.f=lineFactor(L);});PACK_LINES.forEach(p=>{const L=lineById[p.id];L.f=Math.min(L.f,lineById.FIN.f);});   // 최종 라인 정지 시 소포장도 정지
  LINES.forEach(L=>{L.flow+=dt*.9*L.f;});
  strips.forEach(s=>{const L=lineById[s.line];s.t.offset.x=-L.flow/ARROW_TILE;s.mat.color.set(L.f===0?0xff4d4d:L.f<1?0xffc23d:0x38e8ff);s.mat.opacity=b.flow?(L.f===0?.6+.4*blink:1):0;});
  FLOWS.forEach(({stg,im,off})=>{im.visible=b.flow;if(!b.flow)return;const L=lineById[stg.line],rows=stg.rows||1,n=stg.n,groups=Math.ceil(n/rows);
    for(let i=0;i<n;i++){const s=Math.floor(i/rows)/groups*stg.path.len+L.flow;const [x,y,z,yaw,pitch]=at(stg.path,s),o=off[i][0];
      dummy.position.set(x+Math.sin(yaw)*o,y,z+Math.cos(yaw)*o);dummy.rotation.set(0,stg.orient?yaw:off[i][1],stg.orient?pitch:0);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);}
    im.instanceMatrix.needsUpdate=true;});
  renderer.render(scene,camera);}
frame=requestAnimationFrame(loop);

return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
  const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ms.add(m);if(m.map)textures.push(m.map);});});
  gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());new Set(textures).forEach(t=>t.dispose());GC.forEach(g=>g.dispose());
  envTex.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();tip.remove();calloutLayer.remove();};
}

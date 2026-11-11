import React,{useState} from 'react';
import {PROCESS,ZONES,PACK_LINES,plantLayout,EVIDENCE,PHOTO_NUMBERS,LAYOUT_NOTICE} from './process.js';
import {STATUS} from './data.js';
export function ProcessEvidence({station}){const [photo,setPhoto]=useState(null);return <section className="process-evidence"><div className="row"><b>{EVIDENCE[station.verified]}</b><span>근거 · {station.photos}</span></div><p>{station.cond}</p>{PHOTO_NUMBERS[station.k]?.length?<div className="evidence-photos">{PHOTO_NUMBERS[station.k].map(n=><button key={n} onClick={()=>setPhoto(n)} aria-label={`현장 사진 ${n} 확대`}><img loading="lazy" src={`/references/${String(n).padStart(2,'0')}.jpg`} alt={`${station.ko} 현장 사진 ${n}`} onError={e=>{e.currentTarget.parentElement.style.display='none'}}/><span>#{n}</span></button>)}</div>:<p className="muted">{station.verified==='user'?'공정 방식은 사용자 확인 · 설비 외형은 개략 모델':'이 단계의 현장 사진은 아직 확인되지 않았습니다.'}</p>}{photo!==null&&<div className="photo-overlay" role="dialog" aria-modal="true" aria-label="현장 사진 확대" onKeyDown={e=>{if(e.key==='Escape')setPhoto(null)}} onClick={()=>setPhoto(null)}><button autoFocus onClick={()=>setPhoto(null)}>사진 닫기 ×</button><img src={`/references/${String(photo).padStart(2,'0')}.jpg`} alt={`${station.ko} 사진 #${photo}`}/></div>}</section>}
export default function ProcessDrawing({machines,line,onSelect,onOpen3D}){
  const [zone,setZone]=useState('all'),layout=plantLayout(),K=8,PAD=40;
  const visible=PROCESS.filter(p=>zone==='all'||p.zone===zone);
  const X=x=>(x-layout.xmin)*K+PAD,Y=z=>(z+layout.halfD)*K+PAD;
  const activeZone=layout.zones.find(z=>z.id===zone);
  const vx=activeZone?X(activeZone.x1)-20:0,vw=activeZone?(activeZone.x2-activeZone.x1)*K+40:layout.total*K+PAD*2,vh=layout.halfD*2*K+PAD*2;
  const room=layout.zones.find(z=>z.id==='PACK2');
  const open3D=p=>onOpen3D(p.k==='WP'?`${PACK_LINES.some(l=>l.id===line)?line:'PA'}-WP`:['PACK2','PAL'].includes(p.zone)?`FIN-${p.k}`:`BASE-${p.k}`);
  return <><div className="page-title"><div><span className="eyebrow">PHOTO-BASED PROCESS MAP</span><h1>현장 공정 도면</h1><p>베이스 라인 10공정(침지 10조) → 완제품 → 국가별 소포장 분기 → 묶음 외포장부터 1라인 합류(최종 포장실, 별도 방).</p></div><span className="pill gold">베이스 10공정 · 소포장 {PACK_LINES.length} → 최종 1라인 · 사진 68장</span></div>
  <div className="layout-notice">{LAYOUT_NOTICE}</div>
  <div className="drawing-controls">{[['all','전체 공정'],...ZONES.filter(z=>PROCESS.some(p=>p.zone===z.id)).map(z=>[z.id,z.ko])].map(([id,label])=><button key={id} className={zone===id?'on':''} onClick={()=>setZone(id)}>{label}</button>)}</div>
  <div className="drawing-scroll"><svg className={'plant-drawing '+(activeZone?'zone-focused':'')} viewBox={`${vx} 0 ${vw} ${vh}`} role="img" aria-label="베이스 라인과 국가별 포장 라인 개략 배치도">
    <defs><marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#38bdf8"/></marker></defs>
    {layout.zones.map(z=><g key={z.id}><rect x={X(z.x1)} y={PAD} width={(z.x2-z.x1)*K} height={layout.halfD*2*K} fill={z.color+'10'} stroke={z.color+'55'}/><text x={X(z.x1)+5} y={PAD+14} fill={z.color} fontSize="10">{z.ko}</text></g>)}
    {room&&<rect x={X(room.x1)} y={PAD+2} width={(room.x2-room.x1)*K} height={layout.halfD*2*K-4} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="8 4"/>}
    <line x1={X(layout.stations[0].x0)} x2={X(layout.branchX)} y1={Y(layout.mainZ)} y2={Y(layout.mainZ)} stroke="#38bdf866" markerEnd="url(#flow-arrow)"/>
    <line x1={X(layout.branchX)} x2={X(layout.branchX)} y1={Y(Math.min(...layout.packZ))} y2={Y(Math.max(...layout.packZ))} stroke="#ec4899" strokeWidth="3"/>
    <text x={X(layout.branchX)+4} y={Y(Math.max(...layout.packZ))+44} fill="#ec4899" fontSize="10">국가별 분기</text>
    <line x1={X(layout.mergeX)} x2={X(layout.mergeX)} y1={Y(Math.min(...layout.packZ))} y2={Y(Math.max(...layout.packZ))} stroke="#10b981" strokeWidth="3"/><line x1={X(layout.mergeX)} x2={X(layout.xmax-26)} y1={Y(layout.mainZ)} y2={Y(layout.mainZ)} stroke="#38bdf866" markerEnd="url(#flow-arrow)"/><text x={X(layout.mergeX)+6} y={Y(layout.mainZ)-38} fill="#34d399" fontSize="10">합류 → 최종 포장 라인</text>
    {PACK_LINES.map((L,i)=><g key={L.id}><line x1={X(layout.branchX)} x2={X(layout.mergeX)} y1={Y(layout.packZ[i])} y2={Y(layout.packZ[i])} stroke="#38bdf866"/><text x={X(layout.branchX)+6} y={Y(layout.packZ[i])-22} fill="#f9a8d4" fontSize="10">{L.name} · {L.market}</text></g>)}
    {layout.stations.map(p=>{const m=machines.find(x=>x.id===p.id);if(!m)return null;const dim=line&&line!==p.line;return <g className="drawing-node" key={p.id} opacity={dim?.35:1} role="button" tabIndex="0" aria-label={`${p.id} ${p.ko} 상세`} onClick={()=>onSelect(m.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(m.id)}}}>
      <rect x={X(p.x0)} y={Y(p.z-2)} width={p.w*K} height={4*K} rx="4" fill={p.pack?'#15372c':'#152332'} stroke={STATUS[m.status].color} strokeDasharray={p.verified==='assumed'?'4 3':undefined}/>
      <text x={X(p.x0)+4} y={Y(p.z-2)+12} fill="#7f90a3" fontSize="8">{p.no?String(p.no).padStart(2,'0'):p.line} · {p.k}</text>
      <text x={X(p.x0)+4} y={Y(p.z-2)+24} fill="#dbe4ee" fontSize="8.5">{p.ko.length>9?p.ko.slice(0,9):p.ko}</text></g>;})}
  </svg></div>
  <div className="drawing-legend"><span>초록 배경: 포장 단계</span><span>초록 점선 틀: 최종 포장실(별도 방)</span><span>분홍: 국가별 분기</span><span>설비 선택: 상세 · 사진 확인</span></div>
  <div className="process-cards">{visible.map(p=><article key={p.k} className={'process-card '+(p.pack?'packing-stage':'')}><div className="row"><span className="code">{p.no?String(p.no).padStart(2,'0'):'포장'} · {p.k}</span><span className={'evidence-tag '+p.verified}>{EVIDENCE[p.verified]}</span></div><h2>{p.ko}</h2><span className="muted">{p.en}</span><ProcessEvidence station={p}/><button className="open-stage" onClick={()=>open3D(p)}>3D에서 설비 보기 ↗</button></article>)}</div></>;
}

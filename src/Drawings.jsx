import React,{useState} from 'react';
import {PROCESS,BASE_PROCESS,PACK_PROCESS,PACK_LINES,ZONES,plantLayout} from './process.js';

const zoneOf=id=>ZONES.find(z=>z.id===id);
const no=i=>String(i+1).padStart(2,'0');
const tag=p=>p.no?String(p.no).padStart(2,'0'):'포장';
const VER={photo:'사진 확인',partial:'일부 확인',user:'사용자 확인',assumed:'현장 확인 필요'};

/* ---------------- 공정 흐름도 (PFD) ---------------- */
function FlowDiagram(){
  const PER=5,W=200,H=92,GX=44,GY=74,M=24,TOP=M+28;
  const base=BASE_PROCESS.map((p,i)=>{const r=Math.floor(i/PER),c=i%PER,col=r%2?PER-1-c:c;return {p,r,x:M+col*(W+GX),y:TOP+r*(H+GY)};});
  const packY=TOP+2*(H+GY)+26,pack=PACK_PROCESS.map((p,i)=>({p,r:2,x:M+i*(W+GX),y:packY}));
  const vw=M*2+PER*W+(PER-1)*GX,vh=packY+H+60,arrows=[];
  for(let i=0;i<base.length-1;i++){const a=base[i],b=base[i+1];
    if(a.r===b.r){const dir=b.x>a.x?1:-1;const x1=dir>0?a.x+W:a.x,x2=dir>0?b.x:b.x+W,y=a.y+H/2;arrows.push(<line key={'a'+i} x1={x1+3*dir} y1={y} x2={x2-6*dir} y2={y} className="dw-arrow" markerEnd="url(#arrowhead)"/>);}
    else{const x=a.x+W/2;arrows.push(<line key={'a'+i} x1={x} y1={a.y+H+3} x2={x} y2={b.y-7} className="dw-arrow" markerEnd="url(#arrowhead)"/>);}}
  const last=base[base.length-1];arrows.push(<line key="br" x1={last.x+W/2} y1={last.y+H+3} x2={pack[0].x+W/2} y2={packY-7} className="dw-arrow branch" markerEnd="url(#arrowhead3)"/>);
  for(let i=0;i<pack.length-1;i++){const a=pack[i],b=pack[i+1];arrows.push(<line key={'p'+i} x1={a.x+W+3} y1={a.y+H/2} x2={b.x-6} y2={b.y+H/2} className="dw-arrow" markerEnd="url(#arrowhead)"/>);}
  const room=pack.filter(q=>q.p.zone==='PACK2'),rx=room[0].x-12,rw=room[room.length-1].x+W+12-rx;
  const node=({p,x,y})=>{const z=zoneOf(p.zone);return <g key={p.k} transform={`translate(${x},${y})`}>
      <rect width={W} height={H} rx="8" className={'dw-node'+(p.verified==='assumed'?' assumed':'')} style={{'--zc':z.color}}/>
      <rect width="5" height={H} rx="2" fill={z.color}/>
      <text x="14" y="21" className="dw-no">{tag(p)} · {p.k}</text>
      {p.inspection&&<g transform={`translate(${W-46},9)`}><rect width="36" height="16" rx="8" fill="#f59e0b22" stroke="#f59e0b"/><text x="18" y="12" textAnchor="middle" className="dw-badge" fill="#f59e0b">검사</text></g>}
      {p.pack&&<g transform={`translate(${W-(p.inspection?88:46)},9)`}><rect width="36" height="16" rx="8" fill="#22c55e22" stroke="#22c55e"/><text x="18" y="12" textAnchor="middle" className="dw-badge" fill="#22c55e">포장</text></g>}
      {p.seal&&<g transform={`translate(${W-(p.pack?88:46)},${H-24})`}><rect width="76" height="16" rx="8" fill="#ec489922" stroke="#ec4899"/><text x="38" y="12" textAnchor="middle" className="dw-badge" fill="#ec4899">실링 온도 수집</text></g>}
      <text x="14" y="44" className="dw-name">{p.ko}</text>
      <text x="14" y="63" className="dw-brief">{p.brief}</text>
      <text x="14" y="81" className="dw-meta">{p.tlabel} {p.sv}°C</text>
    </g>;};
  return <svg viewBox={`0 0 ${vw} ${vh}`} className="dw-svg" role="img" aria-label="베이스 라인 10공정과 국가별 포장 라인 흐름도">
    <defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" className="dw-arrowhead"/></marker>
      <marker id="arrowhead3" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ec4899"/></marker></defs>
    <text x={M} y={M+6} className="dw-cap">베이스 라인 10공정 (침지 10조 → 탈수 없이 증숙 → … → 2차 건조 수분 ≤10% → 완제품) → 국가별 포장 라인 분기</text>
    <rect x={rx} y={packY-22} width={rw} height={H+34} rx="10" className="dw-room"/>
    <text x={rx+10} y={packY-8} className="dw-roomtext">최종 포장실 · 별도 방 (최종 포장 검사부터)</text>
    <text x={pack[0].x+W/2+10} y={packY-44} className="dw-branchtext">국가별 분기 → 소포장 {PACK_LINES.map(l=>`${l.name}(${l.market})`).join(' / ')} → 묶음 외포장부터 1라인으로 합류</text>
    {arrows}{base.map(node)}{pack.map(node)}
    <g transform={`translate(${M},${vh-18})`} className="dw-legend">
      <rect width="14" height="10" rx="2" className="dw-node"/><text x="20" y="9">사진·사용자 확인 공정</text>
      <rect x="190" width="14" height="10" rx="2" className="dw-node assumed"/><text x="210" y="9">현장 확인 필요 (점선)</text>
      <text x="400" y="9" fill="#f59e0b">검사 = 금속검출·중량</text>
      <text x="560" y="9" fill="#ec4899">실링 온도 = PLC 수집·관리 대상</text>
    </g>
  </svg>;
}

/* ---------------- 평면 배치도 ---------------- */
function PlanDrawing(){
  const L=plantLayout(),pad=9,d=L.halfD,vb=[L.xmin-pad,-d-15,L.total+pad*2,d*2+30],depth=3.6;
  const partitions=['RAW','SOAK','DOUGH','DRY1','SEMI','FRY','PACK1','PACK2','PAL'].map(id=>({id,x:L.zones.find(z=>z.id===id).x2}));
  const room=L.zones.find(z=>z.id==='PACK2'),zmin=Math.min(...L.packZ),zmax=Math.max(...L.packZ);
  return <svg viewBox={vb.join(' ')} className="dw-svg dw-plan" role="img" aria-label="공장 평면 배치도">
    <defs><marker id="flow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="#38bdf8"/></marker>
      <marker id="dim" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto-start-reverse"><path d="M0,0 L4,2 L0,4 z" className="dw-dimhead"/></marker></defs>
    {L.zones.map(z=><g key={z.id}><rect x={z.x1} y={-d} width={z.x2-z.x1} height={d*2} fill={z.color} opacity=".08"/>
      <text x={(z.x1+z.x2)/2} y={-d-7.6} textAnchor="middle" className="dw-pzone" fill={z.color}>{z.ko}</text>
      <line x1={z.x1} x2={z.x2} y1={-d-4} y2={-d-4} className="dw-dim" markerStart="url(#dim)" markerEnd="url(#dim)"/>
      <text x={(z.x1+z.x2)/2} y={-d-4.8} textAnchor="middle" className="dw-dimtext">{(z.x2-z.x1).toFixed(1)}</text></g>)}
    <rect x={L.xmin} y={-d} width={L.total} height={d*2} className="dw-wall"/>
    <rect x={room.x1} y={-d+.3} width={room.x2-room.x1} height={d*2-.6} className="dw-roomplan"/>
    {partitions.map(p=><line key={p.id} x1={p.x} x2={p.x} y1={-d} y2={d} className={p.id==='PACK1'||p.id==='PACK2'?'dw-part room':'dw-part'}/>)}
    {[-5.6,5.6].map(z=><rect key={z} x={L.xmin+1} y={z-1.1} width={L.total-2} height="2.2" className="dw-walk"/>)}
    <text x={L.xmin+15} y={L.mainZ-4.4} className="dw-pline">베이스 라인 (10공정)</text>
    <line x1={L.stations[0].x0} x2={L.branchX} y1={L.mainZ} y2={L.mainZ} className="dw-flow" markerEnd="url(#flow)"/>
    <line x1={L.branchX} x2={L.branchX} y1={zmin} y2={zmax} className="dw-branch"/>
    {PACK_LINES.map((pl,i)=><g key={pl.id}><text x={L.branchX+1.5} y={L.packZ[i]-3.2} className="dw-pline pack">{pl.name} · {pl.market}</text><line x1={L.branchX} x2={L.mergeX} y1={L.packZ[i]} y2={L.packZ[i]} className="dw-flow"/></g>)}
    <line x1={L.mergeX} x2={L.mergeX} y1={zmin} y2={zmax} className="dw-merge"/><line x1={L.mergeX} x2={L.xmax-26} y1={L.mainZ} y2={L.mainZ} className="dw-flow" markerEnd="url(#flow)"/>
    <text x={L.mergeX+1.5} y={L.mainZ-3.2} className="dw-pline merged">최종 포장 라인 (A·B·C 합류)</text>
    {L.stations.map(s=><g key={s.id}><rect x={s.x0} y={s.z-depth/2} width={s.w} height={depth} rx=".4" className={'dw-eq'+(s.verified==='assumed'?' assumed':'')+(s.pack?' pack':'')+(s.inspection?' ccp':'')}/>
      <text x={s.x} y={s.z+.6} textAnchor="middle" className="dw-eqno">{s.no?String(s.no).padStart(2,'0'):s.k}</text></g>)}
    {(()=>{const r=L.zones.find(z=>z.id==='RAW');return <g>{[0,1].map(c=>[0,1,2,3,4,5].map(k=>{const pz=-d+3.6+k*5.6;return Math.abs(pz)<2.4?null:<rect key={c+'-'+k} x={r.x1+1.85+c*3.6} y={pz-.65} width="1.3" height="1.3" className="dw-pallet"/>;}))}<text x={r.x1+4.3} y={d-1.4} textAnchor="middle" className="dw-small">원료 포대 적치</text></g>;})()}
    {(()=>{const f=L.zones.find(z=>z.id==='FG');return <g>{[0,1,2].map(r=>[-1.5,1.5].map(s=><rect key={r+'_'+s} x={f.x1+2} y={-13+r*13+s-1.2} width={f.x2-f.x1-8} height="2.4" className="dw-rack"/>))}
      {L.packZ.map(z=><rect key={z} x={L.xmax-.6} y={z+6-1.8} width="1.2" height="3.6" className="dw-dock"/>)}<text x={(f.x1+f.x2)/2} y={d-1.4} textAnchor="middle" className="dw-small">랙 · 출하 도크</text></g>;})()}
    <line x1={L.xmin} x2={L.xmax} y1={d+5} y2={d+5} className="dw-dim" markerStart="url(#dim)" markerEnd="url(#dim)"/>
    <text x={(L.xmin+L.xmax)/2} y={d+4.2} textAnchor="middle" className="dw-dimtext big">전장 약 {L.total.toFixed(0)} m (개략)</text>
    <line x1={L.xmin-4} x2={L.xmin-4} y1={-d} y2={d} className="dw-dim" markerStart="url(#dim)" markerEnd="url(#dim)"/>
    <text x={L.xmin-5} y="0" textAnchor="middle" className="dw-dimtext big" transform={`rotate(-90 ${L.xmin-5} 0)`}>폭 {d*2} m</text>
    <g transform={`translate(${L.xmin+2},${d+9.5})`}><rect width="10" height="1" fill="#dbe4ee"/><rect x="10" width="10" height="1" fill="#475569"/><text x="0" y="3.6" className="dw-small">0</text><text x="10" y="3.6" className="dw-small" textAnchor="middle">10</text><text x="20" y="3.6" className="dw-small" textAnchor="middle">20 m</text></g>
    <text x={L.xmax} y={d+11} textAnchor="end" className="dw-small">포장 라인 피치 11 m · 통로 2.2 m · 초록 실선 = 최종 포장실 벽 · 개략 배치</text>
  </svg>;
}

/* ---------------- 포장 공정 상세 ---------------- */
const PACKING=[
  {title:'① 반제품(생지) 검사 · 포장', tag:'사진 확인 #40–#48', tone:'ok', steps:[
    ['1차 건조 배출','다단 건조기 출구 메쉬 컨베이어 → 백색 모듈 벨트'],
    ['금속검출 (CCP)','ISHIDA 금속검출기 "công đoạn 1" · 감도 점검(Ope Check) · NG 자동 리젝트 · 경광등'],
    ['수작업 선별','SUS 작업대에서 깨짐·변형·이물 선별, 불량은 청록 리젝트 백'],
    ['크레이트 충전','그린 플라스틱 크레이트 + 골판지 내지, 생지 적재'],
    ['계량 · 기록','플랫폼 저울(청색 인디케이터) 순중량 16kg · 생지 10매 중량 · 수분(HLN) 18~19% · 크레이트 번호/시간/담당자 일지'],
    ['팔레트 적재','청색 플라스틱 팔레트에 크레이트 적재·대기 → SA8 2차 건조로 이동'],
  ]},
  {title:'② 국가별 포장 (완제품 이후 분기)', tag:'사용자 확인 · 기종/수량은 현장 확인', tone:'warn', steps:[
    ['국가별 분기','조미·냉각된 완제품을 분기 컨베이어로 국가별 포장 라인 A/B/C에 배분 (국가명은 설정값)'],
    ['개별 소포장','필름 성형 → 실링(찝어서 붙임) · 실링 죠 온도를 PLC로 수집·관리 · 봉지 수 카운트'],
    ['[별도 방] 묶음 외포장','최종 포장실 진입 · 외포장 묶음 전용 장비 · 외포장 실링 온도 수집'],
    ['중량선별 · 금속검출','ISHIDA DACS 중량선별기 CKTTL-1A (180g 제품 · 211~223g 기준, 사진 216.15g) → ISHIDA 금속검출기 MDKL-1A · 수동 확인 저울 (#61–#63)'],
    ['제함 · 박스 포장','jaepack 자동 제함기 MGTD-A로 제품 카톤 성형 → 롤러 컨베이어에서 작업자가 묶음 입상 (#64–#66)'],
    ['로봇 팔레타이징 · 출하','협동로봇 진공 그리퍼로 검정 플라스틱 팔레트에 박스 적재 → 셔터 도크 출하 (#67–#68)'],
  ]},
];
function Packing(){return <div className="dw-pack-grid">{PACKING.map(p=><section key={p.title} className={'panel dw-pack '+p.tone}>
  <div className="row"><h2>{p.title}</h2><span className={'dw-tag '+p.tone}>{p.tag}</span></div>
  <ol>{p.steps.map(([h,t])=><li key={h}><b>{h}</b><span>{t}</span></li>)}</ol></section>)}</div>;}

/* ---------------- 수정 내역 · 확인 필요 ---------------- */
const CHANGES=[
  ['라인 구성','동일 라인 4개','베이스 라인 1개(10공정) → 완제품 후 국가별 포장 라인 분기','사용자 확인'],
  ['침지','원추 탱크 2개','침지조 10개 · 각 조 배출 쌀이 한 줄 공용 컨베이어 위로 떨어져 합류','사용자 확인, #6 #10'],
  ['탈수 · 제분','습식 이송·탈수 → 제분','삭제 · 불린 쌀을 탈수 없이 바로 증숙','사용자 확인'],
  ['공정 묶음','23개 개별 설비','10공정: 원료투입·세미 / 침지 / 증숙 / 압출·냉각 / 압연·타발 / 1차 건조 / 반제품 검사·적재 / 2차 건조 / 예열·유탕 / 조미·냉각','사용자 확인'],
  ['2차 건조','SV 70°C','SA8 · 수분 10% 이하 목표 추가 (데이터 창에 수분 표시)','사용자 확인, #49–#54'],
  ['최종 포장실','같은 구역','최종 포장 검사부터 별도 방 · 외포장 묶음 전용 장비 · 묶음당 중량(g) → 금속검출 → 박스','사용자 확인'],
  ['실링 온도','표시만','개별 소포장 · 외포장 실링 온도를 설비 온도/데이터 창에서 관리 (이탈 시 경고)','사용자 확인'],
  ['최종 포장실 설비','일반형 모델','ISHIDA 중량선별기·금속검출기, jaepack 제함기, 협동로봇 팔레타이저를 사진대로 모델링 · 묶음 중량 기준 211~223g 반영','#61–#68'],
  ['3D 데이터 창','없음','온도, 현재 투입량 kg, 오늘 총생산량 g, 봉지, 묶음, 박스, 묶음 중량, 금속 NG 표시','사용자 요청'],
  ['1차 건조 조건','SV 75°C 단일 터널','다단 메쉬 벨트 건조기 · 9구역 88~93°C · 인버터 14대 → SV 90°C','#31–#39'],
  ['반제품 검사 · 적재','없음','ISHIDA 금속검출 → 선별 → 크레이트 16kg 계량 · 수분 18~19% 기록 → 팔레트 적재','#40–#48, #51'],
  ['유탕','단순 오븐 형상','예열 회전드럼 + 연속 유탕기 + 배기 후드 + HMI(BTLC)','#55–#60'],
];
const OPEN=[
  '국가별 포장 라인 수와 국가명: 현재 A(베트남 내수)·B(수출국 1)·C(수출국 2) 3개 라인으로 가정했습니다. process.js의 PACK_LINES에서 바꿀 수 있습니다.',
  '포장 단위: 소포장 15 g · 묶음당 10봉 · 박스당 12묶음은 데모값입니다. 국가별로 다르면 알려주세요.',
  '실링 온도 기준: 소포장 150°C · 외포장 140°C는 가정값입니다. 실제 SV와 허용 편차가 필요합니다.',
  '유탕 170°C · 예열 80°C는 가정값이며, 침지조 10개는 한 줄 배치로 모델링했습니다.',
  '도면 치수는 사진 기반 개략치입니다. 건물 실측과 설비 외형 치수로 보정이 필요합니다.',
];

export default function Drawings(){
  const [view,setView]=useState('all');
  const show=k=>view==='all'||view===k;
  return <div className="drawings">
    <div className="row dw-head"><div><span className="eyebrow">PROCESS REVIEW</span><h2 className="dw-h2">공정 흐름 검토 · 포장 상세 · 수정 내역</h2></div>
      <div className="dw-actions"><div className="seg">{[['all','전체'],['flow','흐름도'],['plan','배치도'],['pack','포장'],['review','수정 내역']].map(([k,l])=><button key={k} className={view===k?'on':''} onClick={()=>setView(k)}>{l}</button>)}</div><button className="primary" onClick={()=>window.print()}>인쇄 · PDF</button></div></div>
    {show('flow')&&<section className="panel dw-section"><h2>A <span>공정 흐름도 (PFD)</span></h2><FlowDiagram/></section>}
    {show('plan')&&<section className="panel dw-section"><h2>B <span>평면 배치도 (개략)</span></h2><PlanDrawing/>
      <div className="dw-eqlist">{PROCESS.map((p,i)=><div key={p.k} className={p.verified==='assumed'?'assumed':''}><b>{tag(p)}</b><span>{p.ko}</span><small>{zoneOf(p.zone).ko}</small></div>)}</div></section>}
    {show('pack')&&<section className="dw-section"><h2 className="dw-h2">C · 포장 공정 상세</h2><Packing/></section>}
    {show('review')&&<section className="panel dw-section"><h2>D <span>공정 흐름 검토 · 수정 내역</span></h2>
      <div className="table-wrap"><table><thead><tr><th>항목</th><th>기존</th><th>수정</th><th>근거 사진</th></tr></thead><tbody>{CHANGES.map(r=><tr key={r[0]}>{r.map((c,i)=><td key={i}>{c}</td>)}</tr>)}</tbody></table></div>
      <h3 className="dw-open-title">확인이 필요한 사항</h3><ul className="dw-open">{OPEN.map(t=><li key={t}>{t}</li>)}</ul>
      <div className="table-wrap dw-detail"><table><thead><tr><th>No</th><th>공정</th><th>구역</th><th>설비 · 조건</th><th>근거</th><th>상태</th></tr></thead><tbody>{PROCESS.map((p,i)=><tr key={p.k}><td>{tag(p)}</td><td>{p.ko}<br/><small className="muted">{p.en}</small></td><td>{zoneOf(p.zone).ko}</td><td>{p.cond}</td><td>{p.photos}</td><td className={'dw-ver '+p.verified}>{VER[p.verified]}</td></tr>)}</tbody></table></div>
    </section>}
  </div>;
}

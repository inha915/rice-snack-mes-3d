import {plantLayout,ALL_LINES} from './process.js';
export const STATUS={run:{label:'가동',color:'#22c55e'},idle:{label:'대기',color:'#f59e0b'},down:{label:'고장',color:'#ef4444'},maint:{label:'보전',color:'#60a5fa'}};
// 베이스 라인 1개 + 국가별 포장 라인. 이전 저장 기록의 L1~L4는 legacy 이름으로 표시합니다.
export const LINES=ALL_LINES.map(l=>({id:l.id,name:l.name,product:l.market,kind:l.id==='BASE'?'base':l.id==='FIN'?'final':'pack'}));
const LEGACY={L1:'이전 LINE 1',L2:'이전 LINE 2',L3:'이전 LINE 3',L4:'이전 LINE 4'};
export const lineLabel=id=>LINES.find(l=>l.id===id)?.name||LEGACY[id]||id;
// 데모 시나리오: 고장/보전 설비 (베이스 라인은 정상 가동)
export const SCENARIO={'PC-WP':{status:'idle',note:'수출국 2 품목 전환 · 필름 교체'},'PB-WP':{status:'maint',note:'소포장기 실링 죠 정기 예방보전 (PM)'}};
export const initialMachines=()=>plantLayout().stations.map((p,i)=>{const s=SCENARIO[p.id];return {id:p.id,line:p.line,key:p.k,name:p.ko,zone:p.zone,tlabel:p.tlabel,verified:p.verified,seal:!!p.seal,sv:p.sv,pv:p.sv+(i%3-1)*.7,status:s?.status||'run',note:s?.note||'',history:Array.from({length:60},(_,j)=>p.sv+Math.sin(j*.4+i)*.8),tolerance:Math.max(2,p.sv*.04),plannedSeconds:14400,runSeconds:13200-i*35,totalCount:(13200-i*35)/2*(.9+(i%4)*.012),goodCount:Math.floor((13200-i*35)/2*(.9+(i%4)*.012)*(.982+(i%3)*.004)),idealCycleSeconds:2}});
// Future PLC gateway contract. The browser never connects directly to a PLC.
export function applyTelemetry(machines, sample){
 if(!sample||typeof sample.id!=='string'||!Number.isFinite(sample.pv)||!Number.isFinite(Date.parse(sample.timestamp)))throw new Error('잘못된 PLC 샘플');
 return machines.map(m=>m.id===sample.id?{...m,pv:sample.pv,history:[...m.history.slice(-59),sample.pv],timestamp:sample.timestamp}:m);
}

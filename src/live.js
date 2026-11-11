// 3D 화면 데이터 집계 창용 실시간 생산 카운터 (데모 시뮬레이션).
// PLC 연결 후에는 투입 저울·포장기·중량선별기·금속검출기 카운터로 대체합니다.
// 구조: 국가별 소포장 라인(A·B·C)은 봉지까지 따로 세고, 묶음 외포장부터는 합류한 최종 포장 라인 1개에서 셉니다.
import {PACK_LINES} from './process.js';

export const LIVE_CFG={
  riceKgPerHour:620,      // 쌀 투입 속도 (데모)
  productPerRice:.78,     // 완제품 g / 쌀 g (수분 손실·유지 흡수 반영 개략값)
  innerGrams:18,          // 개별 소포장 1봉 g (묶음 180g 제품 ÷ 10봉 가정)
  innersPerOuter:10,      // 묶음 1개당 소포장 수 (가정)
  outersPerCase:12,       // 박스 1개당 묶음 수 (가정)
  bundleSpec:{nominal:217,min:211,max:223},   // 사진 #61: 'Hàng 180g · Tiêu chuẩn 211g–223g' (포장재 포함 묶음 중량)
  weightNgRate:.002,      // 중량 NG 비율 (데모)
  casesPerPallet:40,      // 팔레트 1개당 박스 (가정)
  share:{PA:.45,PB:.3,PC:.25},
  metalNgRate:.0006,      // 묶음당 금속검출 NG 비율 (데모)
};
const DAY_START_HOUR=6;   // 생산일 시작 (베트남 06:00)

export function hoursSinceStart(date=new Date()){
  const vn=new Date(new Date(date).toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}));
  let h=vn.getHours()+vn.getMinutes()/60+vn.getSeconds()/3600-DAY_START_HOUR;
  if(h<0)h+=24; return h;
}
function finCounts(bags,cfg){
  const bundles=Math.floor(bags/cfg.innersPerOuter),boxes=Math.floor(bundles/cfg.outersPerCase);
  return {bundles,boxes,pallets:Math.floor(boxes/cfg.casesPerPallet)};
}
export function initialLive(date=new Date(),cfg=LIVE_CFG){
  const h=hoursSinceStart(date)*.9;               // 가동률 90% 가정
  const riceKg=h*cfg.riceKgPerHour,productG=riceKg*1000*cfg.productPerRice;
  const lines={};let bags=0;
  for(const L of PACK_LINES){const g=productG*cfg.share[L.id];lines[L.id]={g,bags:Math.floor(g/cfg.innerGrams)};bags+=lines[L.id].bags;}
  const c=finCounts(bags,cfg);
  return {riceKg,productG,rateKgH:cfg.riceKgPerHour,moisture:8.6,buffer:0,lines,
    fin:{bagsIn:bags,...c,metalNg:Math.floor(c.bundles*cfg.metalNgRate),weightNg:Math.floor(c.bundles*cfg.weightNgRate),bundleG:cfg.bundleSpec.nominal}};
}
// running: {BASE:bool, PA:bool, PB:bool, PC:bool, FIN:bool}
export function stepLive(live,dt,running,cfg=LIVE_CFG,rand=Math.random){
  const next={...live,lines:{...live.lines},fin:{...live.fin}};
  const base=!!running.BASE,fin=running.FIN!==false;
  const addRice=base?cfg.riceKgPerHour/3600*dt:0;
  next.riceKg=live.riceKg+addRice;
  next.rateKgH=base?cfg.riceKgPerHour*(.97+rand()*.06):0;
  const addG=addRice*1000*cfg.productPerRice;
  next.productG=live.productG+addG;
  next.moisture=Math.max(6,Math.min(10,live.moisture+(rand()-.5)*.08));
  const pool=addG+live.buffer;
  // 최종 포장 라인이 멈추면 소포장도 정지(합류 컨베이어 막힘)
  const active=fin?PACK_LINES.filter(L=>running[L.id]):[];
  const shareSum=active.reduce((s,L)=>s+cfg.share[L.id],0);
  let bags=0;
  for(const L of PACK_LINES){
    const prev=live.lines[L.id];
    if(active.includes(L)){const g=prev.g+pool*cfg.share[L.id]/shareSum;next.lines[L.id]={g,bags:Math.floor(g/cfg.innerGrams)};}
    else next.lines[L.id]={...prev};
    bags+=next.lines[L.id].bags;
  }
  next.buffer=shareSum?0:pool;                     // 포장 정지 시 완제품 대기
  const prevF=live.fin,c=finCounts(bags,cfg),newBundles=c.bundles-prevF.bundles;
  let metalNg=prevF.metalNg,weightNg=prevF.weightNg;for(let i=0;i<newBundles;i++){if(rand()<cfg.metalNgRate)metalNg++;if(rand()<cfg.weightNgRate)weightNg++;}
  const sp=cfg.bundleSpec;
  next.fin={bagsIn:bags,...c,metalNg,weightNg,bundleG:newBundles>0?+(sp.nominal+(rand()-.5)*(sp.max-sp.min)*.6).toFixed(2):prevF.bundleG};
  return next;
}
export function liveTotals(live){
  const ls=Object.values(live.lines),f=live.fin;
  return {riceKg:live.riceKg,productG:live.productG,packedG:ls.reduce((s,l)=>s+l.g,0),bags:ls.reduce((s,l)=>s+l.bags,0),bundles:f.bundles,boxes:f.boxes,pallets:f.pallets,metalNg:f.metalNg,weightNg:f.weightNg};
}

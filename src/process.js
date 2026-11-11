// 단일 공정 정의 — 3D 공장, 공정 도면, 설비 데이터가 모두 이 파일을 기준으로 합니다.
// 근거(photos)는 2026-11-09 현장 사진 60장(KakaoTalk_20261109_102058922*, _102107291*)의 순번(#1~#60)입니다.
// verified: 'photo' = 사진 확인, 'partial' = 일부 확인, 'user' = 사용자 확인, 'assumed' = 현장 확인 필요
//
// 구조 (2026-11-10 사용자 확인):
//  · 베이스 라인 1개, 10개 공정. 침지는 10조이며 각 조의 불린 쌀이 하나의 컨베이어로 떨어져 합쳐진다.
//  · 침지 후 탈수 없이 바로 증숙. 2차 건조에서 수분 10% 이하.
//  · 완제품(조미·냉각) 이후 국가별 포장 라인으로 분기. 개별 소포장 실링 온도를 수집·관리.
//  · 묶음 외포장부터 소포장 A·B·C가 한 라인으로 합류. 최종 포장실(별도 방): 묶음 외포장 → ISHIDA 중량선별(211~223g)·금속검출 → 제함·박스.
//  · 박스는 협동로봇이 검정 플라스틱 팔레트에 적재 (2026-11-10 추가 사진 #61~#68).

export const ZONES = [
  {id:'RAW',   ko:'원료 투입 · 세미',        en:'RAW & WASH',        color:'#3b82f6'},
  {id:'SOAK',  ko:'침지 (10조)',             en:'SOAKING × 10',      color:'#06b6d4'},
  {id:'DOUGH', ko:'증숙 · 반죽 · 성형',      en:'STEAM & FORMING',   color:'#a78bfa'},
  {id:'DRY1',  ko:'1차 건조',                en:'PRIMARY DRYING',    color:'#f59e0b'},
  {id:'SEMI',  ko:'반제품 검사 · 적재',      en:'SEMI INSPECT/STACK',color:'#22c55e'},
  {id:'DRY2',  ko:'2차 건조',                en:'SECOND DRYING',     color:'#eab308'},
  {id:'FRY',   ko:'예열 · 유탕 · 조미',      en:'FRY & SEASON',      color:'#f97316'},
  {id:'PACK1', ko:'국가별 개별 소포장',      en:'INNER WRAP by MARKET', color:'#ec4899'},
  {id:'PACK2', ko:'최종 포장실 (별도 구역)', en:'FINAL PACKING ROOM',color:'#10b981'},
  {id:'PAL',   ko:'로봇 팔레타이징',         en:'ROBOT PALLETIZING', color:'#0ea5e9'},
  {id:'FG',    ko:'완제품 창고 · 출하',      en:'FG WAREHOUSE',      color:'#64748b'},
];

const sumW = parts => parts.reduce((s,[,w])=>s+w,0) + (parts.length-1)*.4;

// 베이스 라인 10개 공정
export const BASE_PROCESS = [
  {k:'RW', no:1, ko:'원료 투입 · 세미', en:'Rice Intake & Washing', zone:'RAW', parts:[['intake',7],['washer',6]], sv:24, tlabel:'세척 수온',
   brief:'50kg 포대 → 받침통 → 스크류 세척', cond:'50kg PP 포대 개봉 → 투입 받침통 → 벽 관통 경사 벨트 → 경사 스크류 세척기', photos:'#1–#5, #7, #8', verified:'photo'},
  {k:'SK', no:2, ko:'침지 (10조)', en:'Soaking Tanks ×10', zone:'SOAK', type:'soak10', w:26, sv:22, tlabel:'침지 수온', tanks:10,
   brief:'침지조 10개 → 공용 컨베이어 합류', cond:'원추형 SUS 침지조 10개에서 쌀을 불림 → 각 조 하부 배출 → 한 줄 공용 컨베이어 위로 떨어져 합쳐짐 · 급배수 펌프', photos:'#6, #9–#12', verified:'user'},
  {k:'ST', no:3, ko:'증숙 · 혼련', en:'Steamer & Kneader', zone:'DOUGH', type:'steamer', w:7, sv:102, tlabel:'증기 온도',
   brief:'탈수 없이 바로 증숙', cond:'불린 쌀을 탈수 없이 바로 증숙(익힘) → 혼련으로 떡 반죽화 · 링 블로워 공급부', photos:'#13–#16', verified:'user'},
  {k:'EX', no:4, ko:'압출 · 냉각', en:'Dough Extrusion & Cooling', zone:'DOUGH', parts:[['extruder',5],['watertank',7]], sv:18, tlabel:'냉각 수온',
   brief:'로프 반죽 → 냉각수조', cond:'로프형 반죽 연속 배출 → 체인 메쉬 컨베이어가 냉각수조 통과 → 경사 인출', photos:'#17–#22', verified:'photo'},
  {k:'CT', no:5, ko:'압연 · 원형 타발', en:'Sheeting & Round Die Cutting', zone:'DOUGH', parts:[['sheeter',5],['cutter',6]], sv:28, tlabel:'시트 품온',
   brief:'2단 롤 압연 → 원형 타발', cond:'반죽 호퍼 → 2단 압연 롤 → 원형 타발 · 망상 스크랩은 회수 벨트로 압연 호퍼 재투입', photos:'#23–#30', verified:'photo'},
  {k:'D1', no:6, ko:'1차 건조', en:'Multi-tier Belt Dryer', zone:'DRY1', type:'dryer', w:18, sv:90, tlabel:'건조 온도',
   brief:'다단 벨트 88~93°C', cond:'다단 메쉬 벨트 건조기 · 조작반 온도표시 9개(사진상 88~93°C) · 인버터 14대', photos:'#31–#39', verified:'photo'},
  {k:'SP', no:7, ko:'반제품 검사 · 적재', en:'Metal Detect, Crate Packing & Stacking', zone:'SEMI', parts:[['detector',3],['semipack',7],['aging',8]], sv:28, tlabel:'실내 온도', inspection:true, pack:true,
   brief:'금속검출 → 크레이트 16kg → 적재', cond:'ISHIDA 금속검출 → 수작업 선별 → 크레이트 계량(일지: 16kg, 생지 수분 18~19%) → 팔레트 적재', photos:'#40–#48, #51', verified:'photo'},
  {k:'D2', no:8, ko:'2차 건조', en:'Second Dryer (SA8)', zone:'DRY2', type:'cabinet', w:7, sv:70, tlabel:'건조 온도', moistureMax:10,
   brief:'SA8 · 수분 10% 이하', cond:'SA8 Second dryer(Chengdu Rongcheng) PV72/SV70°C · 수분 10% 이하로 건조 (사용자 확인)', photos:'#49–#54', verified:'user'},
  {k:'OV', no:9, ko:'예열 · 유탕', en:'Pre-heat Drum & Fryer', zone:'FRY', parts:[['predrum',7],['fryer',12]], sv:170, tlabel:'유온',
   brief:'예열 드럼 → 연속 유탕', cond:'"Lồng quay sơ bộ" 예열 회전드럼 → BTLC 연속 유탕기 · 배기 후드 · HMI (유온은 가정값)', photos:'#55–#60', verified:'photo'},
  {k:'SN', no:10, ko:'분말 조미 · 냉각', en:'Powder Seasoning & Cooling', zone:'FRY', parts:[['drum',6],['cooler',7]], sv:45, tlabel:'품온',
   brief:'맛별 분말 → 냉각 = 완제품', cond:'공통 베이스에 맛별 분말 조미(원추형 분말 호퍼 다수 · #67·#68 배경) → 송풍 냉각 → 완제품 (조미 드럼·냉각 설비 형식은 확인 필요)', photos:'사용자 설명 · #67, #68(배경)', verified:'user'},
].map(p => ({...p, w: p.w || sumW(p.parts)}));

// 국가별 포장 라인 (국가명은 설정값 — 실제 수출국으로 바꿔 쓰세요)
export const PACK_LINES = [
  {id:'PA', name:'포장 A', market:'베트남 내수'},
  {id:'PB', name:'포장 B', market:'수출국 1'},
  {id:'PC', name:'포장 C', market:'수출국 2'},
];
export const PACK_PROCESS = [
  {k:'WP', ko:'개별 소포장', en:'Individual Inner Wrapping', zone:'PACK1', type:'packer', w:7, sv:150, tlabel:'실링 온도', pack:true, seal:true,
   brief:'필름 성형 → 실링(찝기) · 온도 수집', cond:'국가별 개별 소포장 · 실링 죠 온도 PLC 수집·관리 (사용자 확인) · 기종 확인 필요', photos:'사용자 설명', verified:'user'},
  {k:'OP', ko:'묶음 외포장', en:'Multipack Outer Wrapping', zone:'PACK2', type:'outerpack', w:8, sv:140, tlabel:'외포장 실링 온도', pack:true, seal:true,
   brief:'A·B·C 합류 → 외포장 전용 장비', cond:'최종 포장실(별도 방) · 국가별 소포장 3라인이 합류 컨베이어로 하나로 합쳐짐 → 외포장 묶음 전용 장비 1대 · 실링 온도 수집 (사용자 확인)', photos:'사용자 설명', verified:'user'},
  {k:'QC', ko:'중량선별 · 금속검출', en:'ISHIDA Checkweigher & Metal Detector', zone:'PACK2', type:'checkweigher', w:6, sv:25, tlabel:'실내 온도', inspection:true,
   brief:'묶음 중량 211~223g · 금속검출', cond:'ISHIDA DACS 중량선별기 "CKTTL-1A"(180g 제품 기준 211~223g, 사진상 216.15g) → ISHIDA 금속검출기 "MDKL-1A" · 수동 확인 저울 · NG 리젝트', photos:'#61–#63', verified:'photo'},
  {k:'CP', ko:'제함 · 박스 포장', en:'Case Erector & Manual Case Packing', zone:'PACK2', type:'caseerector', w:10, sv:28, tlabel:'실내 온도', pack:true,
   brief:'jaepack 자동 제함 → 수작업 입상', cond:'jaepack 자동 제함기 "MGTD-A"(Omron HMI) → 롤러 컨베이어의 열린 제품 카톤에 작업자가 묶음 투입 · 녹색 벨트 공급', photos:'#64–#66', verified:'photo'},
  {k:'PL', ko:'로봇 팔레타이징', en:'Cobot Palletizer', zone:'PAL', type:'palletizer', w:8, sv:28, tlabel:'실내 온도',
   brief:'협동로봇 진공 그리퍼 → 검정 팔레트', cond:'6축 협동로봇(회색 캐비닛 위 베이스)이 흰 벨트 끝 스토퍼의 제품 박스를 진공 그리퍼로 흡착 → 검정 플라스틱 팔레트(LogisALL)에 2×2×3단 적재 → 출하 도크 · 기종/축 수 명판 확인 필요', photos:'#67, #68', verified:'photo'},
];

// 모든 공정 종류(중복 없음) — 도면·근거 카드용
export const PROCESS = [...BASE_PROCESS, ...PACK_PROCESS];

export const BASE_LINE = {id:'BASE', name:'베이스 라인', market:'공통 쌀과자 베이스'};
// 묶음 외포장부터는 국가별 소포장 라인이 하나로 합쳐짐 (2026-11-10 사용자 확인)
export const FINAL_LINE = {id:'FIN', name:'최종 포장 라인', market:'소포장 A·B·C 합류'};
export const MERGED_KEYS = ['OP','QC','CP','PL'];
export const ALL_LINES = [BASE_LINE, ...PACK_LINES, FINAL_LINE];
export const MAIN_Z = 0;
export const PACK_Z = [-9, 0, 9];
export const RAW_STORE_W = 14;
export const FG_STORE_W = 24;
export const BUILDING_HALF_D = 20;

// 설비 배치(m 단위 개략) — 도면과 3D가 같은 값을 씁니다.
export function plantLayout(){
  const GAP = 1.4, ZONE_GAP = 2.6;
  let x = RAW_STORE_W;
  const stations = [];
  BASE_PROCESS.forEach((p, i) => {
    if (i > 0) x += p.zone !== BASE_PROCESS[i-1].zone ? ZONE_GAP : GAP;
    stations.push({...p, id:`BASE-${p.k}`, line:'BASE', z:MAIN_Z, x0:x, x:x+p.w/2, x1:x+p.w});
    x += p.w;
  });
  const branchX = x + 3;                       // 완제품 → 국가별 분기 컨베이어
  const packStart = branchX + 3;
  const packX = {};
  let px = packStart;
  PACK_PROCESS.forEach((p, i) => {
    if (i > 0) px += p.zone !== PACK_PROCESS[i-1].zone ? 4.2 : GAP;
    packX[p.k] = px; px += p.w;
  });
  PACK_LINES.forEach((L, li) => PACK_PROCESS.filter(p => !MERGED_KEYS.includes(p.k)).forEach(p => {
    const x0 = packX[p.k];
    stations.push({...p, id:`${L.id}-${p.k}`, line:L.id, z:PACK_Z[li], x0, x:x0+p.w/2, x1:x0+p.w});
  }));
  PACK_PROCESS.filter(p => MERGED_KEYS.includes(p.k)).forEach(p => {
    const x0 = packX[p.k];
    stations.push({...p, id:`FIN-${p.k}`, line:'FIN', z:MAIN_Z, x0, x:x0+p.w/2, x1:x0+p.w});
  });
  const mergeX = packX.OP - 2.6;               // 소포장 3라인 → 합류 컨베이어
  const total = px + 3 + FG_STORE_W;
  const shift = -total/2;
  stations.forEach(s => { s.x0 += shift; s.x += shift; s.x1 += shift; });
  const xmin = shift, xmax = shift + total;
  const zoneRange = id => { const ss = stations.filter(s => s.zone === id); return [Math.min(...ss.map(s=>s.x0)), Math.max(...ss.map(s=>s.x1))]; };
  const zones = ZONES.map(zn => {
    if (zn.id === 'FG') return {...zn, x1:xmax - FG_STORE_W - 1, x2:xmax};
    const [a, b] = zoneRange(zn.id);
    if (zn.id === 'RAW') return {...zn, x1:xmin, x2:b + ZONE_GAP/2};
    return {...zn, x1:a - ZONE_GAP/2, x2:b + ZONE_GAP/2};
  });
  // 빈틈 메우기: FRY 끝 ~ PACK1 시작(분기 구간 포함), PACK1 ~ PACK2, PACK2 ~ FG
  const Z = id => zones.find(z => z.id === id);
  Z('FRY').x2 = branchX + shift + 1.5; Z('PACK1').x1 = Z('FRY').x2;
  const mid = (Z('PACK1').x2 + Z('PACK2').x1) / 2; Z('PACK1').x2 = mid; Z('PACK2').x1 = mid;
  const mid2 = (Z('PACK2').x2 + Z('PAL').x1) / 2; Z('PACK2').x2 = mid2; Z('PAL').x1 = mid2;
  Z('PAL').x2 = Z('FG').x1;
  return {stations, zones, xmin, xmax, total, halfD:BUILDING_HALF_D, mainZ:MAIN_Z, packZ:PACK_Z, branchX:branchX + shift, mergeX:mergeX + shift, packRoomX:mid};
}

export const LAYOUT_NOTICE='사진·사용자 설명 기반 공정 구성도 · 치수와 국가별 소포장 라인 수는 개략이며 현장 실측 전입니다.';
export const EVIDENCE={photo:'사진 확인',partial:'일부 확인',user:'사용자 확인',assumed:'현장 확인 필요'};
export const PHOTO_NUMBERS={RW:[1,2,3,4,5,7,8],SK:[6,9,10,11,12],ST:[13,14,15,16],EX:[17,18,19,20,21,22],CT:[23,24,25,26,27,28,29,30],D1:[31,32,33,34,35,36,37,38,39],SP:[40,41,42,43,44,45,46,47,48,51],D2:[49,50,52,53,54],OV:[55,56,57,58,59,60],SN:[67,68],QC:[61,62,63],CP:[64,65,66],PL:[67,68]};

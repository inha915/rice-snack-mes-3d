export function calculateProduction({bags,extraRice,retention,additives,reject,packGrams,actualKg}) {
  const values=[bags,extraRice,retention,additives,reject,packGrams,actualKg];
  if(values.some(v=>!Number.isFinite(v))||bags<0||!Number.isInteger(bags)||extraRice<0||retention<0||retention>100||additives<0||reject<0||reject>100||packGrams<=0||actualKg<0) throw new Error('계산값 범위를 확인하세요.');
  const riceKg=bags*50+extraRice;
  const baseKg=riceKg*retention/100;
  const additiveKg=baseKg*additives/100;
  const grossKg=baseKg+additiveKg;
  const rejectKg=grossKg*reject/100;
  const expectedKg=grossKg-rejectKg;
  const packs=Math.floor(expectedKg*1000/packGrams);
  return {riceKg,baseKg,additiveKg,grossKg,rejectKg,expectedKg,packs,remainderKg:expectedKg-packs*packGrams/1000,actualPacks:Math.floor(actualKg*1000/packGrams),actualYield:riceKg?actualKg/riceKg*100:0,achievement:expectedKg?actualKg/expectedKg*100:0};
}


// One rice/base batch can be allocated to several powder-seasoning runs.
// Rice belongs to the parent batch so daily totals never count it per flavor.
export function calculateSeasoningPlan({bags,extraRice,baseKg,allocations}){
  if(!Number.isInteger(bags)||bags<0||!Number.isFinite(extraRice)||extraRice<0||!Number.isFinite(baseKg)||baseKg<0||!Array.isArray(allocations)||!allocations.length)throw new Error('쌀 투입량과 공통 베이스 생산량을 확인하세요.');
  const riceKg=bags*50+extraRice;
  const runs=allocations.map(row=>{
    if(!row.flavor?.trim())throw new Error('맛 / 조미 분말명을 입력하세요.');
    for(const key of ['baseKg','powderKg','adhesion','reject','packGrams','actualKg'])if(!Number.isFinite(row[key])||row[key]<0)throw new Error('맛별 투입값을 확인하세요.');
    if(row.adhesion>100||row.reject>100||row.packGrams<=0||(!row.baseKg&&(row.powderKg||row.actualKg)))throw new Error('분말 부착률·불량률은 0~100%, 포장 중량은 0보다 커야 합니다. 베이스 없이 분말이나 실적을 등록할 수 없습니다.');
    const adheredPowderKg=row.powderKg*row.adhesion/100,unattachedPowderKg=row.powderKg-adheredPowderKg;
    const grossKg=row.baseKg+adheredPowderKg,rejectKg=grossKg*row.reject/100,expectedKg=grossKg-rejectKg;
    const packaging=row.innerGrams!==undefined?packagingCounts(row.actualKg,row):null;
    const expectedPackaging=packaging?packagingCounts(expectedKg,row):null;
    return {...row,packaging,expectedPackaging,flavor:row.flavor.trim(),adheredPowderKg,unattachedPowderKg,grossKg,rejectKg,expectedKg,packs:expectedPackaging?.outerPacks??Math.floor(expectedKg*1000/row.packGrams),actualPacks:packaging?.outerPacks??Math.floor(row.actualKg*1000/row.packGrams)};
  });
  const sum=k=>runs.reduce((s,r)=>s+r[k],0),allocatedBaseKg=sum('baseKg');
  if(allocatedBaseKg-baseKg>1e-8)throw new Error('맛별 베이스 배분 합계가 공통 베이스 생산량을 초과합니다.');
  return {riceKg,baseKg,allocatedBaseKg,unallocatedBaseKg:Math.max(0,baseKg-allocatedBaseKg),powderInputKg:sum('powderKg'),additiveKg:sum('adheredPowderKg'),unattachedPowderKg:sum('unattachedPowderKg'),expectedKg:sum('expectedKg'),actualKg:sum('actualKg'),packs:sum('packs'),actualPacks:sum('actualPacks'),rejectKg:sum('rejectKg'),actualYield:riceKg?sum('actualKg')/riceKg*100:0,allocations:runs};
}

export function packagingCounts(kg,{innerGrams,innersPerOuter,outersPerCase}){
 if(!Number.isFinite(kg)||kg<0||!Number.isFinite(innerGrams)||innerGrams<=0||!Number.isInteger(innersPerOuter)||innersPerOuter<1||!Number.isInteger(outersPerCase)||outersPerCase<1)throw new Error('소포장 중량은 0보다 크게, 외포장·박스 수량은 1 이상의 정수로 입력하세요.');
 const innerPacks=Math.floor((kg*1000+1e-8)/innerGrams),outerPacks=Math.floor(innerPacks/innersPerOuter),cases=Math.floor(outerPacks/outersPerCase);
 return {innerPacks,outerPacks,cases,looseInnerPacks:innerPacks%innersPerOuter,looseOuterPacks:outerPacks%outersPerCase,looseKg:Math.max(0,kg-innerPacks*innerGrams/1000)};
}

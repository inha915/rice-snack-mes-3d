import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateProduction} from './production.js';
const defaults={bags:1,extraRice:0,retention:90,additives:10,reject:2,packGrams:150,actualKg:40};
test('50kg bag, mass balance, additives, rejects and package floor',()=>{const r=calculateProduction(defaults);assert.equal(r.riceKg,50);assert.equal(r.baseKg,45);assert.equal(r.additiveKg,4.5);assert.equal(r.expectedKg,48.51);assert.equal(r.packs,323);assert.ok(Math.abs(r.remainderKg-.06)<1e-8);assert.equal(r.actualYield,80);});
test('zero input is finite',()=>{const r=calculateProduction({...defaults,bags:0,actualKg:0});assert.equal(r.expectedKg,0);assert.equal(r.achievement,0);assert.equal(r.actualYield,0);});
test('reject invalid settings',()=>{for(const change of [{packGrams:0},{bags:-1},{bags:1.5},{reject:101},{retention:NaN}])assert.throws(()=>calculateProduction({...defaults,...change}));});
test('full rejection makes zero packaged output',()=>assert.equal(calculateProduction({...defaults,reject:100}).packs,0));

import {dailyProduction,equipmentMetrics,plantDay} from './metrics.js';
test('plant calendar uses Vietnam midnight, and filters other days',()=>{assert.equal(plantDay('2026-11-08T17:00:00Z'),'2026-11-09');const rows=[{date:'2026-11-08T17:00:00Z',line:'L1',riceKg:100,actualKg:80,actualPacks:400},{date:'2026-11-09T01:00:00Z',line:'L2',riceKg:50,actualKg:50,actualPacks:500},{date:'2026-11-08T16:59:59Z',riceKg:999}];const d=dailyProduction(rows,'2026-11-09T10:00:00Z');assert.equal(d.riceKg,150);assert.equal(d.actualKg,130);assert.equal(d.actualPacks,900);assert.ok(Math.abs(d.yieldPct-130/150*100)<1e-9);assert.equal(dailyProduction(rows,'2026-11-09','L1').actualKg,80);assert.equal(dailyProduction([],'2026-11-09').yieldPct,null);});
test('OEE is derived from counters and handles missing data',()=>{const m=equipmentMetrics({plannedSeconds:100,runSeconds:90,totalCount:40,goodCount:38,idealCycleSeconds:2});assert.equal(m.availability,.9);assert.equal(m.quality,.95);assert.ok(Math.abs(m.oee-.76)<1e-9);assert.equal(equipmentMetrics({}).oee,null);});

import {calculateSeasoningPlan} from './production.js';
const run={flavor:'分말 A',baseKg:60,powderKg:6,adhesion:80,reject:2,packGrams:150,actualKg:62};
test('shared base is divided into flavors without duplicating rice',()=>{const p=calculateSeasoningPlan({bags:2,extraRice:0,baseKg:90,allocations:[run,{...run,flavor:'분말 B',baseKg:30,powderKg:3,actualKg:30}]});assert.equal(p.riceKg,100);assert.equal(p.allocatedBaseKg,90);assert.equal(p.unallocatedBaseKg,0);assert.ok(Math.abs(p.additiveKg-7.2)<1e-8);assert.ok(Math.abs(p.expectedKg-95.256)<1e-8);assert.equal(p.actualKg,92);assert.equal(p.actualPacks,Math.floor(62000/150)+Math.floor(30000/150));});
test('reject base over-allocation and invalid powder adhesion',()=>{assert.throws(()=>calculateSeasoningPlan({bags:2,extraRice:0,baseKg:50,allocations:[run]}));assert.throws(()=>calculateSeasoningPlan({bags:2,extraRice:0,baseKg:90,allocations:[{...run,adhesion:101}]}));});
test('unallocated common base is tracked separately',()=>{const p=calculateSeasoningPlan({bags:2,extraRice:0,baseKg:90,allocations:[run]});assert.equal(p.unallocatedBaseKg,30);assert.ok(Math.abs(p.unattachedPowderKg-1.2)<1e-8);});

import {packagingCounts} from './production.js';
import {PROCESS,BASE_PROCESS,PACK_LINES,plantLayout} from './process.js';
import {initialMachines} from './data.js';
test('two-level packaging preserves remainder at each level',()=>{const r=packagingCounts(1.019,{innerGrams:15,innersPerOuter:10,outersPerCase:4});assert.equal(r.innerPacks,67);assert.equal(r.outerPacks,6);assert.equal(r.cases,1);assert.equal(r.looseInnerPacks,7);assert.equal(r.looseOuterPacks,2);assert.ok(Math.abs(r.looseKg-.014)<1e-9);assert.throws(()=>packagingCounts(1,{innerGrams:15,innersPerOuter:1.5,outersPerCase:4}));});
test('single base line of 10 processes, 10 soak tanks, market pack lines with separate final room',()=>{const l=plantLayout();const base=l.stations.filter(s=>s.line==='BASE');assert.equal(base.length,10);assert.deepEqual(base.map(s=>s.no),[1,2,3,4,5,6,7,8,9,10]);assert.equal(BASE_PROCESS.find(p=>p.k==='SK').tanks,10);assert.ok(!PROCESS.some(p=>p.k==='DW'||p.k==='ML'));const keys=base.map(s=>s.k);assert.ok(keys.indexOf('SK')+1===keys.indexOf('ST'));assert.ok(keys.indexOf('SP')<keys.indexOf('D2'));assert.equal(BASE_PROCESS.find(p=>p.k==='D2').moistureMax,10);
 for(const L of PACK_LINES){const ks=l.stations.filter(s=>s.line===L.id).map(s=>s.k);assert.deepEqual(ks,['WP']);}assert.deepEqual(l.stations.filter(s=>s.line==='FIN').map(s=>s.k),['OP','QC','CP','PL']);assert.ok(l.mergeX>Math.max(...l.stations.filter(s=>s.k==='WP').map(s=>s.x1))&&l.mergeX<l.stations.find(s=>s.id==='FIN-OP').x0);
 const room=l.zones.find(z=>z.id==='PACK2');assert.ok(l.stations.filter(s=>['OP','QC','CP'].includes(s.k)).every(s=>s.x0>=room.x1&&s.x1<=room.x2));assert.ok(l.stations.filter(s=>s.k==='WP').every(s=>s.x1<room.x1));const pal=l.zones.find(z=>z.id==='PAL');assert.ok(l.stations.filter(s=>s.k==='PL').every(s=>s.x0>=room.x2&&s.x1<=pal.x2));
 assert.ok(l.stations.every(s=>s.x0>=l.xmin&&s.x1<=l.xmax));assert.equal(initialMachines().length,l.stations.length);assert.equal(new Set(l.stations.map(s=>s.id)).size,l.stations.length);assert.equal(initialMachines().filter(m=>m.seal).length,PACK_LINES.length+1);});
import {initialLive,stepLive,liveTotals,LIVE_CFG} from './live.js';
test('live counters: market lines count bags, merged final line counts bundles/boxes/pallets',()=>{const z={riceKg:0,productG:0,rateKgH:0,moisture:8,buffer:0,lines:Object.fromEntries(PACK_LINES.map(L=>[L.id,{g:0,bags:0}])),fin:{bagsIn:0,bundles:0,boxes:0,pallets:0,metalNg:0,weightNg:0,bundleG:217}};
 const run={BASE:true,PA:true,PB:true,PC:false,FIN:true};let v=z;for(let i=0;i<3600;i++)v=stepLive(v,1,run,LIVE_CFG,()=>.5);
 assert.ok(Math.abs(v.riceKg-LIVE_CFG.riceKgPerHour)<1e-6);assert.ok(Math.abs(v.productG-LIVE_CFG.riceKgPerHour*1000*LIVE_CFG.productPerRice)<1e-3);assert.equal(v.lines.PC.g,0);
 const t=liveTotals(v);assert.ok(Math.abs(t.packedG-v.productG)<1e-3);assert.equal(v.fin.bagsIn,t.bags);assert.equal(v.fin.bundles,Math.floor(t.bags/LIVE_CFG.innersPerOuter));assert.equal(v.fin.boxes,Math.floor(v.fin.bundles/LIVE_CFG.outersPerCase));assert.equal(v.fin.pallets,Math.floor(v.fin.boxes/LIVE_CFG.casesPerPallet));
 assert.ok(v.fin.bundleG>=LIVE_CFG.bundleSpec.min&&v.fin.bundleG<=LIVE_CFG.bundleSpec.max);
 const stop=stepLive(v,10,{BASE:false,PA:true,PB:true,PC:true,FIN:true},LIVE_CFG,()=>.5);assert.equal(stop.riceKg,v.riceKg);assert.equal(stop.rateKgH,0);
 const finStop=stepLive(v,60,{BASE:true,PA:true,PB:true,PC:true,FIN:false},LIVE_CFG,()=>.5);assert.equal(finStop.lines.PA.bags,v.lines.PA.bags);assert.ok(finStop.buffer>0);assert.ok(initialLive(new Date('2026-11-10T05:00:00Z')).fin.bundles>0);});

test('seasoning plan saves inner/outer/case counts together',()=>{const p=calculateSeasoningPlan({bags:2,extraRice:0,baseKg:90,allocations:[{...run,innerGrams:15,innersPerOuter:10,outersPerCase:12}]});const r=p.allocations[0];assert.equal(r.packaging.innerPacks,4133);assert.equal(r.packaging.outerPacks,413);assert.equal(r.packaging.cases,34);assert.equal(r.actualPacks,413);assert.equal(p.actualPacks,413);});

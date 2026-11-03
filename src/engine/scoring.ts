import {counts,label,rank,wenqian} from './cards';
import {groupValue,RULES} from './config';
import {enumerateSplits} from './winning';
import type {Tile,Meld,Split,Score,Line,Group} from './types';
export type WinContext={indicators:Tile[];winTile:Tile;selfDraw:boolean;heavenly?:boolean;kongDraw?:boolean};
const names={peng:'明刻',openKong:'明杠',closedKong:'暗杠',dragon:'起手龙',calledPair:'双指示叫牌锁头'};
function honorMask(types:number[]){return [27,28,29].every(t=>types.includes(t));}
function meldLines(melds:Meld[],indicators:Tile[],threeOld:boolean):Line[]{return melds.map(m=>({label:`${label(m.type)} · ${names[m.kind]}`,value:groupValue(m.type,m.kind,indicators)*(threeOld&&m.type>=27&&m.kind!=='calledPair'?2:1),detail:m.indicatorIds?.length?'借公共指示牌计分，实体不移入手牌':undefined}));}
function finish(kind:string,base:number,lines:Line[],extras:Line[],mult:Line[],split?:Split):Score{
 const raw=lines.reduce((s,x)=>s+x.value,0);let total=base+raw+extras.reduce((s,x)=>s+x.value,0);
 for(const m of mult)total*=m.value;
 const rounded=Math.ceil(total/10)*10;
 return {kind,total:rounded,base,raw,rounded,groupLines:lines,extras,multipliers:mult,split};
}
export function scoreWin(hand:Tile[],melds:Meld[],context:WinContext):Score|null{
 const splits=enumerateSplits(hand,melds);let best:Score|null=null;
 for(const split of splits){
  const n=split.groups.filter(wenqian).length;
  const allSeq=melds.every(m=>m.kind==='calledPair')&&split.groups.every(g=>g.kind==='sequence');
  const allPiao=split.groups.every(g=>g.kind==='triplet'||wenqian(g));
  const kinds:string[]=[];if(allSeq)kinds.push('清胡');if(allPiao)kinds.push('飘胡');if(!allSeq&&!allPiao)kinds.push('塌子胡');
  const placements:{group:number;wait:string}[]=[];
  if(split.pair===context.winTile.type&&!melds.some(m=>m.kind==='calledPair'))placements.push({group:-1,wait:'单吊将头'});
  split.groups.forEach((g,i)=>{
   if(g.kind==='triplet'&&g.type===context.winTile.type)placements.push({group:i,wait:''});
   if(g.kind==='sequence'&&context.winTile.type>=g.type&&context.winTile.type<=g.type+2){const r=rank(context.winTile.type);const wait=context.winTile.type===g.type+1?'丫子（中间张）':rank(g.type)===1&&r===3||rank(g.type)===7&&r===7?'边张':'';placements.push({group:i,wait});}
  });
  if(!placements.length)placements.push({group:-2,wait:''});
  for(const place of placements){
   const triples=split.groups.filter(g=>g.kind==='triplet');
   const threeOld=honorMask([...triples.map(g=>g.type),...melds.filter(m=>m.kind!=='calledPair').map(m=>m.type)]);
   const lines=meldLines(melds,context.indicators,threeOld);
   split.groups.forEach((g,i)=>{if(g.kind==='triplet'){
    const concealed=context.selfDraw||i!==place.group;
    lines.push({label:`${label(g.type)} · ${concealed?'暗刻':'胡入明刻'}`,value:groupValue(g.type,'triplet',context.indicators,concealed)*(threeOld&&g.type>=27?2:1)});
   }});
   if(n>=3)for(const type of [18,19,20])lines.push({label:`${label(type)} · 三文钱重复暗刻`,value:groupValue(type,'triplet',context.indicators)});
   const extras:Line[]=[];
   if(n)extras.push({label:`${n}组文钱`,value:RULES.wenqian[n]??200});
   if(context.selfDraw&&!context.heavenly)extras.push({label:'自摸',value:10});
   if(place.wait&&!context.heavenly)extras.push({label:place.wait,value:10});
   if(context.kongDraw)extras.push({label:'杠开',value:10});
   if(threeOld)lines.push({label:'三老会齐',value:0,detail:'红花、白花、千字组牌分已各翻倍'});
   for(const kind of kinds){const mult:Line[]=[];
    if(kind==='飘胡'){
     mult.push({label:'飘胡',value:2});
     if(!melds.some(m=>m.kind==='peng'||m.kind==='openKong'))mult.push({label:'闷飘',value:2});
    }
    if(context.heavenly)mult.push({label:'天成',value:2});
    const score=finish(kind,RULES.base[kind as keyof typeof RULES.base],lines,extras,mult,split);
    if(!best||score.total>best.total)best=score;
   }
  }
 }
 return best;
}
export function scoreUnwon(hand:Tile[],melds:Meld[],indicators:Tile[]):Score{
 const c=counts(hand);const threeOld=honorMask([...melds.filter(m=>m.kind!=='calledPair').map(m=>m.type),...c.map((v,t)=>v>=3?t:-1)]);
 let best:Score|null=null;
 const maxW=Math.min(c[18],c[19],c[20]);
 for(let w=0;w<=maxW;w++){
  const rest=[...c];for(const t of [18,19,20])rest[t]-=w;
  const lines=meldLines(melds,indicators,threeOld);
  rest.forEach((v,t)=>{if(v>=3){const value=v===4?Math.max(groupValue(t,'closedKong',indicators),groupValue(t,'triplet',indicators)):groupValue(t,'triplet',indicators);lines.push({label:`${label(t)} · ${v===4?'在手四张':'暗刻'}`,value:value*(threeOld&&t>=27?2:1)});}});
  if(w>=3)for(const t of [18,19,20])lines.push({label:`${label(t)} · 三文钱重复暗刻`,value:groupValue(t,'triplet',indicators)});
  const extras=w?[{label:`${w}组文钱`,value:RULES.wenqian[w]??200}]:[];
  const score=finish('未胡 · 组合胡',0,lines,extras,[]);
  if(!best||score.total>best.total)best=score;
 }
 return best!;
}
export function describeSplit(split:Split){return [...split.groups.map((g:Group)=>g.kind==='triplet'?`${label(g.type)}×3`:`${label(g.type)}·${label(g.type+1)}·${label(g.type+2)}`),`${label(split.pair)}×2（将头）`];}

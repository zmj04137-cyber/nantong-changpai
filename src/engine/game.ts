import {makeDeck,shuffle,sorted,counts,label} from './cards';
import {canWin} from './winning';
import {scoreUnwon,scoreWin} from './scoring';
import {chooseDiscard,wantsPeng} from './ai';
import type {Tile,Game,Action,Declaration,TurnAction,Choice,Score} from './types';
export const PLAYER_NAMES=['你','梅生','晚晴','江舟'];
const log=(g:Game,s:string)=>{g.log=[s,...g.log].slice(0,80);};
function event(g:Game,kind:NonNullable<Game['visual']>['event']['kind'],actor:number,tile?:Tile){const serial=(g.visual?.serial??0)+1;g.visual={...g.visual,serial,event:{kind,actor,tile,serial}};}
export function newGame(previous?:Game,rng:()=>number=Math.random):Game{
 const dealer=previous?(previous.dealer+1)%4:Math.floor(rng()*4),sleeper=(dealer+3)%4;
 const active=[dealer,(dealer+1)%4,(dealer+2)%4];
 const deck=shuffle(makeDeck(),rng);
 const players=PLAYER_NAMES.map((name,i)=>({name,hand:[] as Tile[],melds:[],river:[] as Tile[],score:previous?.players[i].score??0}));
 for(let r=0;r<22;r++)for(const seat of active)players[seat].hand.push(deck.shift()!);
 players[dealer].hand.push(deck.shift()!);
 const indicators=[deck.pop()!,deck.pop()!];
 for(const p of players)p.hand=sorted(p.hand);
 const g:Game={version:1,round:(previous?.round??0)+1,dealer,sleeper,active,players,deck,indicators,turn:dealer,phase:'declarations',declareQueue:[...active],discards:0,log:[`第${(previous?.round??0)+1}局 · ${players[dealer].name}坐庄，${players[sleeper].name}定醒`,`翻将：${indicators.map(t=>label(t.type)).join(' / ')}`]};
 g.roundId=crypto.randomUUID();event(g,'deal',dealer);assertGame(g);return g;
}
export function declarations(g:Game,seat:number):Declaration[]{
 if(g.phase!=='declarations'||g.declareQueue[0]!==seat)return [];
 const p=g.players[seat],c=counts(p.hand);const out:Declaration[]=[];
 for(let t=0;t<30;t++){
  if(p.melds.some(m=>m.type===t))continue;
  const refs=g.indicators.filter(i=>i.type===t).map(i=>i.id);
  if(c[t]===4)out.push({type:t,kind:'dragon',count:4,indicators:[]});
  else if(c[t]===3&&refs.length===1)out.push({type:t,kind:'dragon',count:3,indicators:refs});
  else if(c[t]===2&&refs.length===2&&!p.melds.some(m=>m.kind==='calledPair'))out.push({type:t,kind:'calledPair',count:2,indicators:refs});
 }
 return out;
}
export function turnKongs(g:Game):TurnAction[]{
 if(g.phase!=='discard'||g.lastDraw?.player!==g.turn)return [];
 const p=g.players[g.turn],c=counts(p.hand),out:TurnAction[]=[];
 c.forEach((n,t)=>{if(n===4)out.push({kind:'closedKong',type:t});if(n&&p.melds.some(m=>m.type===t&&m.kind==='peng'))out.push({kind:'addKong',type:t});});return out;
}
export function selfWin(g:Game){return g.phase==='discard'&&canWin(g.players[g.turn].hand,g.players[g.turn].melds);}
function take(g:Game,seat:number,type:number,n:number){const p=g.players[seat],out:Tile[]=[];for(let k=0;k<n;k++){const i=p.hand.findIndex(t=>t.type===type);if(i<0)throw Error('手牌不足');out.push(p.hand.splice(i,1)[0]);}return out;}
function removeDiscard(g:Game){if(!g.pending)throw Error('无待响应牌');const p=g.players[g.pending.from];const i=p.river.findIndex(t=>t.id===g.pending!.tile.id);if(i<0)throw Error('弃牌不存在');p.river.splice(i,1);}
function nextSeat(g:Game,from:number){return g.active[(g.active.indexOf(from)+1)%3];}
function draw(g:Game,seat:number,tail=false){
 if(!g.deck.length){settle(g,null,null,null,false);return;}
 const tile=(tail?g.deck.pop():g.deck.shift())!;g.players[seat].hand=sorted([...g.players[seat].hand,tile]);g.turn=seat;g.phase='discard';g.lastDraw={player:seat,tile,kong:tail};
 event(g,tail?'kong':'draw',seat,tile);
 log(g,`${g.players[seat].name}${tail?'从牌尾补牌':'摸牌'}`);
}
function buildChoices(g:Game,tile:Tile,from:number){
 const order=[nextSeat(g,from),nextSeat(g,nextSeat(g,from))],choices:Choice[]=[];
 for(const s of order)if(canWin([...g.players[s].hand,tile],g.players[s].melds))choices.push({player:s,actions:['hu']});
 for(const s of order)if(counts(g.players[s].hand)[tile.type]===3)choices.push({player:s,actions:['kong']});
 for(const s of order)if(counts(g.players[s].hand)[tile.type]>=2)choices.push({player:s,actions:['peng']});
 return choices;
}
function settle(g:Game,winner:number|null,from:number|null,tile:Tile|null,selfDraw:boolean){
 const zero:Score={total:0,kind:'定醒',base:0,raw:0,rounded:0,groupLines:[],extras:[],multipliers:[]};
 const scores=g.players.map((p,i)=>i===g.sleeper?zero:scoreUnwon(p.hand,p.melds,g.indicators));
 if(winner!==null){
  const p=g.players[winner],heavenly=winner===g.dealer&&g.discards===0&&!g.lastDraw;
  const score=scoreWin(p.hand,p.melds,{indicators:g.indicators,winTile:tile??p.hand[p.hand.length-1],selfDraw,heavenly,kongDraw:selfDraw&&g.lastDraw?.kong});
  if(!score)throw Error('不是合法胡牌');scores[winner]=score;
 }
 const deltas=[0,0,0,0];for(const a of g.active)for(const b of g.active)if(a!==b)deltas[a]+=scores[a].total-scores[b].total;
 g.players.forEach((p,i)=>p.score+=deltas[i]);g.phase='finished';delete g.pending;
 g.result={winner,from,tile,selfDraw,scores,deltas,reason:winner===null?'牌尽流局':`${g.players[winner].name}${selfDraw?'自摸':'胡牌'} · ${scores[winner].kind}`};
 log(g,winner===null?'牌堆耗尽，结算三家组合胡':`${g.players[winner].name}成胡，${scores[winner].total}胡`);
}
export function reduceGame(state:Game,action:Action):Game{
 if(state.phase==='finished')return state;
 const g:Game=structuredClone(state);
 if(action.kind==='declare'){
  const seat=g.declareQueue[0],d=declarations(g,seat).find(x=>x.type===action.type);if(!d)throw Error('不可声明该组合');
  const tiles=take(g,seat,d.type,d.count);g.players[seat].melds.push({kind:d.kind,type:d.type,tiles,indicatorIds:d.indicators});
  log(g,`${g.players[seat].name}声明${d.kind==='calledPair'?'叫牌锁头':'起手龙'}：${label(d.type)}`);
  event(g,'dragon',seat,tiles[0]);
  if(d.count===4){if(!g.deck.length)settle(g,null,null,null,false);else g.players[seat].hand=sorted([...g.players[seat].hand,g.deck.pop()!]);}
 }else if(action.kind==='skipDeclare'){
  if(g.phase!=='declarations')throw Error('不在亮牌阶段');g.declareQueue.shift();if(!g.declareQueue.length){g.phase='discard';g.turn=g.dealer;}
 }else if(action.kind==='discard'){
  if(g.phase!=='discard')throw Error('尚不可出牌');const p=g.players[g.turn],i=p.hand.findIndex(t=>t.id===action.id);if(i<0)throw Error('请选择自己的手牌');
  const tile=p.hand.splice(i,1)[0];p.river.push(tile);g.discards++;log(g,`${p.name}打出${label(tile.type)}`);delete g.lastDraw;
  const oldPlay=g.visual?.play;event(g,'discard',g.turn,tile);g.visual!.archive=oldPlay?{...oldPlay,serial:g.visual!.serial}:undefined;g.visual!.play={tile,from:g.turn};
  const from=g.turn,choices=buildChoices(g,tile,from);if(choices.length){g.pending={tile,from,choices};g.phase='response';}else draw(g,nextSeat(g,from));
 }else if(action.kind==='hu'){
  if(!selfWin(g))throw Error('当前不能胡');settle(g,g.turn,null,g.lastDraw?.tile??null,true);
 }else if(action.kind==='closedKong'||action.kind==='addKong'){
  if(!turnKongs(g).some(a=>a.kind===action.kind&&a.type===action.type))throw Error('当前不可杠');
  if(action.kind==='closedKong')g.players[g.turn].melds.push({kind:'closedKong',type:action.type,tiles:take(g,g.turn,action.type,4)});
  else {const m=g.players[g.turn].melds.find(x=>x.type===action.type&&x.kind==='peng')!;m.tiles.push(...take(g,g.turn,action.type,1));m.kind='openKong';}
  log(g,`${g.players[g.turn].name}${action.kind==='closedKong'?'暗杠':'补杠'}${label(action.type)}`);draw(g,g.turn,true);
 }else if(action.kind==='respond'){
  if(g.phase!=='response'||!g.pending||g.pending.choices[0]?.player!==action.player)throw Error('尚未轮到该响应');
  const p=g.pending,current=p.choices[0];if(action.action!=='pass'&&!current.actions.includes(action.action))throw Error('非法响应');
  if(action.action==='pass'){
   p.choices.shift();if(!p.choices.length){delete g.pending;draw(g,nextSeat(g,p.from));}
  }else if(action.action==='hu'){
   removeDiscard(g);g.players[action.player].hand=sorted([...g.players[action.player].hand,p.tile]);settle(g,action.player,p.from,p.tile,false);
  }else{
   removeDiscard(g);const n=action.action==='kong'?3:2,tiles=take(g,action.player,p.tile.type,n);
   g.players[action.player].melds.push({kind:action.action==='kong'?'openKong':'peng',type:p.tile.type,tiles:[...tiles,p.tile],from:p.from});
   log(g,`${g.players[action.player].name}${action.action==='kong'?'杠':'碰'}${label(p.tile.type)}`);
   event(g,action.action==='kong'?'kong':'peng',action.player,p.tile);delete g.visual!.play;delete g.visual!.archive;
   delete g.pending;delete g.lastDraw;g.turn=action.player;g.phase='discard';if(action.action==='kong')draw(g,action.player,true);
  }
 }
 assertGame(g);return g;
}
export function aiAction(g:Game,allowHuman=false):Action|null{
 if(g.phase==='finished')return null;
 if(g.phase==='declarations'){
  const s=g.declareQueue[0];if(s===0&&!allowHuman)return null;const d=declarations(g,s)[0];return d?{kind:'declare',type:d.type}:{kind:'skipDeclare'};
 }
 if(g.phase==='response'){
  const choice=g.pending!.choices[0];if(choice.player===0&&!allowHuman)return null;const a=choice.actions[0];
  return {kind:'respond',player:choice.player,action:a==='peng'&&!wantsPeng(g.players[choice.player].hand,g.pending!.tile.type)?'pass':a};
 }
 if(g.turn===0&&!allowHuman)return null;
 if(selfWin(g))return {kind:'hu'};
 const kong=turnKongs(g)[0];if(kong)return kong;
 const p=g.players[g.turn];const publicTiles=[...g.indicators,...g.players.flatMap(x=>x.river),...g.players.flatMap(x=>x.melds.flatMap(m=>m.kind==='closedKong'?[]:m.tiles))];
 return {kind:'discard',id:chooseDiscard({hand:p.hand,melds:p.melds,publicTiles,indicators:g.indicators}).id};
}
export function assertGame(g:Game){
 const all=[...g.deck,...g.indicators,...g.players.flatMap(p=>[...p.hand,...p.river,...p.melds.flatMap(m=>m.tiles)])];
 if(all.length!==120||new Set(all.map(t=>t.id)).size!==120)throw Error('牌数守恒检查失败');
 for(const t of all)if(t.type!==Math.floor(t.id/4)||t.id<0||t.id>=120)throw Error('实体牌编号不匹配');
 if(g.active.length!==3||g.active.includes(g.sleeper)||new Set(g.active).size!==3)throw Error('座位状态错误');
 if(g.players[g.sleeper].hand.length||g.players[g.sleeper].melds.length)throw Error('定醒者不得持牌');
 for(const seat of g.active){const p=g.players[seat],pairs=p.melds.filter(m=>m.kind==='calledPair').length;
  if(pairs>1)throw Error('锁头只能一对');
  const base=22-3*p.melds.filter(m=>m.kind!=='calledPair').length-2*pairs;
  if(g.phase==='declarations'){const expected=seat===g.dealer?base+1:base;if(p.hand.length!==expected)throw Error('起手补牌数量不合法');}
  else if(g.phase!=='finished'){const expected=g.phase==='discard'&&g.turn===seat?base+1:base;if(p.hand.length!==expected)throw Error('行牌手牌结构不合法');}
 }
 if(g.result&&g.result.deltas.reduce((a,b)=>a+b,0)!==0)throw Error('结算积分不守恒');
}

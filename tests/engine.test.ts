import {describe,it,expect} from 'vitest';
import {makeDeck,counts,sorted} from '../src/engine/cards';
import {newGame,reduceGame,assertGame,aiAction,declarations,selfWin,turnKongs} from '../src/engine/game';
import {enumerateSplits,canWin} from '../src/engine/winning';
import {groupValue} from '../src/engine/config';
import {scoreWin,scoreUnwon} from '../src/engine/scoring';
import type {Tile,Game,Meld} from '../src/engine/types';
function tiles(types:number[]):Tile[]{const used=Array(30).fill(0);return types.map(type=>({type,id:type*4+used[type]++}));}
const trip=(t:number)=>[t,t,t],seq=(t:number)=>[t,t+1,t+2];
const indicators=tiles([4,12]);
function rig(hands:Record<number,number[]>,inds=[6,15]):Game{
 const g=newGame(undefined,()=>0);const pool=makeDeck();const take=(type:number)=>{const i=pool.findIndex(t=>t.type===type);if(i<0)throw Error(`fixture overcount ${type}`);return pool.splice(i,1)[0];};
 g.indicators=inds.map(take);g.players.forEach(p=>{p.hand=[];p.melds=[];p.river=[];});
 for(const [s,types] of Object.entries(hands))g.players[Number(s)].hand=types.map(take);
 for(const s of g.active)if(!hands[s])g.players[s].hand=pool.splice(0,s===0?23:22);
 g.deck=pool;g.phase='discard';g.turn=0;g.declareQueue=[];g.discards=1;g.lastDraw={player:0,tile:g.players[0].hand.at(-1)!,kong:false};assertGame(g);return g;
}
const filler=[0,1,2,3,4,5,7,8,9,10,11,12,13,14,16,18,19,20,21,22];
describe('实体牌与整局流程',()=>{
 it('自动理牌同花色连续、数字从小到大、同牌副本相邻且不修改原手牌',()=>{const input=makeDeck().reverse(),before=input.map(t=>t.id),out=sorted(input);expect(out.map(t=>t.type)).toEqual(Array.from({length:120},(_,i)=>Math.floor(i/4)));expect(out.map(t=>t.id)).toEqual(Array.from({length:120},(_,i)=>i));expect(input.map(t=>t.id)).toEqual(before);});
 it('120个唯一编号，23/22/22与双尾将，四局轮换覆盖定醒',()=>{let g=newGame(undefined,()=>0);const sleepers=[];for(let i=0;i<4;i++){assertGame(g);expect(g.deck).toHaveLength(51);expect(g.indicators).toHaveLength(2);expect(g.players[g.dealer].hand).toHaveLength(23);sleepers.push(g.sleeper);g=newGame(g);}expect(new Set(sleepers).size).toBe(4);});
 it('碰后必须出牌且不额外摸牌',()=>{let g=rig({0:[24,...filler,25,26],1:[24,24,...filler]});g=reduceGame(g,{kind:'discard',id:g.players[0].hand.find(t=>t.type===24)!.id});while(g.pending?.choices[0].actions[0]!=='peng')g=reduceGame(g,{kind:'respond',player:g.pending!.choices[0].player,action:'pass'});const n=g.deck.length;g=reduceGame(g,{kind:'respond',player:1,action:'peng'});expect(g.turn).toBe(1);expect(g.players[1].hand).toHaveLength(20);expect(g.deck).toHaveLength(n);expect(turnKongs(g)).toHaveLength(0);assertGame(g);});
 it('暗杠及明杠从尾补牌、组合结构和实体数量分别守恒',()=>{let g=rig({0:[...Array(4).fill(27),...filler.slice(0,19)]});const tail=g.deck.at(-1)!;g=reduceGame(g,{kind:'closedKong',type:27});expect(g.players[0].melds[0].tiles.length).toBe(4);expect(g.players[0].hand).toHaveLength(20);expect(g.lastDraw!.tile.id).toBe(tail.id);expect(g.lastDraw!.kong).toBe(true);assertGame(g);});
 it('起手四张龙补1，三张借一指示不补',()=>{let g=rig({0:[...trip(27),...filler] },[27,15]);g.phase='declarations';g.declareQueue=[0,1,2];delete g.lastDraw;const n=g.deck.length;expect(declarations(g,0).find(d=>d.type===27)?.count).toBe(3);g=reduceGame(g,{kind:'declare',type:27});expect(g.deck.length).toBe(n);expect(g.players[0].hand).toHaveLength(20);expect(g.indicators).toHaveLength(2);assertGame(g);
 let q=rig({0:[27,27,27,27,...filler.slice(0,19)]});q.phase='declarations';q.declareQueue=[0,1,2];delete q.lastDraw;const len=q.deck.length;q=reduceGame(q,{kind:'declare',type:27});expect(q.deck.length).toBe(len-1);expect(q.players[0].hand.length).toBe(20);assertGame(q);});
 it('双同将两实体锁头不补牌，剩余21张组成七组',()=>{let g=rig({0:[27,27,...filler,25]},[27,27]);g.phase='declarations';g.declareQueue=[0,1,2];delete g.lastDraw;g=reduceGame(g,{kind:'declare',type:27});expect(g.players[0].melds[0].kind).toBe('calledPair');expect(g.players[0].hand.length).toBe(21);assertGame(g);});
 it('两人同时可胡只准逆时针近家先胡，近家过后远家可胡',()=>{const wait=[...seq(0),...seq(3),...seq(6),...seq(9),...seq(12),...seq(15),...seq(18),29];let g=rig({0:[29,24,24,24,25,25,25,26,26,26,27,27,27,28,28,28,21,22,23,21,22,23,23],1:wait,2:wait},[24,25]);g=reduceGame(g,{kind:'discard',id:g.players[0].hand.find(t=>t.type===29)!.id});expect(g.pending!.choices.slice(0,2).map(c=>c.player)).toEqual([1,2]);expect(g.pending!.choices[0].actions).toEqual(['hu']);const won=reduceGame(g,{kind:'respond',player:1,action:'hu'});expect(won.result!.winner).toBe(1);assertGame(won);g=reduceGame(g,{kind:'respond',player:1,action:'pass'});g=reduceGame(g,{kind:'respond',player:2,action:'hu'});expect(g.result!.winner).toBe(2);expect(g.result!.deltas.reduce((s,v)=>s+v,0)).toBe(0);});
 it('明杠接牌后从牌尾补1',()=>{let g=rig({0:[24,...filler,25,26],1:[24,24,24,...filler.slice(0,19)]});g=reduceGame(g,{kind:'discard',id:g.players[0].hand.find(t=>t.type===24)!.id});while(g.pending!.choices[0].actions[0]==='hu')g=reduceGame(g,{kind:'respond',player:g.pending!.choices[0].player,action:'pass'});expect(g.pending!.choices[0].actions).toEqual(['kong']);const tail=g.deck.at(-1)!;g=reduceGame(g,{kind:'respond',player:1,action:'kong'});expect(g.players[1].melds[0].tiles).toHaveLength(4);expect(g.players[1].hand).toHaveLength(20);expect(g.lastDraw!.tile.id).toBe(tail.id);assertGame(g);});
 it('100局电脑完整走至成胡或流局，所有动作守恒，积分净和0',()=>{let seed=987;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};let previous:Game|undefined;for(let i=0;i<100;i++){let g=newGame(previous,rng);let steps=0;while(g.phase!=='finished'&&steps<800){const a=aiAction(g,true);expect(a).not.toBeNull();g=reduceGame(g,a!);assertGame(g);steps++;}expect(g.phase).toBe('finished');expect(g.players.reduce((s,p)=>s+p.score,0)).toBe(0);expect(g.result!.deltas[g.sleeper]).toBe(0);previous=g;}},30000);
});
describe('七组加将头，枚举全部拆分',()=>{
 it('清胡、飘胡、塌子胡分别识别',()=>{
  const clear=tiles([...seq(0),...seq(3),...seq(6),...seq(9),...seq(12),...seq(15),...seq(18),27,27]);
  expect(scoreWin(clear,[],{indicators,winTile:clear.at(-1)!,selfDraw:false})!.kind).toBe('清胡');
  const piao=tiles([...trip(0),...trip(2),...trip(4),...trip(10),...trip(12),...trip(14),...trip(27),28,28]);
  expect(scoreWin(piao,[],{indicators,winTile:piao.at(-1)!,selfDraw:true})!.kind).toBe('飘胡');
  const mixed=tiles([...trip(0),...seq(3),...seq(6),...trip(10),...seq(12),...seq(15),...trip(27),28,28]);
  expect(scoreWin(mixed,[],{indicators,winTile:mixed.at(-1)!,selfDraw:false})!.kind).toBe('塌子胡');
 });
 it('不能跨花色、不能用老将作顺子、不能吃不妨碍暗顺子',()=>{expect(canWin(tiles([8,9,10,...trip(12),...trip(15),...trip(18),...trip(21),...trip(24),...trip(27),28,28]),[])).toBe(false);expect(canWin(tiles([27,28,29,...trip(0),...trip(3),...trip(6),...trip(9),...trip(12),...trip(15),18,18]),[])).toBe(false);});
 it('同一手牌有刻子及顺子多种拆分，不止首拆',()=>{const h=tiles([...trip(0),...trip(1),...trip(2),...trip(9),...trip(10),...trip(11),...trip(27),28,28]);const s=enumerateSplits(h,[]);expect(s.length).toBeGreaterThan(1);expect(s.some(x=>x.groups.some(y=>y.kind==='sequence'))).toBe(true);expect(s.some(x=>x.groups.every(y=>y.kind==='triplet'))).toBe(true);});
 it('有杠时实体24张仍是七组加一对',()=>{const m:Meld={kind:'closedKong',type:27,tiles:tiles([27,27,27,27])};const h=tiles([...seq(0),...seq(3),...seq(6),...seq(9),...seq(12),...seq(15),28,28]);expect(h.length+m.tiles.length).toBe(24);expect(canWin(h,[m])).toBe(true);});
});
describe('同版本双将算胡',()=>{
 it('普通、四老将、异点、同点、半边将、双龙会分档',()=>{
  expect(groupValue(2,'triplet',indicators)).toBe(4);
  expect(groupValue(17,'triplet',indicators)).toBe(8);
  expect(groupValue(4,'triplet',indicators)).toBe(24);
  expect(groupValue(13,'triplet',indicators)).toBe(8);
  expect(groupValue(4,'triplet',tiles([4,13]))).toBe(48);
  expect(groupValue(22,'closedKong',tiles([4,13]))).toBe(48);
  expect(groupValue(27,'triplet',tiles([27,4]))).toBe(48);
  expect(groupValue(28,'dragon',tiles([27,4]))).toBe(64);
  expect(groupValue(27,'triplet',tiles([27,28]))).toBe(96);
  expect(groupValue(29,'closedKong',tiles([27,28]))).toBe(96);
  expect(groupValue(27,'calledPair',tiles([27,27]))).toBe(128);
 });
 it('文钱1/2/3，三文钱可重复暗刻但不实体复制',()=>{const hands=[1,2,3].map(n=>tiles([...Array(n).fill(seq(18)).flat(),...[0,3,6,9,12,15].slice(0,7-n).flatMap(seq),27,27]));for(let i=0;i<3;i++){const sc=scoreWin(hands[i],[],{indicators,winTile:hands[i].at(-1)!,selfDraw:false})!;expect(sc.extras.find(x=>x.label.includes('文钱'))?.value).toBe([20,50,100][i]);if(i===2)expect(sc.groupLines.filter(x=>x.label.includes('重复暗刻'))).toHaveLength(3);}});
 it('三老会齐翻倍三组，天成和闷飘叠加且最后进整',()=>{const h=tiles([...trip(27),...trip(28),...trip(29),...trip(0),...trip(3),...trip(6),...trip(9),12,12]);const sc=scoreWin(h,[],{indicators,winTile:h.at(-1)!,selfDraw:true,heavenly:true})!;expect(sc.multipliers.map(m=>m.label)).toEqual(['飘胡','闷飘','天成']);expect(sc.groupLines.find(l=>l.label.startsWith('红花'))?.value).toBe(16);expect(sc.total%10).toBe(0);});
 it('单吊、边张、丫子同一拆分互斥，未胡不拿胡型奖励',()=>{const h=tiles([...seq(0),...seq(3),...seq(6),...seq(9),...seq(12),...seq(15),...seq(18),27,27]);const sc=scoreWin(h,[],{indicators,winTile:h.find(t=>t.type===1)!,selfDraw:true})!;expect(sc.extras.filter(x=>/单吊|丫子|边张/.test(x.label))).toHaveLength(1);const un=scoreUnwon(h,[],indicators);expect(un.base).toBe(0);expect(un.multipliers).toHaveLength(0);});
});

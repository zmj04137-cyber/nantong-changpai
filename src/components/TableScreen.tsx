import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,PointerEvent as ReactPointerEvent} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,Eye,History,Pause,Play,Settings2,Volume2,VolumeX,X,Layers,SlidersHorizontal} from 'lucide-react';
import {Card,MeldView} from './Cards';
import type {Game,Tile,Action} from '../engine/types';
import type {Settings} from '../storage';
import {declarations,selfWin,turnKongs} from '../engine/game';
import {generalDescription,generalTypes,groupValue} from '../engine/config';
import {label,shortLabel,sorted} from '../engine/cards';
import {scoreWin} from '../engine/scoring';
import {playSound} from '../audio';
import {loadHandView,saveHandView,initialOrder,manualSort,orderedTiles,reconcileOrder} from '../hand-order';
import {oldGeneral} from '../engine/cards';

type Props={game:Game;dispatch:(a:Action)=>void;settings:Settings;setSettings:(s:Settings)=>void;auto:boolean;setAuto:(v:boolean)=>void;paused:boolean;setPaused:(v:boolean)=>void;onOverlay:(v:boolean)=>void;onHome:()=>void;onRules:()=>void;onSettings:()=>void};
type Position='left'|'right'|'bottom';
const asset=(path:string)=>`${import.meta.env.BASE_URL}${path}`;
const actionWords={deal:'理牌',draw:'摸牌',discard:'出牌',peng:'碰',kong:'杠',dragon:'亮龙'};
export function TableScreen({game:g,dispatch,settings,setSettings,auto,setAuto,paused,setPaused,onOverlay,onHome,onRules,onSettings}:Props){
 const handKey=g.roundId??`${g.round}/${g.dealer}/${g.indicators.map(t=>t.id).join('-')}`;
 const [savedView]=useState(()=>loadHandView(handKey,g.players[0].hand));
 const [order,setOrder]=useState(savedView.order);
 const [selected,setSelected]=useState<number|null>(savedView.selectedId),[historyOpen,setHistoryOpen]=useState(false),[generalsOpen,setGeneralsOpen]=useState(false),[historySeat,setHistorySeat]=useState<number>(g.active[0]);
 const [dragging,setDragging]=useState(false);
 const [feedback,setFeedback]=useState<number|null>(null),[sortNotice,setSortNotice]=useState(false);
 const rail=useRef<HTMLDivElement>(null),[railWidth,setRailWidth]=useState(1000),[viewportHeight,setViewportHeight]=useState(()=>window.innerHeight);
 const layoutPositions=useRef(new Map<number,number>()),layoutOrder=useRef('');
 const drag=useRef({down:false,x:0,scroll:0,moved:false,blockUntil:0});
 const observing=g.sleeper===0;
 // The observing human leaves the three actual card seats to the active computers.
 const bottom=observing?g.active[2]:0;
 const next=(s:number)=>g.active[(g.active.indexOf(s)+1)%3];
 const left=next(bottom),right=next(left);
 const positions:Record<number,Position>={[left]:'left',[right]:'right',[bottom]:'bottom'};
 const currentActor=g.phase==='declarations'?g.declareQueue[0]:g.phase==='response'?g.pending!.choices[0].player:g.turn;
 const ownTurn=!observing&&g.phase==='discard'&&g.turn===0;
 const ownDeclare=!observing&&g.phase==='declarations'&&g.declareQueue[0]===0;
 const ownResponse=!observing&&g.phase==='response'&&g.pending!.choices[0].player===0;
 const responsiveCard=g.pending?.tile;
 const fallbackPlay=g.pending?{tile:g.pending.tile,from:g.pending.from}:undefined;
 const play=g.visual?.play??fallbackPlay;
 const arch=g.visual?.archive;
 const event=g.visual?.event;
 const activeHint=paused?'牌局暂停':g.phase==='declarations'?'确认起手':g.phase==='response'?'正在响应':'出牌中';
 const status=paused?'牌局已暂停':ownDeclare?'确认起手，选择是否亮龙':ownResponse?`响应${g.players[g.pending!.from].name}的${label(g.pending!.tile.type)}`:ownTurn?'请选择出牌':observing?`定醒观战 · ${g.players[currentActor].name}${activeHint}`:`等待${g.players[currentActor].name}${activeHint}`;
 useEffect(()=>{onOverlay(historyOpen||generalsOpen);return()=>onOverlay(false);},[historyOpen,generalsOpen,onOverlay]);
 const roundRef=useRef(handKey);
 useEffect(()=>{if(roundRef.current!==handKey){setSelected(null);setOrder(initialOrder(g.players[0].hand,handKey));roundRef.current=handKey;}setHistorySeat(g.active[0]);},[handKey]);
 useEffect(()=>{if(selected!==null&&!g.players[0].hand.some(t=>t.id===selected))setSelected(null);},[g.players,selected]);
 useEffect(()=>{
  if(!event)return;setFeedback(event.serial);const timer=setTimeout(()=>setFeedback(null),1000);return()=>clearTimeout(timer);
 },[event?.serial]);
 useLayoutEffect(()=>{const el=rail.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setRailWidth(entry.contentRect.width));observer.observe(el);return()=>observer.disconnect();},[observing,g.round]);
 useEffect(()=>{const resize=()=>setViewportHeight(window.innerHeight);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const human=g.players[0];
 const cardWidth=viewportHeight<550?Math.min(31,Math.max(27,railWidth/24.5)):Math.min(54,Math.max(36,Math.min(railWidth/23.8,(viewportHeight*.4-90)/4.7)));
 const step=Math.min(cardWidth+5,Math.max(27,(railWidth-cardWidth-26)/Math.max(1,human.hand.length-1)));
 const observed=useRef({ids:human.hand.map(t=>t.id),response:g.phase==='response'});
 useEffect(()=>{
  const previous=observed.current;
  const removed=previous.ids.some(id=>!human.hand.some(t=>t.id===id));
  const responded=previous.response&&g.phase!=='response';
  setOrder(state=>reconcileOrder(state,human.hand,{key:handKey,drawId:g.lastDraw?.player===0?g.lastDraw.tile.id:null,auto:settings.autoSort,boundary:removed||responded,busy:selected!==null||dragging||g.phase==='response'}));
  observed.current={ids:human.hand.map(t=>t.id),response:g.phase==='response'};
 },[g,handKey,settings.autoSort,selected,dragging,ownResponse,human.hand]);
 useEffect(()=>{saveHandView(order,selected);},[order,selected]);
 const drawAside=order.asideId;
 const hand=orderedTiles(human.hand,order);
 const generals=new Set(generalTypes(g.indicators));
 useEffect(()=>{if(!event)return;const map={deal:'deal',draw:'draw',discard:'discard',peng:'peng',kong:'kong',dragon:'kong'} as const;playSound(map[event.kind]);},[event?.serial]);
 useLayoutEffect(()=>{
  const element=rail.current;if(!element)return;
  const stamp=hand.map(t=>t.id).join(','),previous=layoutPositions.current,nextPositions=new Map<number,number>();
  const animate=layoutOrder.current!==stamp&&!drag.current.down&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.querySelectorAll<HTMLElement>('[data-tile-id]').forEach(slot=>{
   const id=Number(slot.dataset.tileId),x=slot.getBoundingClientRect().left+element.scrollLeft;nextPositions.set(id,x);
   const before=previous.get(id);if(animate&&before!==undefined&&Math.abs(before-x)>1)slot.animate([{transform:`translateX(${before-x}px)`},{transform:'translateX(0)'}],{duration:180,easing:'cubic-bezier(.2,.7,.3,1)'});
  });layoutPositions.current=nextPositions;layoutOrder.current=stamp;
 },[order.ids,selected,railWidth,g.round]);
 const handStyle={'--paper-w':`${cardWidth}px`,'--paper-h':`${cardWidth*4.7}px`,'--paper-step':`${step}px`} as CSSProperties;
 const winScore=useMemo(()=>ownTurn&&selfWin(g)?scoreWin(human.hand,human.melds,{indicators:g.indicators,winTile:g.lastDraw?.tile??human.hand.at(-1)!,selfDraw:true,heavenly:g.dealer===0&&g.discards===0&&!g.lastDraw,kongDraw:g.lastDraw?.kong}):null,[g,ownTurn,human]);
 function send(a:Action){setSelected(null);dispatch(a);}
 function select(t:Tile){if(!ownTurn||auto||paused||Date.now()<drag.current.blockUntil)return;playSound('select');setSelected(s=>s===t.id?null:t.id);}
 function startDrag(e:ReactPointerEvent<HTMLDivElement>){if(e.button!==0)return;drag.current={...drag.current,down:true,x:e.clientX,scroll:e.currentTarget.scrollLeft,moved:false};}
 function moveDrag(e:ReactPointerEvent<HTMLDivElement>){const d=drag.current;if(!d.down)return;const dx=e.clientX-d.x;if(Math.abs(dx)>8){d.moved=true;setDragging(true);d.blockUntil=Date.now()+350;if(e.pointerType==='mouse'){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.scrollLeft=d.scroll-dx;}}}
 function endDrag(e:ReactPointerEvent<HTMLDivElement>){if(drag.current.moved)drag.current.blockUntil=Date.now()+350;drag.current.down=false;setDragging(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 function showHistory(seat?:number){setHistorySeat(seat??g.active[0]);setHistoryOpen(true);}
 const player=(seat:number,position:Position)=>{
  const p=g.players[seat],acting=seat===currentActor;return <section className={`cp-player cp-player-${position} ${acting?'is-acting':''}`} aria-label={`${p.name}的座位`} key={seat}>
   <div className="cp-person"><span className="cp-avatar">{p.name==='你'?'我':p.name[0]}</span><div className="cp-person-text"><div><b>{p.name}</b>{seat===g.dealer&&<span className="cp-banker">庄</span>}</div><span className="cp-hand-count">手牌 <strong>{p.hand.length}</strong> 张</span></div>{acting&&<span className="cp-turn-pill" key={`${g.phase}-${seat}`}>{activeHint}<i/></span>}</div>
   <div className="cp-person-cards"><div className="cp-fan" aria-label={`${p.hand.length}张未公开手牌`}><i/><i/><i/><span>{p.hand.length}</span></div><div className="cp-melds">{p.melds.map((m,i)=><div className="cp-meld-enter" key={`${m.type}-${m.kind}`}><MeldView meld={m}/></div>)}</div></div>
   <button className="cp-person-history" onClick={()=>showHistory(seat)} aria-label={`查看${p.name}的历史弃牌`}>弃牌 {p.river.filter(t=>t.id!==play?.tile.id).length} <ChevronDown size={11}/></button>
  </section>;
 };
 function currentPlay(seat:number,position:Position){const here=play?.from===seat,flash=event?.actor===seat&&feedback===event.serial;const old=arch?.from===seat&&arch.tile.id!==play?.tile.id;return <div className={`cp-play cp-play-${position}`} aria-label={`${g.players[seat].name}面前的行牌区`}>
  {old&&<div className="cp-archive-flight" aria-hidden="true" key={`archive-${arch.serial}`}><Card tile={arch.tile}/></div>}
  {here&&<div className={`cp-play-card ${g.pending?'is-responding':''}`} key={play.tile.id}><div className="cp-play-name"><span>{g.players[seat].name}</span><b>{g.pending?'待响应':'出牌'}</b></div><Card tile={play.tile}/><span className="cp-play-label">{label(play.tile.type)}</span>{g.pending&&<span className="cp-response-ring"/>}</div>}
  {flash&&event&&event.kind!=='discard'&&event.kind!=='draw'&&event.kind!=='deal'&&<span className="cp-action-word" key={`feedback-${event.serial}`}>{actionWords[event.kind]}</span>}
 </div>;}
 const currentHistory=g.players[historySeat]?.river.filter(t=>t.id!==play?.tile.id)??[];
 return <section className={`cp-table ${observing?'cp-observing':''} ${g.visual?.event.kind==='deal'?'cp-dealing':''}`} aria-label="对局牌桌">
  <header className="cp-topbar"><div className="cp-top-left"><button className="text-btn" onClick={onHome}><ArrowLeft size={16}/><span>暂离</span></button><img src={asset('assets/title.webp')} alt="南通長牌"/><span className="cp-round">第 {g.round} 局</span></div><div className="cp-top-right"><button className="icon-btn cp-pause" aria-label={paused?'继续牌局':'暂停牌局'} onClick={()=>setPaused(!paused)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button className="icon-btn" aria-label={settings.sound?'关闭声音':'开启声音'} onClick={()=>setSettings({...settings,sound:!settings.sound})}>{settings.sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button className="icon-btn" aria-label="玩法说明" onClick={onRules}><BookOpen size={17}/></button><button className="icon-btn" aria-label="设置" onClick={onSettings}><Settings2 size={17}/></button></div></header>
  <button className="cp-general-ticket" onClick={()=>setGeneralsOpen(true)} aria-label="查看双将与算胡"><span className="cp-ticket-title">翻将</span><div className="cp-ticket-cards">{g.indicators.map(t=><Card tile={t} key={t.id} small/>)}</div><span><b>{generalDescription(g.indicators)}</b><small>余 {g.deck.length} 张 <ChevronDown size={10}/></small></span></button>
  <aside className="cp-sleeper"><span className="cp-mini-avatar">{g.sleeper===0?'我':g.players[g.sleeper].name[0]}</span><span>{g.players[g.sleeper].name}</span><b>定醒</b></aside>
  <div className="cp-seat-players">{player(left,'left')}{player(right,'right')}{observing&&player(bottom,'bottom')}</div>
  <div className="cp-common-field" aria-label="共享行牌空间">{currentPlay(left,'left')}{currentPlay(right,'right')}{currentPlay(bottom,'bottom')}{!play&&g.phase==='declarations'&&<span className="cp-table-whisper">纸 上 相 逢</span>}</div>
  <button className="cp-history-pod" onClick={()=>showHistory()} aria-label="查看历史弃牌"><span className="cp-history-thumb">{g.players.flatMap(p=>p.river).filter(t=>t.id!==play?.tile.id).slice(-3).map(t=><Card tile={t} key={t.id} small/>)}</span><span><History size={13}/> 弃牌记录</span></button>
  {!observing?<section className="cp-own-zone" aria-label="我的操作与手牌"><div className="cp-own-identity"><span className="cp-avatar">我</span><span><b>你 {g.dealer===0&&<i>庄</i>}</b><small>{human.score} 分</small></span></div>
   <div className="cp-own-melds" aria-label="我的亮牌">{human.melds.length>0&&<span className="cp-section-label">亮牌</span>}<div>{human.melds.map(m=><div className="cp-meld-enter" key={`${m.type}-${m.kind}`}><MeldView meld={m}/></div>)}</div></div>
   <div className="cp-operation-row"><div className={`cp-operation ${ownTurn||ownResponse||ownDeclare?'can-act':''}`} role="status" aria-live="polite"><span className="cp-operation-hint">{status}</span><div className="cp-action-buttons">
    {!auto&&!paused&&ownDeclare&&<>{declarations(g,0).map(d=><button className="cp-btn" key={d.type} onClick={()=>send({kind:'declare',type:d.type})}>{d.kind==='calledPair'?'锁头':'亮龙'} · {label(d.type)}</button>)}<button className="cp-btn cp-btn-main" onClick={()=>send({kind:'skipDeclare'})}>确认起手 <Check size={15}/></button></>}
    {!auto&&!paused&&ownResponse&&<>{g.pending!.choices[0].actions.map(a=><button className={`cp-btn ${a==='hu'?'cp-btn-main':''}`} key={a} onClick={()=>send({kind:'respond',player:0,action:a})}>{a==='hu'?'胡':a==='kong'?'杠':'碰'}</button>)}<button className="cp-btn cp-btn-pass" onClick={()=>send({kind:'respond',player:0,action:'pass'})}>过</button></>}
    {!auto&&!paused&&ownTurn&&<>{winScore&&<button className="cp-btn cp-btn-main" onClick={()=>send({kind:'hu'})}>胡 <small>{winScore.total}胡</small></button>}{turnKongs(g).map(k=><button className="cp-btn" key={k.type} onClick={()=>send(k)}>{k.kind==='closedKong'?'暗杠':'补杠'} · {label(k.type)}</button>)}<button className="cp-btn cp-btn-main cp-discard-btn" disabled={selected===null} onClick={()=>selected!==null&&send({kind:'discard',id:selected})}>出牌 <ArrowRight size={17}/></button></>}
    {paused&&<button className="cp-btn cp-btn-main" onClick={()=>setPaused(false)}>继续牌局 <Play size={14}/></button>}
    {auto&&<button className="cp-btn" onClick={()=>setAuto(false)}>取消托管</button>}
   </div></div><div className="cp-hand-tools"><button aria-label="自动理牌" onClick={()=>{setOrder(state=>manualSort(human.hand,state));playSound('sort');setSortNotice(true);setTimeout(()=>setSortNotice(false),1600);}}><SlidersHorizontal size={14}/><span>{sortNotice?'已理好':'理牌'}</span></button><button aria-label={auto?'取消托管':'托管'} className={auto?'enabled':''} onClick={()=>setAuto(!auto)}><Eye size={14}/><span>{auto?'托管中':'托管'}</span></button></div></div>
   <div className="cp-hand-rail" ref={rail} style={handStyle} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={()=>{drag.current.down=false;setDragging(false);}} aria-label={`你的${hand.length}张手牌，可横向拖动`}><div className="cp-hand-row">{hand.map((t,i)=><div className={`cp-hand-slot ${selected===t.id?'is-selected':''} ${drawAside===t.id?'is-new-draw':''}`} key={t.id} data-tile-id={t.id} style={{'--card-order':i,zIndex:selected===t.id?100:i} as CSSProperties}><Card tile={t} selected={selected===t.id} onClick={()=>select(t)} showName={settings.showNames}/>{generals.has(t.type)&&<span className="cp-general-marker" title={oldGeneral(t.type)?'老将 · 本局在将':'本局将牌'}>{oldGeneral(t.type)?'老':'将'}</span>}{drawAside===t.id&&<span className="cp-draw-label">摸入</span>}</div>)}</div></div>
   <div className="cp-hand-footer"><span>{settings.autoSort?'自动理牌开 · ':''}{selected!==null?`已选 ${label(human.hand.find(t=>t.id===selected)?.type??0)} · 再点取消`:'点击选牌 · 按出牌确认'}</span><span>手牌 {human.hand.length} 张<span className="cp-drag-hint"> · 可横向拖动</span></span></div>
  </section>:<div className="cp-observer-bar"><span><Eye size={16}/> 本局定醒，且看一局好牌。</span><small>下局{g.players[(g.dealer+1)%4].name}坐庄，你将重新入席。</small><button className="cp-btn" onClick={()=>setSettings({...settings,speed:settings.speed===120?750:120})}>{settings.speed===120?'恢复正常速度':'快速观战'} <ArrowRight size={14}/></button>{paused&&<button className="cp-btn cp-btn-main" onClick={()=>setPaused(false)}>继续</button>}</div>}
  {event?.kind==='deal'&&<div className="cp-deal-flight" aria-hidden="true"><span/><span/><span/></div>}
  {historyOpen&&<div className="cp-overlay" onClick={()=>setHistoryOpen(false)}><section className="cp-drawer" role="dialog" aria-modal="true" aria-label="历史弃牌" onClick={e=>e.stopPropagation()}><header><div><h2>牌过，留痕。</h2><p>只收纳已归档弃牌，当前出牌仍留在行牌区。</p></div><button className="icon-btn" aria-label="关闭历史弃牌" onClick={()=>setHistoryOpen(false)}><X size={20}/></button></header><div className="cp-live-strip"><i/>{status}<span>浏览记录时暂停行动</span></div><nav className="cp-history-tabs">{g.active.map(s=><button className={historySeat===s?'active':''} key={s} onClick={()=>setHistorySeat(s)}>{g.players[s].name}<small>{g.players[s].river.filter(t=>t.id!==play?.tile.id).length}</small></button>)}</nav><div className="cp-history-grid">{currentHistory.length?currentHistory.map((t,i)=><div key={t.id}><Card tile={t}/><small>{String(i+1).padStart(2,'0')}</small></div>):<p className="cp-empty-history">这一家还没有归档弃牌。</p>}</div></section></div>}
  {generalsOpen&&<div className="cp-overlay" onClick={()=>setGeneralsOpen(false)}><section className="cp-drawer cp-generals-drawer" role="dialog" aria-modal="true" aria-label="翻将与算胡" onClick={e=>e.stopPropagation()}><header><div><h2>{generalDescription(g.indicators)}</h2><p>翻将影响叫牌及算胡，不是万能牌。</p></div><button className="icon-btn" aria-label="关闭翻将说明" onClick={()=>setGeneralsOpen(false)}><X size={20}/></button></header><div className="cp-live-strip"><i/>{status}<span>余牌 {g.deck.length} 张</span></div><div className="cp-generals-exhibit">{g.indicators.map(t=><Card tile={t} key={t.id}/>)}<p>九条、红花、白花、千字为四老将。<br/>本局数字将按两张翻将的点数确定，不使用单将147／258／369分组。</p></div><h3>本局将牌分值</h3><div className="cp-general-table"><table><thead><tr><th>牌</th><th>明刻</th><th>暗刻</th><th>明杠</th><th>暗杠</th><th>起手</th></tr></thead><tbody>{generalTypes(g.indicators).map(t=><tr key={t}><td>{label(t)}</td>{(['peng','triplet','openKong','closedKong','dragon'] as const).map(k=><td key={k}>{(k==='openKong'||k==='closedKong')&&g.indicators.some(i=>i.type===t)?'—':groupValue(t,k,g.indicators)}</td>)}</tr>)}</tbody></table></div><button className="text-btn" onClick={()=>{setGeneralsOpen(false);onRules();}}>完整玩法与产品约定 <ArrowRight size={14}/></button></section></div>}
 </section>;
}

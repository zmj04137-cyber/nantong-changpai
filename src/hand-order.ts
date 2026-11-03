import {sorted} from './engine/cards';
import type {Tile} from './engine/types';
// Presentation only. Never mutates the hand, melds, tile identities or ownership.
export type HandOrder={key:string;ids:number[];asideId:number|null;pendingSort:boolean};
export type HandView={order:HandOrder;selectedId:number|null};
type ReconcileOptions={key:string;drawId:number|null;auto:boolean;boundary:boolean;busy:boolean};
const STORAGE='nantong-hand-view-v1';
export function initialOrder(hand:Tile[],key:string):HandOrder{return {key,ids:sorted(hand).map(t=>t.id),asideId:null,pendingSort:false};}
export function orderedTiles(hand:Tile[],order:HandOrder):Tile[]{const byId=new Map(hand.map(t=>[t.id,t]));const seen=new Set<number>();const result:Tile[]=[];for(const id of order.ids){const t=byId.get(id);if(t&&!seen.has(id)){result.push(t);seen.add(id);}}for(const t of hand)if(!seen.has(t.id)){result.push(t);seen.add(t.id);}return result;}
export function manualSort(hand:Tile[],state:HandOrder):HandOrder{return {...state,ids:sorted(hand).map(t=>t.id),asideId:null,pendingSort:false};}
export function reconcileOrder(state:HandOrder,hand:Tile[],options:ReconcileOptions):HandOrder{
 if(state.key!==options.key)return initialOrder(hand,options.key);
 const current=new Set(hand.map(t=>t.id)),known=new Set(state.ids);
 let ids=[...new Set(state.ids.filter(id=>current.has(id)))];const added=hand.filter(t=>!known.has(t.id));ids.push(...added.map(t=>t.id));
 const newDraw=options.drawId!==null&&added.some(t=>t.id===options.drawId)?options.drawId:null;
 let asideId=newDraw??(state.asideId!==null&&current.has(state.asideId)?state.asideId:null);
 let pendingSort=options.auto&&(state.pendingSort||options.boundary);
 if(options.auto&&pendingSort&&!options.busy){
  // A kong may remove cards and draw a supplement in the same transition. Sort the
  // remaining base hand, but keep that newly drawn supplement separate on the right.
  if(newDraw!==null){ids=[...sorted(hand.filter(t=>t.id!==newDraw)).map(t=>t.id),newDraw];asideId=newDraw;}
  else {ids=sorted(hand).map(t=>t.id);asideId=null;}
  pendingSort=false;
 }
 if(ids.length===state.ids.length&&ids.every((id,i)=>id===state.ids[i])&&asideId===state.asideId&&pendingSort===state.pendingSort)return state;
 return {key:state.key,ids,asideId,pendingSort};
}
export function loadHandView(key:string,hand:Tile[]):HandView{
 const fresh={order:initialOrder(hand,key),selectedId:null};
 try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null') as HandView|null;if(!v||v.order?.key!==key||!Array.isArray(v.order.ids))return fresh;
  const order=reconcileOrder(v.order,hand,{key,drawId:null,auto:false,boundary:false,busy:false});
  const selectedId=hand.some(t=>t.id===v.selectedId)?v.selectedId:null;return {order,selectedId};
 }catch{return fresh;}
}
export function saveHandView(order:HandOrder,selectedId:number|null){try{localStorage.setItem(STORAGE,JSON.stringify({order,selectedId}));}catch{/* Display still works when browser storage is unavailable. */}}

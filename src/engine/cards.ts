import type {Tile} from './types';
export const SUITS=['万','条','饼'] as const;
export const NUMBERS=['一','二','三','四','五','六','七','八','九'];
export function label(t:number){return t<27?NUMBERS[t%9]+SUITS[Math.floor(t/9)]:['红花','白花','千字'][t-27];}
export function shortLabel(t:number){return t<27?`${t%9+1}${SUITS[Math.floor(t/9)]}`:label(t);}
export function suit(t:number){return t<27?Math.floor(t/9):-1;}
export function rank(t:number){return t<27?t%9+1:0;}
export function oldGeneral(t:number){return t>=27||t===17;}
export function makeDeck():Tile[]{return Array.from({length:120},(_,id)=>({id,type:Math.floor(id/4)}));}
export function counts(tiles:Tile[]){const c=Array(30).fill(0) as number[];for(const t of tiles)c[t.type]++;return c;}
export function sorted(tiles:Tile[]){return [...tiles].sort((a,b)=>a.type-b.type||a.id-b.id);}
export function shuffle<T>(input:T[],rng:()=>number=Math.random){const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function artwork(t:number){return t<27?`assets/cards/r${Math.floor(t/9)+1}_c${String(t%9+1).padStart(2,'0')}.webp`:null;}
export function wenqian(g:{kind:string;type:number}){return g.kind==='sequence'&&g.type===18;}

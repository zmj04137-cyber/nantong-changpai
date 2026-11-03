import {counts,rank,oldGeneral} from './cards';
import type {Tile,Meld} from './types';
// No Game object, opponents' hands or hidden deck is accepted here.
export type AIView={hand:Tile[];melds:Meld[];publicTiles:Tile[];indicators:Tile[]};
export function chooseDiscard(view:AIView):Tile{
 const c=counts(view.hand),seen=counts(view.publicTiles);let best=view.hand[0],low=Infinity;
 for(const t of view.hand){
  let keep=c[t.type]>=3?16:c[t.type]===2?8:0;
  if(t.type<27){const r=rank(t.type);for(const d of [-2,-1,1,2]){if(r+d>=1&&r+d<=9&&c[t.type+d])keep+=Math.abs(d)===1?3.8:1.8;}}
  if(oldGeneral(t.type)&&c[t.type]>=2)keep+=2;
  keep-=seen[t.type]*0.9;
  if(keep<low||(keep===low&&t.type>best.type)){best=t;low=keep;}
 }
 return best;
}
export function wantsPeng(hand:Tile[],type:number){const c=counts(hand);if(c[type]<2)return false;const r=rank(type);const sequences=type<27&&((r>1&&c[type-1])||(r<9&&c[type+1]));return c[type]===2||!sequences;}

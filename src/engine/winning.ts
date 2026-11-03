import {counts} from './cards';
import type {Tile,Meld,Split,Group} from './types';
export function enumerateSplits(hand:Tile[],melds:Meld[]):Split[]{
 const locked=melds.find(m=>m.kind==='calledPair');
 const need=7-melds.filter(m=>m.kind!=='calledPair').length;
 if(need<0||hand.length!==need*3+(locked?0:2))return [];
 const c=counts(hand),out:Split[]=[];
 function groups(left:number,path:Group[],pair:number){
  const i=c.findIndex(n=>n>0);
  if(i<0){if(left===0)out.push({pair,groups:[...path]});return;}
  if(left===0)return;
  if(c[i]>=3){c[i]-=3;path.push({kind:'triplet',type:i});groups(left-1,path,pair);path.pop();c[i]+=3;}
  if(i<27&&i%9<=6&&c[i+1]>0&&c[i+2]>0){c[i]--;c[i+1]--;c[i+2]--;path.push({kind:'sequence',type:i});groups(left-1,path,pair);path.pop();c[i]++;c[i+1]++;c[i+2]++;}
 }
 if(locked)groups(need,[],locked.type);
 else for(let i=0;i<30;i++)if(c[i]>=2){c[i]-=2;groups(need,[],i);c[i]+=2;}
 return out;
}
export function canWin(hand:Tile[],melds:Meld[]){return enumerateSplits(hand,melds).length>0;}

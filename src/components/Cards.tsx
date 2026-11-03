import type {Tile,Meld} from '../engine/types';
import {artwork,label,rank} from '../engine/cards';
const asset=(path:string)=>`${import.meta.env.BASE_URL}${path}`;
export function Card({tile,small=false,selected=false,onClick,showName=true,back=false}:{tile?:Tile;small?:boolean;selected?:boolean;onClick?:()=>void;showName?:boolean;back?:boolean}){
 const t=tile?.type??0,path=artwork(t);
 const content=back?<span className="card-back-mark">長</span>:<>{path?<img src={asset(path)} alt="" loading="lazy" draggable={false}/>:<span className="special-art">{label(t)}</span>}<span className={`card-index suit-${Math.floor(t/9)}`}>{t<27?<><b>{rank(t)}</b><span>{['万','条','饼'][Math.floor(t/9)]}</span></>:<span>{label(t)}</span>}</span>{showName&&<span className="card-foot">{t<27?label(t):'老将'}</span>}</>;
 return onClick?<button type="button" className={`card ${small?'small':''} ${selected?'selected':''} ${back?'back':''}`} onClick={onClick} aria-label={`${label(t)}${selected?'，已选中，再点取消':''}`} aria-pressed={selected}>{content}</button>:<span role="img" aria-label={back?'牌背':label(t)} className={`card ${small?'small':''} ${back?'back':''}`}>{content}</span>;
}
export function MeldView({meld}:{meld:Meld}){return <div className="meld"><div className="meld-cards">{meld.tiles.map(t=><Card key={t.id} tile={t} small/>)}{meld.indicatorIds?.map(id=><span key={id} className="borrowed">借<br/>将</span>)}</div><span>{({peng:'碰',openKong:'明杠',closedKong:'暗杠',dragon:'龙',calledPair:'叫牌锁头'})[meld.kind]}</span></div>;}

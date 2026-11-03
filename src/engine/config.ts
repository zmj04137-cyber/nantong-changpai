import {label,oldGeneral,rank} from './cards';
import type {MeldKind,Tile} from './types';
export const RULES={id:'nt-double-2017-product-v1',name:'双将 · 四人合局',base:{'塌子胡':20,'清胡':100,'飘胡':50},wenqian:[0,20,50,100,200],source:'https://nantongchangpai.uc55.com/Rule/Detail/201711_000137.html'} as const;
export function groupValue(type:number,kind:MeldKind|'triplet',indicators:Tile[],concealed=true){
 const index=kind==='peng'?0:kind==='triplet'?(concealed?1:0):kind==='openKong'?2:kind==='closedKong'?3:4;
 const base=[2,4,8,12,16][index];
 const a=indicators[0].type,b=indicators[1].type;
 const oldCount=indicators.filter(t=>oldGeneral(t.type)).length;
 const exact=type===a||type===b;
 if(kind==='calledPair')return oldCount===2?128:64;
 if(oldGeneral(type)){
  if(oldCount===2)return exact&&a!==b?[32,96,64,96,128][index]:base*8;
  if(oldCount===1)return exact?[16,48,32,48,64][index]:base*4;
  return base*2;
 }
 if(exact){const sameRank=a<27&&b<27&&rank(a)===rank(b);return sameRank?[16,48,32,48,64][index]:[8,24,16,24,32][index];}
 const matches=indicators.filter(t=>t.type<27&&rank(t.type)===rank(type)).length;
 return base*(matches===2?4:matches===1?2:1);
}
export function generalDescription(indicators:Tile[]){const o=indicators.filter(t=>oldGeneral(t.type)).length;return o===2?'双龙会':o===1?'半边将':rank(indicators[0].type)===rank(indicators[1].type)?'同点双将':'普通双将';}
export function generalTypes(indicators:Tile[]){return Array.from({length:30},(_,i)=>i).filter(t=>oldGeneral(t)||indicators.some(a=>a.type===t||a.type<27&&t<27&&rank(a.type)===rank(t)));}
export const PRODUCT_NOTES=[
 '四人按固定逆时针座序轮换；每局庄家的上家定醒。定醒不摸打、不计分、不支付。',
 '四张起手龙亮出后从牌尾补一张；三张加一张公共指示牌可声明龙，不补牌。指示牌始终留在公共区。',
 '双相同指示牌对应的两张起手牌可“叫牌锁头”：两张锁定为将头，计64胡；双老将计128胡，不补牌、不另算一组。这是保证七组加一对结构的产品约定。',
 '响应按胡、杠、碰优先，同级按出牌者之后的逆时针座序；只允许一人胡，不抢杠胡。无人响应才摸下一张。',
 '同一合法拆分中，丫子、边张、单吊只取一项；同牌可有多个拆分时，枚举全部并取最高胡数。',
 '底胡不提前进整；先加胡型与附加胡，再依次应用飘胡、闷飘、天成倍数，最终向上进整到10的倍数。',
 '三文钱的三个一饼、三个二饼、三个三饼可另按暗刻加分；四文钱延伸为200胡，其重复暗刻只按实际三张计一次。',
 '三老会齐只翻倍红花、白花、千字三组的组牌分。闷飘为无明碰、明杠的飘胡，暗杠与起手声明不破闷。',
 '三名行牌者分别算胡，再两两按差额支付；点炮者不包赔。流局也结算三家底胡，定醒积分变化为0。以上为娱乐积分约定，无充值、提现或现金兑换。',
 '未胡手牌在不重复用牌的前提下枚举刻子、四张暗杠及文钱组合，取组牌胡数最高者；未声明的四张不算起手龙。',
 '首版不启用报听、喜儿、穷狠、一胡头儿、清儿带把子、后摸、地胡、天听、海底捞月。后摸并非最后一张自摸，其重叠计分资料不完整，暂不启用。',
 '只允许碰和摸牌阶段声明杠；碰后必须出一张，不能在未摸牌时补杠。补杠不启用抢杠胡。'
];
export function sourceNote(){return `采用唐人游2017双将分表：普通明刻2、暗刻4、明杠8、暗杠12、起手16；四老将为九条、红花、白花、千字。不采用单将147/258/369分组。${label(17)}是本版老将。`;}

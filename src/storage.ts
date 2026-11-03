import type {Game} from './engine/types';
import {assertGame} from './engine/game';
const GAME_KEY='nantong-double-v1',SETTINGS_KEY='nantong-settings-v1';
export type Settings={sound:boolean;music:boolean;effects:boolean;musicVolume:number;effectsVolume:number;autoSort:boolean;speed:number;confirm:boolean;showNames:boolean};
export const defaults:Settings={sound:true,music:true,effects:true,musicVolume:.22,effectsVolume:.7,autoSort:true,speed:750,confirm:true,showNames:true};
export function loadGame():Game|null{try{const g=JSON.parse(localStorage.getItem(GAME_KEY)||'null');if(g?.version!==1)return null;assertGame(g);return g;}catch{return null;}}
export function saveGame(g:Game){try{localStorage.setItem(GAME_KEY,JSON.stringify(g));}catch{/* Safari private or exhausted storage: game remains playable. */}}
export function loadSettings():Settings{try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch{return defaults;}}
export function saveSettings(s:Settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}catch{/* Settings are still applied in memory. */}}

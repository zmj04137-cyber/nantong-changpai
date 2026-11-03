import type {Settings} from './storage';
export type SoundName='click'|'select'|'draw'|'discard'|'peng'|'kong'|'sort'|'deal'|'win';
let settings:Settings|null=null,unlocked=false,context:AudioContext|null=null,music:HTMLAudioElement|null=null;
const buffers=new Map<SoundName,AudioBuffer>(),loading=new Set<SoundName>();
const names:SoundName[]=['click','select','draw','discard','peng','kong','sort','deal','win'];
const url=(file:string)=>`${import.meta.env.BASE_URL}assets/audio/${file}`;
function ensureMusic(){if(!music){music=(document.getElementById('nt-background-music') as HTMLAudioElement|null)??new Audio(url('velvet-piano.wav'));music.loop=true;music.preload='none';music.setAttribute('playsinline','');}return music;}
function syncMusic(){
 if(!settings)return;const track=ensureMusic();track.volume=settings.musicVolume;
 if(unlocked&&settings.sound&&settings.music&&!document.hidden)void track.play().catch(()=>{});else track.pause();
}
export function configureAudio(next:Settings){settings=next;syncMusic();}
export function unlockAudio(){
 if(unlocked)return;unlocked=true;
 try{context=new AudioContext();void context.resume();}catch{context=null;}
 if(context)for(const name of names){loading.add(name);void fetch(url(`${name}.wav`)).then(r=>{if(!r.ok)throw Error('audio unavailable');return r.arrayBuffer();}).then(data=>context!.decodeAudioData(data)).then(buffer=>buffers.set(name,buffer)).catch(()=>{}).finally(()=>loading.delete(name));}
 syncMusic();
}
export function playSound(name:SoundName){
 if(!unlocked||!settings?.sound||!settings.effects)return;
 const buffer=buffers.get(name);
 if(context&&buffer){if(context.state==='suspended')void context.resume();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=settings.effectsVolume;source.connect(gain).connect(context.destination);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};}
 else{const fallback=new Audio(url(`${name}.wav`));fallback.volume=settings.effectsVolume;void fallback.play().catch(()=>{});}
}
document.addEventListener('visibilitychange',syncMusic);

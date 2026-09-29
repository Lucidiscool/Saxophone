export const DURATIONS = [['Whole', 4], ['Half', 2], ['Quarter', 1], ['Eighth', .5], ['16th', .25]];
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const midiFor = n => [64,65,67,69,71,72,74][((n.step % 7) + 7) % 7] + 12 * Math.floor(n.step / 7) + n.acc;
export function noteName(n) {
 if (n.rest) return 'Rest';
 const natural = midiFor({...n, acc:0});
 return `${['E','F','G','A','B','C','D'][((n.step % 7)+7)%7]}${n.acc===1?'♯':n.acc===-1?'♭':''}${Math.floor(natural/12)-1}`;
}
export const endBeat = notes => notes.reduce((end,n) => Math.max(end,n.at+n.beats),0);
export const overlaps = (notes, candidate, except=-1) => notes.some((n,i) => i!==except && candidate.at<n.at+n.beats && candidate.at+candidate.beats>n.at);
export function validScore(value) {
 return value && typeof value.title==='string' && value.title.length<=40 && Number.isFinite(value.bpm) && value.bpm>=40 && value.bpm<=200 && Array.isArray(value.notes) && value.notes.length<=512 && value.notes.every((n,i) => Number.isInteger(n.at*4) && n.at>=0 && n.at<=1024 && DURATIONS.some(([,b])=>b===n.beats) && Number.isInteger(n.step) && n.step>=-2 && n.step<=13 && [-1,0,1].includes(n.acc) && typeof n.rest==='boolean' && !overlaps(value.notes,n,i));
}

// Format 0 MIDI: written alto pitches, 480 ticks per quarter, with tempo and 4/4.
export function writeMidi(score) {
 const variable = value => {const out=[value&127];while(value>>=7)out.unshift((value&127)|128);return out;};
 const text = [...new TextEncoder().encode(score.title || 'Untitled melody')];
 const tempo = Math.round(60000000/score.bpm);
 const events=[{tick:0,order:0,data:[255,3,...variable(text.length),...text]}, {tick:0,order:0,data:[255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255]}, {tick:0,order:0,data:[255,88,4,4,2,24,8]}, {tick:0,order:0,data:[192,65]}];
 for(const n of score.notes)if(!n.rest){events.push({tick:Math.round(n.at*480),order:2,data:[144,midiFor(n),90]}, {tick:Math.round((n.at+n.beats)*480),order:1,data:[128,midiFor(n),0]});}
 events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
 let last=0;const track=[];
 for(const e of events){track.push(...variable(e.tick-last),...e.data);last=e.tick;}
 track.push(...variable(Math.max(0,Math.round(endBeat(score.notes)*480)-last)),255,47,0);
 const size=track.length;
 return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(size>>>24)&255,(size>>>16)&255,(size>>>8)&255,size&255,...track]);
}

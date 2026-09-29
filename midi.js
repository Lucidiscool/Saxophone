// Standard MIDI files, format 0/1. Extract separate melodic track/channel parts.
export function readMidi(buffer){
 const data=new DataView(buffer);let p=0;
 const need=n=>{if(p+n>data.byteLength)throw Error('This MIDI file is incomplete.');};
 const u8=()=>{need(1);return data.getUint8(p++);};
 const u16=()=>{need(2);const n=data.getUint16(p);p+=2;return n;};
 const u32=()=>{need(4);const n=data.getUint32(p);p+=4;return n;};
 const tag=()=>String.fromCharCode(u8(),u8(),u8(),u8());
 const vlq=()=>{let n=0;for(let i=0;i<4;i++){const b=u8();n=(n<<7)|(b&127);if(!(b&128))return n;}throw Error('Invalid MIDI timing.');};
 if(tag()!=='MThd')throw Error('Choose a standard .mid or .midi file.');
 const size=u32();if(size<6)throw Error('Invalid MIDI header.');need(size);
 const format=u16(),count=u16(),division=u16();p+=size-6;
 if(format>1||!division||(division&32768))throw Error('Use a format 0 or 1 MIDI with musical beat timing.');
 if(count>256)throw Error('This MIDI has too many tracks.');
 const tempos=[{tick:0,tempo:500000}],parts=[];
 for(let track=0;track<count;track++){
  if(tag()!=='MTrk')throw Error('Invalid MIDI track.');const length=u32();need(length);const end=p+length;
  let tick=0,running=0,title=`Track ${track+1}`;const channels=new Map();
  while(p<end){tick+=vlq();let status=u8();if(status<128){if(!running)throw Error('Invalid MIDI running status.');p--;status=running;}else if(status<240)running=status;
   if(status===255){running=0;const type=u8(),len=vlq();need(len);if(p+len>end)throw Error('Invalid MIDI event.');if(type===81&&len===3){const tempo=(data.getUint8(p)<<16)|(data.getUint8(p+1)<<8)|data.getUint8(p+2);if(tempo)tempos.push({tick,tempo});}if(type===3)title=new TextDecoder().decode(new Uint8Array(buffer,p,len)).replace(/[\x00-\x1f]/g,'').slice(0,80)||title;p+=len;if(type===47){p=end;break;}continue;}
   if(status===240||status===247){running=0;const len=vlq();need(len);p+=len;continue;}
   if(status>=240)throw Error('Unsupported MIDI event.');
   const kind=status>>4,channel=status&15,a=u8(),b=kind===12||kind===13?0:u8();
   if(a>127||b>127)throw Error('Invalid MIDI note data.');
   if(channel===9)continue;
   if(!channels.has(channel))channels.set(channel,{notes:[],held:new Map()});const part=channels.get(channel);
   if(kind===9&&b){if(!part.held.has(a))part.held.set(a,[]);part.held.get(a).push({midi:a,tick,velocity:b/127});}
   if(kind===8||(kind===9&&!b)){const note=part.held.get(a)?.shift();if(note&&tick>note.tick)part.notes.push({...note,end:tick});}
  }
  if(p>end)throw Error('Invalid MIDI track length.');p=end;
  for(const [channel,part] of channels){for(const queue of part.held.values())for(const note of queue)if(tick>note.tick)part.notes.push({...note,end:tick});if(part.notes.length)parts.push({name:`${title} · channel ${channel+1}`,notes:part.notes});}
 }
 tempos.sort((a,b)=>a.tick-b.tick);let time=0,last=0,tempo=500000;const timeline=[];
 for(const t of tempos){time+=(t.tick-last)*tempo/division/1e6;timeline.push({tick:t.tick,time,tempo:t.tempo});last=t.tick;tempo=t.tempo;}
 const seconds=tick=>{let lo=0,hi=timeline.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(timeline[m].tick<=tick)lo=m;else hi=m-1;}const t=timeline[lo];return t.time+(tick-t.tick)*t.tempo/division/1e6;};
 for(const part of parts){part.notes=part.notes.sort((a,b)=>a.tick-b.tick).map(n=>({midi:n.midi,start:seconds(n.tick),duration:seconds(n.end)-seconds(n.tick)}));const offset=part.notes[0].start;for(const n of part.notes)n.start-=offset;part.duration=Math.max(...part.notes.map(n=>n.start+n.duration));if(part.duration>1200||part.notes.length>30000)throw Error('Choose a melody shorter than 20 minutes.');}
 if(!parts.length)throw Error('No melodic notes were found in this MIDI.');
 return parts;
}

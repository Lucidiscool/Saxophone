import {audio,play,ready,stop,stopAll} from './audio.js';
import {readMidi} from './midi.js';

function melody(sequence,bpm){let start=0;const beat=60/bpm;return sequence.map(([n,b])=>{const note={midi:60+n,start,duration:b*beat*.88};start+=b*beat;return note;});}
const songs=[
 {id:'time',title:'As Time Flies',artist:'Ty’s Music',notes:null},
 {id:'careless',title:'Careless Whisper',artist:'George Michael · alto sax hook',notes:null,midiSrc:'./assets/midi/careless-whisper-hook.mid'},
 {id:'grace',title:'Amazing Grace',artist:'Traditional · alto arrangement',notes:melody([[0,1],[5,2],[9,.5],[5,.5],[9,2],[7,1],[5,2],[2,1],[0,2],[0,1],[5,2],[9,.5],[5,.5],[9,2],[7,.5],[9,.5],[12,3],[12,2],[9,1],[12,2],[9,.5],[5,.5],[9,2],[7,1],[5,2],[2,1],[0,2],[0,1],[5,2],[9,.5],[5,.5],[9,2],[7,1],[5,3]],96)},
 {id:'saints',title:'When the Saints Go Marching In',artist:'Traditional · alto arrangement',notes:melody([[0,1],[4,1],[5,1],[7,3],[0,1],[4,1],[5,1],[7,3],[0,1],[4,1],[5,1],[7,2],[4,2],[0,2],[4,2],[2,4],[4,1],[4,1],[2,1],[0,3],[0,1],[4,2],[7,2],[7,1],[5,3],[5,1],[4,1],[5,1],[7,2],[4,2],[2,2],[2,2],[0,4]],144)},
 {id:'auld',title:'Auld Lang Syne',artist:'Traditional · alto arrangement',notes:melody([[0,1],[5,1.5],[5,.5],[5,1],[9,1],[7,1.5],[5,.5],[7,1],[9,1],[5,1.5],[5,.5],[9,1],[12,1],[14,3],[14,1],[12,1.5],[9,.5],[9,1],[5,1],[7,1.5],[5,.5],[7,1],[9,1],[5,1.5],[2,.5],[2,1],[0,1],[5,4]],112)},
 {id:'demo',title:'A little improvisation',artist:'Original studio demo',notes:melody([[0,1],[3,.67],[5,.8],[7,1.43],[10,.87],[9,.73],[7,1.33],[3,1],[2,.67],[0,2.5]],160)}
];

export function createListen(){
 const $=s=>document.querySelector(s),button=$('#listen-toggle');
 const panel=document.createElement('section');panel.id='listen-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','listen-title');
 panel.innerHTML=`<div class="panel-heading"><div><span class="listen-eyebrow">THE ALTO SESSIONS</span><h2 id="listen-title">A song. A little soul.</h2></div><button id="close-listen" class="icon-button" aria-label="Close Listen">×</button></div><div id="song-list" role="group" aria-label="Choose a song"></div><div id="midi-options" hidden><label>Melody part<select id="midi-part"></select></label><label>MIDI pitch<select id="midi-pitch"><option value="written">Written for alto</option><option value="concert">Concert pitch</option></select></label></div><p id="song-help" role="status"></p><div class="song-transport"><button id="song-play" aria-label="Play selected song">Play</button><button id="song-stop" aria-label="Stop and rewind song" title="Stop and rewind">■</button><div class="song-time"><span id="song-elapsed">0:00</span><span id="song-duration">0:00</span></div></div><progress id="song-progress" value="0" max="1" aria-label="Song progress"></progress><div class="song-settings"><label>Tempo <input id="song-tempo" type="range" min="50" max="150" value="100" step="5"><output id="song-speed">100%</output></label><button id="import-song">Import MIDI</button></div><input id="midi-file" type="file" accept=".mid,.midi,audio/midi,audio/x-midi" hidden>`;
 document.body.append(panel);button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');button.removeAttribute('aria-pressed');
 let selected=songs[2],parts=[],position=0,playing=false,frame=0,last=0,speed=1,active=new Map(),token=0,started=new Set();
 const clock=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
 const notes=()=>selected.notes||[];
 const duration=()=>Math.max(0,...notes().map(n=>n.start+n.duration));
 function render(){
  $('#listen-title').textContent=panel.classList.contains('listen-compact')?selected.title:'A song. A little soul.';
  $('#song-list').replaceChildren();for(const song of songs){const b=document.createElement('button');b.className='song-choice';b.dataset.song=song.id;b.setAttribute('aria-pressed',song===selected);const title=document.createElement('strong'),artist=document.createElement('small'),label=document.createElement('span'),status=document.createElement('em');title.textContent=song.title;artist.textContent=song.artist;label.append(title,artist);status.textContent=song.notes?'♪':song.midiSrc?'READY':'MIDI';b.append(label,status);b.addEventListener('click',async()=>{halt(true);selected=song;parts=song.parts||[];panel.classList.remove('listen-compact');render();if(!song.midiSrc||song.notes)return;$('#song-help').textContent=`Loading ${song.title}…`;$('#song-play').disabled=true;try{const response=await fetch(song.midiSrc);if(!response.ok)throw Error('Could not load this song.');song.parts=readMidi(await response.arrayBuffer());song.part=0;song.notes=song.parts[0].notes;parts=song.parts;render();}catch(error){$('#song-help').textContent=error.message||'Could not load this song.';}finally{$('#song-play').disabled=false;}});$('#song-list').append(b);}
  $('#midi-options').hidden=!parts.length;$('#midi-part').replaceChildren(...parts.map((p,i)=>new Option(p.name,String(i))));$('#midi-part').value=String(selected.part||0);$('#midi-pitch').value=selected.concert?'concert':'written';
  $('#song-help').textContent=selected.notes?'Watch the keys light up as the alto plays.':selected.midiSrc?'The recognizable alto sax hook is ready to play.':`Import your MIDI of ${selected.title} to hear the alto play it. Files stay in this browser tab.`;
  $('#song-play').textContent=selected.notes?'Play':selected.midiSrc?'Loading song…':'Choose MIDI';$('#song-play').setAttribute('aria-label',selected.notes?`Play ${selected.title}`:selected.midiSrc?`Load ${selected.title}`:`Choose MIDI for ${selected.title}`);$('#song-stop').disabled=!selected.notes;paint();
 }
 function paint(){const d=duration();$('#song-elapsed').textContent=clock(position);$('#song-duration').textContent=clock(d);$('#song-progress').max=d||1;$('#song-progress').value=position;}
 function silence(){for(const id of active.values())stop(id);active.clear();}
 function halt(reset=false){token++;playing=false;cancelAnimationFrame(frame);silence();if(reset){position=0;started.clear();}$('#song-play').textContent=selected.notes?'Play':selected.midiSrc?'Load song':'Choose MIDI';$('#song-play').setAttribute('aria-label',selected.notes?`Play ${selected.title}`:selected.midiSrc?`Load ${selected.title}`:`Choose MIDI for ${selected.title}`);button.classList.remove('song-playing');paint();}
 function tick(now){if(!playing)return;position+=(now-last)/1000*speed;last=now;
  notes().forEach((n,i)=>{if(position>=n.start+n.duration){if(active.has(i)){stop(active.get(i));active.delete(i);}return;}if(position>=n.start&&!started.has(i)){const id=`song-${token}-${i}`,midi=n.midi+(selected.concert?9:0);started.add(i);active.set(i,id);play(midi-(audio.octave+1)*12,id);}});
  paint();if(position>=duration()){halt(true);return;}frame=requestAnimationFrame(tick);
 }
 async function toggle(){if(!selected.notes){$('#midi-file').click();return;}if(playing){halt();return;}stopAll();const attempt=++token;try{await ready();}catch(e){$('#song-help').textContent=e.message;return;}if(attempt!==token)return;started=new Set(notes().flatMap((n,i)=>n.start+n.duration<=position?[i]:[]));playing=true;last=performance.now();$('#song-play').textContent='Pause';$('#song-play').setAttribute('aria-label',`Pause ${selected.title}`);button.classList.add('song-playing');panel.classList.add('listen-compact');$('#listen-title').textContent=selected.title;frame=requestAnimationFrame(tick);}
 function close(focus=false){halt();panel.hidden=true;panel.classList.remove('listen-compact');$('#listen-title').textContent='A song. A little soul.';button.setAttribute('aria-expanded','false');if(focus)button.focus({preventScroll:true});}
 button.addEventListener('click',()=>{if(!panel.hidden){close();return;}panel.hidden=false;button.setAttribute('aria-expanded','true');$('#close-listen').focus({preventScroll:true});});
 $('#close-listen').addEventListener('click',()=>close(true));$('#song-play').addEventListener('click',toggle);$('#song-stop').addEventListener('click',()=>halt(true));
 $('#song-tempo').addEventListener('input',e=>{speed=Number(e.target.value)/100;$('#song-speed').textContent=`${e.target.value}%`;});
 $('#import-song').addEventListener('click',()=>$('#midi-file').click());
 $('#midi-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;halt(true);const target=selected;try{if(file.size>2*1024*1024)throw Error('Choose a MIDI file smaller than 2 MB.');const parsed=readMidi(await file.arrayBuffer());if(!songs.includes(target))return;let entry=target;if(!['time','careless','custom'].includes(target.id)){entry=songs.find(s=>s.id==='custom');if(!entry){entry={id:'custom',title:'Your melody',artist:'Imported MIDI'};songs.push(entry);}}entry.parts=parsed;entry.part=0;entry.notes=parsed[0].notes;entry.artist=file.name;if(entry.id==='custom')entry.title=file.name.replace(/\.midi?$/i,'');selected=entry;parts=parsed;render();}catch(error){$('#song-help').textContent=error.message;}});
 $('#midi-part').addEventListener('change',e=>{halt(true);selected.part=Number(e.target.value);selected.notes=parts[selected.part].notes;paint();});$('#midi-pitch').addEventListener('change',e=>{halt(true);selected.concert=e.target.value==='concert';});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close(true);});
 $('#keyboard-toggle').addEventListener('click',()=>close());
 const browse=document.createElement('button');browse.id='browse-songs';browse.textContent='All songs';browse.addEventListener('click',()=>{panel.classList.remove('listen-compact');$('#listen-title').textContent='A song. A little soul.';});panel.querySelector('.song-settings').append(browse);
  render();return {stop:()=>halt(),close};
}

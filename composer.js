import {audio,play,ready,stop,stopAll} from './audio.js';
import {DURATIONS,clamp,midiFor,noteName,endBeat,overlaps,validScore,writeMidi} from './composer-score.js';

const STORAGE='saxophone-composer-v2', LEFT=82, SCALE=112, BOTTOM=150, STEP=7;
export function createComposer({closeListen=()=>{}}={}){
 const button=document.querySelector('#compose-toggle');
 const panel=document.createElement('section');
 panel.id='compose-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','compose-title');
 panel.innerHTML=`<div class="panel-heading"><div><span class="compose-eyebrow">YOUR ALTO, YOUR MELODY</span><h2 id="compose-title">Create a song<span>.</span></h2></div><button id="close-compose" class="icon-button" aria-label="Close composer">×</button></div>
 <div class="compose-title-row"><input id="compose-name" maxlength="40" value="Untitled melody" aria-label="Song title"><span id="compose-save" role="status">Saved on this device</span></div>
 <div class="compose-toolbar"><div id="compose-durations" class="compose-options" role="group" aria-label="Note length"></div><div id="compose-accidentals" class="compose-options" role="group" aria-label="Accidental"><button data-acc="0" aria-label="Natural" aria-pressed="true">♮</button><button data-acc="1" aria-label="Sharp" aria-pressed="false">♯</button><button data-acc="-1" aria-label="Flat" aria-pressed="false">♭</button></div><button id="compose-rest" aria-pressed="false">Rest</button></div>
 <div class="compose-sheet-heading"><span>4 / 4 <i>·</i> Written alto pitch</span><span>Snap: ¼ beat</span></div>
 <div class="staff-scroll"><svg id="compose-staff" role="group" aria-label="Music staff. Click to add a note; select a note to edit it."></svg></div>
 <div class="compose-edit"><span id="compose-selection">New note</span><label>Pitch <select id="compose-pitch" aria-label="Note pitch"></select></label><button id="compose-add">Add to end</button><div class="compose-edit-selected" hidden><button id="compose-earlier" aria-label="Move selected note one quarter beat earlier">←</button><button id="compose-later" aria-label="Move selected note one quarter beat later">→</button><button id="compose-delete">Delete</button><button id="compose-new">＋ New note</button></div></div>
 <p class="compose-help">Click the staff to place a note. Select a note to change its pitch or length.</p>
 <div class="compose-transport"><button id="compose-play" class="compose-primary">▶ Play</button><button id="compose-stop" disabled>Stop</button><button id="compose-loop" aria-pressed="false">Loop</button><label>Tempo <input id="compose-tempo" type="range" min="40" max="200" value="112"><output id="compose-bpm">112 BPM</output></label></div>
 <div class="compose-bottom"><div><button id="compose-undo" disabled>Undo</button><button id="compose-redo" disabled>Redo</button><button id="compose-clear" disabled>Clear</button></div><button id="compose-export">↓ MIDI</button></div><p id="compose-status" role="status" aria-live="polite">Build a melody. Your draft saves automatically on this device.</p>`;
 document.body.append(panel);
 const $=selector=>panel.querySelector(selector),staff=$('#compose-staff'),scroller=$('.staff-scroll');
 button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
 let score={title:'Untitled melody',bpm:112,notes:[]},selected=-1,beats=1,acc=0,step=0,rest=false,loop=false;
 let playing=false,frame=0,token=0,position=0,last=0,started=new Set(),sounding=new Map(),undo=[],redo=[];
 let storageAvailable=true;
 try{const saved=localStorage.getItem(STORAGE);if(saved){const value=JSON.parse(saved);if(validScore(value))score=value;}}catch{storageAvailable=false;}
 const status=text=>$('#compose-status').textContent=text;
 const snapshot=()=>JSON.stringify(score);
 function save(){try{localStorage.setItem(STORAGE,snapshot());storageAvailable=true;}catch{storageAvailable=false;}$('#compose-save').textContent=storageAvailable?'Saved on this device':'Draft in this tab only';}
 function remember(){undo.push(snapshot());if(undo.length>80)undo.shift();redo=[];}
 function update(){save();render();}
 function edit(mutator){stopPlayback();remember();mutator();update();}
 function silence(){for(const id of sounding.values())stop(id);sounding.clear();}
 function stopPlayback(){token++;playing=false;cancelAnimationFrame(frame);silence();stop('compose-preview');started.clear();position=0;$('#compose-play').textContent='▶ Play';$('#compose-stop').disabled=true;staff.querySelector('#compose-playhead')?.setAttribute('visibility','hidden');staff.querySelectorAll('.playing').forEach(el=>el.classList.remove('playing'));}
 function syncControls(){
  const n=score.notes[selected];if(n){beats=n.beats;acc=n.acc;step=n.step;rest=n.rest;}
  $('#compose-selection').textContent=n?noteName(n)+' · beat '+(n.at+1):'New note';
  $('.compose-edit-selected').hidden=!n;$('#compose-add').hidden=!!n;
  $('#compose-pitch').value=String(step);$('#compose-pitch').disabled=rest;
  $('#compose-rest').setAttribute('aria-pressed',String(rest));
  $('#compose-durations').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.beats)===beats)));
  $('#compose-accidentals').querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.acc)===acc));b.disabled=rest;});
  $('#compose-undo').disabled=!undo.length;$('#compose-redo').disabled=!redo.length;
  $('#compose-clear').disabled=!score.notes.length;$('#compose-play').disabled=!score.notes.length;$('#compose-export').disabled=!score.notes.some(n=>!n.rest);
  $('#compose-name').value=score.title;$('#compose-tempo').value=score.bpm;$('#compose-bpm').textContent=score.bpm+' BPM';
 }
 function render(){
  const length=Math.max(8,Math.ceil((endBeat(score.notes)+1)/4)*4),width=LEFT+length*SCALE+22;
  staff.setAttribute('viewBox',`0 0 ${width} 218`);staff.setAttribute('width',width);staff.setAttribute('height',218);
  let svg='';
  for(let b=0;b<=length;b++){const x=LEFT+b*SCALE;svg+=`<line class="${b%4?'beat-line':'bar-line'}" x1="${x-14}" x2="${x-14}" y1="82" y2="158"/><text class="beat-label" x="${x}" y="201">${b%4+1}</text>`;if(b%4===0)svg+=`<text class="measure-label" x="${x}" y="24">${b/4+1}</text>`;}
  for(let i=0;i<5;i++)svg+=`<line class="staff-line" x1="17" x2="${width-12}" y1="${BOTTOM-i*14}" y2="${BOTTOM-i*14}"/>`;
  svg+='<text class="clef" x="16" y="154">𝄞</text>';
  score.notes.forEach((n,i)=>{
   const x=LEFT+n.at*SCALE,y=n.rest?122:BOTTOM-n.step*STEP,name=noteName(n);
   svg+=`<g class="sheet-note${i===selected?' selected':''}" data-index="${i}" tabindex="0" role="button" aria-pressed="${i===selected}" aria-label="${name}, beat ${n.at+1}, ${n.beats} beats"><rect class="note-hit" x="${x-12}" y="${y-35}" width="25" height="58" rx="6"/><line class="duration-mark" x1="${x}" x2="${x+n.beats*SCALE-5}" y1="181" y2="181"/>`;
   if(n.rest){const symbols={4:'𝄻',2:'𝄼',1:'𝄽',.5:'𝄾',.25:'𝄿'};svg+=`<text class="rest-mark" x="${x}" y="129">${symbols[n.beats]}</text>`;}
   else{
    for(let s=-2;s>=n.step;s-=2)svg+=`<line class="ledger" x1="${x-11}" x2="${x+11}" y1="${BOTTOM-s*STEP}" y2="${BOTTOM-s*STEP}"/>`;
    for(let s=10;s<=n.step;s+=2)svg+=`<line class="ledger" x1="${x-11}" x2="${x+11}" y1="${BOTTOM-s*STEP}" y2="${BOTTOM-s*STEP}"/>`;
    svg+=`<text class="accidental" x="${x-21}" y="${y+5}">${n.acc===1?'♯':n.acc===-1?'♭':'♮'}</text><ellipse class="note-head${n.beats>=2?' open':''}" cx="${x}" cy="${y}" rx="7" ry="4.5" transform="rotate(-18 ${x} ${y})"/>`;
    if(n.beats<4){const down=n.step>=4,sx=x+(down?-6:6),sy=y+(down?30:-30);svg+=`<line class="note-stem" x1="${sx}" x2="${sx}" y1="${y}" y2="${sy}"/>`;if(n.beats<1)for(let f=0;f<(n.beats===.25?2:1);f++){const fy=sy+(down?-f*7:f*7);svg+=`<path class="note-flag" d="M${sx} ${fy}q14 ${down?-8:8} 2 ${down?-17:17}"/>`;}}
   }
   svg+=`<text class="note-name" x="${x}" y="172">${name}</text></g>`;
  });
  svg+='<line id="compose-playhead" class="playhead" y1="37" y2="186" visibility="hidden"/>';
  staff.innerHTML=svg;syncControls();
 }
 function select(index){stopPlayback();selected=index;render();}
 function preview(n){if(!n.rest)play(midiFor(n)-(audio.octave+1)*12,'compose-preview',{tap:true});}
 function changeSelected(changes){
  if(selected<0)return true;
  const candidate={...score.notes[selected],...changes};
  if(candidate.at<0||candidate.at>1024||overlaps(score.notes,candidate,selected)){status('That space is occupied. Move the note or choose a shorter length.');syncControls();return false;}
  edit(()=>score.notes[selected]=candidate);preview(candidate);return true;
 }
 function add(at,pitchStep){
  if(score.notes.length>=512||at>1024){status('This melody is full. Export it as MIDI to keep a copy.');return;}
  const candidate={at,step:pitchStep,beats,acc,rest};
  if(overlaps(score.notes,candidate)){status('That space is occupied. Select its note to edit it, or choose an empty beat.');return;}
  edit(()=>{score.notes.push(candidate);score.notes.sort((a,b)=>a.at-b.at);selected=-1;});preview(candidate);status(noteName(candidate)+' added. Click a note to edit it.');
 }
 function removeSelected(){if(selected<0)return;edit(()=>{score.notes.splice(selected,1);selected=-1;});status('Note deleted. Undo brings it back.');}
 function moveSelected(amount){if(selected>=0)changeSelected({at:score.notes[selected].at+amount});}
 function history(direction){
  const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;if(!from.length)return;
  stopPlayback();to.push(snapshot());score=JSON.parse(from.pop());selected=-1;update();status(direction==='undo'?'Change undone.':'Change restored.');
 }
 function tick(now,run){
  if(!playing||run!==token)return;
  position+=(now-last)/1000*score.bpm/60;last=now;
  const end=endBeat(score.notes);
  if(position>=end){if(loop){position%=end;silence();started.clear();}else{stopPlayback();status('Melody finished.');return;}}
  score.notes.forEach((n,i)=>{
   if(position>=n.at+n.beats){if(sounding.has(i)){stop(sounding.get(i));sounding.delete(i);}return;}
   if(position>=n.at&&!started.has(i)){started.add(i);if(!n.rest){const id=`song-compose-${run}-${i}`;sounding.set(i,id);play(midiFor(n)-(audio.octave+1)*12,id);}}
  });
  staff.querySelectorAll('.sheet-note').forEach(el=>{const n=score.notes[Number(el.dataset.index)];el.classList.toggle('playing',position>=n.at&&position<n.at+n.beats);});
  const x=LEFT+position*SCALE,head=$('#compose-playhead');head.setAttribute('x1',x);head.setAttribute('x2',x);head.setAttribute('visibility','visible');
  if(x>scroller.scrollLeft+scroller.clientWidth-35||x<scroller.scrollLeft)scroller.scrollLeft=Math.max(0,x-70);
  frame=requestAnimationFrame(t=>tick(t,run));
 }
 async function start(){
  if(playing){stopPlayback();return;}if(!score.notes.length)return;
  stopPlayback();stopAll();closeListen();const run=++token;
  try{await ready();}catch(e){status(e.message);return;}if(run!==token)return;
  playing=true;position=0;last=performance.now();$('#compose-play').textContent='■ Stop';$('#compose-stop').disabled=false;status('Playing your melody on the alto.');frame=requestAnimationFrame(t=>tick(t,run));
 }
 function close(focus=false){stopPlayback();stop('compose-preview');panel.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus({preventScroll:true});}
 function open(){closeListen();if(!document.querySelector('#keyboard-panel').hidden)document.querySelector('#close-keyboard').click();panel.hidden=false;button.setAttribute('aria-expanded','true');$('#close-compose').focus({preventScroll:true});}
 for(const [name,value]of DURATIONS){const b=document.createElement('button');b.textContent=name;b.dataset.beats=value;b.addEventListener('click',()=>{if(changeSelected({beats:value})){beats=value;syncControls();}});$('#compose-durations').append(b);}
 for(let i=-2;i<=13;i++)$('#compose-pitch').append(new Option(noteName({step:i,acc:0}),String(i)));
 $('#compose-pitch').addEventListener('change',e=>{const value=Number(e.target.value);if(changeSelected({step:value})){step=value;syncControls();}});
 $('#compose-accidentals').addEventListener('click',e=>{const b=e.target.closest('[data-acc]');if(b&&changeSelected({acc:Number(b.dataset.acc)})){acc=Number(b.dataset.acc);syncControls();}});
 $('#compose-rest').addEventListener('click',()=>{const value=!rest;if(changeSelected({rest:value})){rest=value;syncControls();}});
 staff.addEventListener('click',e=>{const note=e.target.closest('[data-index]');if(note){select(Number(note.dataset.index));return;}const point=staff.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(staff.getScreenCTM().inverse());if(local.x<LEFT-12||local.y<38||local.y>178)return;selected=-1;add(Math.max(0,Math.round((local.x-LEFT)/SCALE*4)/4),clamp(Math.round((BOTTOM-local.y)/STEP),-2,13));});
 staff.addEventListener('keydown',e=>{
  const note=e.target.closest('[data-index]');if(!note)return;
  if(['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Delete','Backspace'].includes(e.key)){
   e.preventDefault();selected=Number(note.dataset.index);
   if(e.key==='Delete'||e.key==='Backspace')removeSelected();
   else if(e.key==='ArrowLeft'||e.key==='ArrowRight')moveSelected(e.key==='ArrowLeft'?-.25:.25);
   else if(e.key==='ArrowUp'||e.key==='ArrowDown')changeSelected({step:clamp(score.notes[selected].step+(e.key==='ArrowUp'?1:-1),-2,13)});
   else select(selected);
   staff.querySelector(`[data-index="${selected}"]`)?.focus({preventScroll:true});
  }
 });
 $('#compose-add').addEventListener('click',()=>{add(endBeat(score.notes),step);scroller.scrollLeft=Math.max(0,LEFT+endBeat(score.notes)*SCALE-scroller.clientWidth+50);});
 $('#compose-new').addEventListener('click',()=>{selected=-1;render();});
 $('#compose-delete').addEventListener('click',removeSelected);
 $('#compose-earlier').addEventListener('click',()=>moveSelected(-.25));$('#compose-later').addEventListener('click',()=>moveSelected(.25));
 $('#compose-undo').addEventListener('click',()=>history('undo'));$('#compose-redo').addEventListener('click',()=>history('redo'));
 $('#compose-clear').addEventListener('click',()=>{edit(()=>{score.notes=[];selected=-1;});status('Staff cleared. Undo restores your melody.');});
 $('#compose-name').addEventListener('change',e=>{const title=e.target.value.trim()||'Untitled melody';if(score.title!==title){remember();score.title=title;update();}});
 $('#compose-name').addEventListener('input',e=>{score.title=e.target.value;save();});
 $('#compose-tempo').addEventListener('input',e=>{score.bpm=Number(e.target.value);$('#compose-bpm').textContent=score.bpm+' BPM';save();});
 $('#compose-loop').addEventListener('click',()=>{loop=!loop;$('#compose-loop').setAttribute('aria-pressed',String(loop));});
 $('#compose-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([writeMidi(score)],{type:'audio/midi'})),a=document.createElement('a');a.href=url;a.download=(score.title.replace(/[^a-z0-9 _-]/gi,'').trim()||'my-melody')+'.mid';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('MIDI downloaded in written alto pitch. Import it in Listen to play it again.');});
 button.addEventListener('click',()=>panel.hidden?open():close());$('#close-compose').addEventListener('click',()=>close(true));$('#compose-play').addEventListener('click',start);$('#compose-stop').addEventListener('click',()=>{stopPlayback();status('Stopped.');});
 document.querySelector('#keyboard-toggle').addEventListener('click',()=>close());
 panel.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey?'redo':'undo');}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close(true);});
 render();$('#compose-save').textContent=storageAvailable?'Saved on this device':'Draft in this tab only';
 return {stop:stopPlayback,close};
}


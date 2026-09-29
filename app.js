'use strict';
const instruments = {
 soprano:{name:'Soprano',key:'B♭',offset:-2,voice:'soprano',number:'01 / THE FREE SPIRIT',character:'Clear & luminous',description:'Light. Lyrical. Full of possibility.\nA little closer to the sky.',card:'A clear, singing voice that floats above the ensemble.'},
 alto:{name:'Alto',key:'E♭',offset:-9,voice:'alto',number:'02 / THE ESSENTIAL',character:'Warm & bright',description:'Warm. Expressive. Unmistakable.\nThe voice that feels like home.',card:'The familiar warmth at the heart of the saxophone family.'},
 tenor:{name:'Tenor',key:'B♭',offset:-14,voice:'tenor',number:'03 / THE STORYTELLER',character:'Rich & soulful',description:'Rich. Soulful. Effortlessly cool.\nEvery note has a story.',card:'A rich, resonant sound with a little extra soul.'},
 baritone:{name:'Baritone',key:'E♭',offset:-21,voice:'baritone',number:'04 / THE FOUNDATION',character:'Deep & bold',description:'Deep. Bold. Impossible to ignore.\nFeel the sound beneath the sound.',card:'Big personality. Deep resonance. The foundation of the quartet.'},
 sopranissimo:{name:'Sopranissimo',key:'B♭',offset:10,voice:'soprano',number:'THE RARE FAMILY / HIGHEST',character:'Tiny & brilliant',description:'The smallest of the family.\nA brilliant voice in the highest register.',rare:true,register:'Highest'},
 sopranino:{name:'Sopranino',key:'E♭',offset:3,voice:'soprano',number:'THE RARE FAMILY / HIGH',character:'Light & agile',description:'Small in stature. Bright in spirit.\nAn octave above the alto.',rare:true,register:'High'},
 bass:{name:'Bass',key:'B♭',offset:-26,voice:'baritone',number:'THE RARE FAMILY / LOW',character:'Broad & resonant',description:'A voice with room to resonate.\nAn octave below the tenor.',rare:true,register:'Low'},
 contrabass:{name:'Contrabass',key:'E♭',offset:-33,voice:'baritone',number:'THE RARE FAMILY / LOWER',character:'Vast & powerful',description:'An extraordinary presence.\nAn octave below the baritone.',rare:true,register:'Lower'},
 subcontrabass:{name:'Subcontrabass',key:'B♭',offset:-38,voice:'baritone',number:'THE RARE FAMILY / LOWEST',character:'Immense & rare',description:'At the edge of the family.\nA remarkably rare, very low voice.',rare:true,register:'Lowest'}
};
const $ = s=>document.querySelector(s);
const noteNames=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const shortcuts=['a','w','s','e','d','f','t','g','y','h','u','j','k'];
let selected='alto',octave=4,context,master,analyser,demoToken=0,demoPlaying=false;
const buffers=new Map(),active=new Map();
const midiName=m=>noteNames[((m%12)+12)%12]+(Math.floor(m/12)-1);
const frequency=m=>440*Math.pow(2,(m-69)/12);
function status(text){$('#audio-status').textContent=text;}
function readout(semitone){const written=(octave+1)*12+semitone,midi=written+instruments[selected].offset;$('#current-note').textContent=noteNames[semitone%12];$('#current-octave').textContent=octave+Math.floor(semitone/12);$('#concert-note').textContent=`Concert ${midiName(midi)} · ${frequency(midi).toFixed(1)} Hz`;}
function renderKeyboard(){
 $('#keyboard').replaceChildren();let white=0;
 for(let n=0;n<=12;n++){
  const black=[1,3,6,8,10].includes(n),b=document.createElement('button');
  b.className='piano-key'+(black?' black':'');b.dataset.note=n;b.setAttribute('aria-label',`Play ${noteNames[n%12]}${octave+Math.floor(n/12)} (${shortcuts[n].toUpperCase()})`);b.setAttribute('aria-pressed','false');
  b.innerHTML=`<span>${noteNames[n%12]}</span><span class="shortcut">${shortcuts[n].toUpperCase()}</span>`;
  if(black)b.style.left=`calc(${white*12.5}% - 3.5%)`;else white++;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.focus({preventScroll:true});b.setPointerCapture(e.pointerId);startNote(n,`pointer-${e.pointerId}`);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>stopNote(`pointer-${e.pointerId}`));
  b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();startNote(n,`button-${n}`);}});
  b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();stopNote(`button-${n}`);}});
  b.addEventListener('click',e=>{if(e.detail===0&&!active.has(`button-${n}`)){startNote(n,`accessible-${n}`);setTimeout(()=>stopNote(`accessible-${n}`),500);}});
  $('#keyboard').append(b);
 }
 $('#octave-label').textContent=`Octave ${octave}`;$('#octave-down').disabled=octave===4;$('#octave-up').disabled=octave===5;
}
function paintKeys(){document.querySelectorAll('[data-note]').forEach(b=>{const on=[...active.values()].some(v=>v.n===Number(b.dataset.note));b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});document.body.classList.toggle('sounding',active.size>0);}
async function audioReady(){
 if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');context=new Audio();master=context.createGain();master.gain.value=Number($('#volume').value)/100*.7;analyser=context.createAnalyser();master.connect(analyser);analyser.connect(context.destination);}
 if(context.state!=='running')await context.resume();
}
async function sample(voice,base){
 const key=`${voice}-${base}`;
 if(!buffers.has(key))buffers.set(key,fetch(`assets/audio/${voice}-C${base/12-1}.mp3`).then(r=>{if(!r.ok)throw Error('sample');return r.arrayBuffer();}).then(a=>context.decodeAudioData(a)).catch(e=>{buffers.delete(key);throw e;}));
 return buffers.get(key);
}
async function startNote(n,id){
 if(active.has(id))return;
 const item={n,source:null,gain:null},instrument=instruments[selected];active.set(id,item);paintKeys();readout(n);
 try{
  await audioReady();const midi=(octave+1)*12+n+instrument.offset,base=Math.max(36,Math.min(72,Math.round(midi/12)*12));
  status('Loading sound…');const buffer=await sample(instrument.voice,base);if(active.get(id)!==item)return;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=2**((midi-base)/12);source.connect(gain);gain.connect(master);
  gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(.7,context.currentTime+.025);
  item.source=source;item.gain=gain;source.onended=()=>{source.disconnect();gain.disconnect();if(active.get(id)===item){active.delete(id);paintKeys();}};source.start();
  status(instrument.rare?'Pitch-shifted family voice':'Ready to play');
 }catch(e){if(active.get(id)===item)active.delete(id);paintKeys();status(e.message==='unsupported'?'Audio unavailable in this browser':'Sound couldn’t load. Tap a key to retry.');}
}
function stopNote(id){const item=active.get(id);if(!item)return;active.delete(id);if(item.source){const t=context.currentTime;item.gain.gain.cancelScheduledValues(t);item.gain.gain.setTargetAtTime(0,t,.045);item.source.stop(t+.22);}paintKeys();}
function stopAll(){for(const id of [...active.keys()])stopNote(id);}
function stopDemo(){demoToken++;demoPlaying=false;$('#demo-label').textContent='Hear its voice';$('#demo .play-icon').textContent='▶';$('#demo').setAttribute('aria-pressed','false');stopAll();}
function choose(id,scroll=false){
 stopDemo();selected=id;const s=instruments[id];$('#instrument-name').textContent=s.name+'.';$('#instrument-name').style.fontSize=s.name.length>10?'clamp(24px, 3vw, 39px)':s.name.length>7?'clamp(32px, 4vw, 48px)':'';$('#instrument-description').innerText=s.description;$('#instrument-number').textContent=s.number;$('#instrument-key').textContent=s.key;$('#instrument-character').textContent=s.character;
 $('#instrument-image').hidden=!!s.rare;$('#rare-art').hidden=!s.rare;$('#rare-symbol').textContent=s.key;$('.watermark').textContent=s.rare?'':id;
 if(!s.rare){$('#instrument-image').src=`assets/${id}.png`;$('#instrument-image').alt=`${s.name} saxophone`;}
 $('#visual-caption').textContent=s.rare?'EXPLORE THE REGISTER':`THE ${s.name.toUpperCase()} SAXOPHONE`;
 document.querySelectorAll('[data-instrument]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.instrument===id));$('#more-button').setAttribute('aria-pressed',!!s.rare);$('#rare-menu').hidden=true;$('#more-button').setAttribute('aria-expanded','false');
 readout(0);status(s.rare?'Pitch-shifted family voice':'Touch a key to begin');if(scroll)$('#studio').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
for(const [id,s] of Object.entries(instruments)){
 if(!s.rare){const b=document.createElement('button');b.className='card';b.dataset.instrument=id;b.innerHTML=`<div class="card-image"><img src="assets/${id}.png" alt="${s.name} saxophone" loading="lazy"></div><span class="card-meta">${s.key} SAXOPHONE</span><h3>${s.name}</h3><p>${s.card}</p><span class="card-bottom">Explore the ${id}<span class="card-plus" aria-hidden="true">+</span></span>`;$('#cards').append(b);}
 else{const b=document.createElement('button');b.dataset.instrument=id;b.innerHTML=`<span class="family-key">${s.key}</span><strong>${s.name}</strong><small>${s.register}</small><span class="family-play" aria-hidden="true">▶</span>`;$('#family-list').append(b);}
}
document.querySelectorAll('[data-instrument]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.instrument,!!b.closest('#cards,#family-list'))));
$('#more-button').addEventListener('click',()=>{const open=$('#rare-menu').hidden;$('#rare-menu').hidden=!open;$('#more-button').setAttribute('aria-expanded',open);});
document.addEventListener('click',e=>{if(!e.target.closest('#rare-menu,#more-button')){$('#rare-menu').hidden=true;$('#more-button').setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){stopDemo();$('#rare-menu').hidden=true;$('#more-button').setAttribute('aria-expanded','false');return;}
 if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea,select'))return;
 const n=shortcuts.indexOf(e.key.toLowerCase());if(n!==-1){e.preventDefault();if(!e.repeat)startNote(n,`key-${n}`);}
});
document.addEventListener('keyup',e=>{const n=shortcuts.indexOf(e.key.toLowerCase());if(n!==-1)stopNote(`key-${n}`);});
window.addEventListener('blur',stopDemo);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDemo();});
for(const [selector,amount] of [['#octave-down',-1],['#octave-up',1]])$(selector).addEventListener('click',()=>{stopDemo();octave=Math.max(4,Math.min(5,octave+amount));renderKeyboard();readout(0);});
$('#volume').addEventListener('input',e=>{if(master)master.gain.setTargetAtTime(Number(e.target.value)/100*.7,context.currentTime,.02);});
$('#demo').addEventListener('click',async()=>{
 if(demoPlaying){stopDemo();return;}stopAll();const token=++demoToken;demoPlaying=true;$('#demo-label').textContent='Stop listening';$('#demo .play-icon').textContent='■';$('#demo').setAttribute('aria-pressed','true');
 try{await audioReady();const s=instruments[selected];await Promise.all([36,48,60,72].map(base=>sample(s.voice,base)));}catch{status('Sound couldn’t load. Try again.');stopDemo();return;}
 if(token!==demoToken)return;
 for(const [i,n] of [0,3,5,7,10,9,7,3,0].entries()){if(token!==demoToken)return;const id=`demo-${i}`;await startNote(n,id);await new Promise(r=>setTimeout(r,i===8?650:260));if(token!==demoToken)return;stopNote(id);await new Promise(r=>setTimeout(r,65));}
 if(token===demoToken)stopDemo();
});
$('.wave').innerHTML=Array.from({length:29},(_,i)=>`<i style="--height:${5+25*Math.sin(i*.9)**2}px;--delay:${-i*.04}s"></i>`).join('');
renderKeyboard();choose('alto');

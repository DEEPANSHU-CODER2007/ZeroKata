/* ZeroKata: game logic, UI, tiny Web Audio sounds, mascot reactions. */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const copy={win:["Arre waah! Beginner's luck?","Okay genius, take a bow.","Zero ne Zero kar diya!"],lose:["Better luck next time, champ.","Sir, board dekh ke khelo.","Maine toh warm-up kiya tha."],draw:["Dono hi sharif nikle.","A draw. Everyone is equally mid."],thinking:["Hmm... soch raha hoon...","Calculating... chai break?"]};
let board,turn,gameOver,mode='computer',human='X',bot='O',first='human',thinkingTimer;
function savedValue(key,fallback){try{return {...fallback,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return {...fallback}}}
let score=savedValue('zerokata-score',{you:0,bot:0,draw:0,streak:0});
let prefs=savedValue('zerokata-prefs',{sound:true,vibration:true,dark:false});
let friendNames=savedValue('zerokata-friend-names',{x:'Player X',o:'Player O'});
const say=t=>{$('#bubble').textContent=t;$('#live').textContent=t}; const pick=a=>a[Math.floor(Math.random()*a.length)];
function save(){localStorage.setItem('zerokata-score',JSON.stringify(score));localStorage.setItem('zerokata-prefs',JSON.stringify(prefs));localStorage.setItem('zerokata-friend-names',JSON.stringify(friendNames))}
function cleanName(value,fallback){return value.trim().replace(/\s+/g,' ').slice(0,14)||fallback}
function playerName(mark){return mark==='X'?friendNames.x:friendNames.o}
function tone(f=440,d=.09,type='sine'){const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!prefs.sound||!AudioCtx)return;let c=new AudioCtx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d)}
function buzz(p=12){if(prefs.vibration&&navigator.vibrate)navigator.vibrate(p)}
function markSVG(m){return m==='X'?'<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><line x1="18" y1="18" x2="82" y2="82"/><line x1="82" y1="18" x2="18" y2="82"/></svg>':'<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="32"/></svg>'}
function render(){const b=$('#board');b.innerHTML='';board.forEach((v,i)=>{let el=document.createElement('button');el.className='cell '+(v?v.toLowerCase():'');el.dataset.i=i;el.disabled=!!v||gameOver||thinkingTimer;el.setAttribute('role','gridcell');el.setAttribute('aria-label',v?`Cell ${i+1}, ${v}`:`Empty cell ${i+1}`);el.innerHTML=v?markSVG(v):'';el.onclick=()=>move(i);b.append(el)});updateScore()}
function updateScore(){ $('#youScore').textContent=score.you;$('#botScore').textContent=score.bot;$('#drawScore').textContent=score.draw;$('#youLabel').textContent=mode==='friend'?`${friendNames.x} (X)`:'YOU ('+human+')';$('#botLabel').textContent=mode==='friend'?`${friendNames.o} (O)`:'ZERO-BHAI ('+bot+')';$('#streak').hidden=score.streak<3;updateAchievements()}
function updateAchievements(){const games=score.you+score.bot+score.draw;const unlocked={firstWin:score.you>=1,streak:score.streak>=3,guru:score.you>=5,draws:score.draw>=3,veteran:games>=10};let count=0;$$('[data-achievement]').forEach(card=>{const done=unlocked[card.dataset.achievement];card.classList.toggle('unlocked',done);card.setAttribute('aria-label',`${card.querySelector('strong').textContent}: ${done?'unlocked':'locked'}`);if(done)count++});$('#achievementProgress').textContent=count===5?'🏆 Trophy shelf full! Zero-Bhai is impressed.':`${count}/5 achievements unlocked · Khelte raho, legend!`}
function setMascot(state){$('#mascot').className='mascot '+state;const status={idle:'LEVEL 99 · GRID GURU',thinking:'SCANNING THE GRID…',shocked:'SYSTEM SHOCKED! ⚡',clap:'RESPECT EARNED ✨',smug:'ZERO-BHAI SUPREMACY',shrug:'DRAW DETECTED 🤝',facepalm:'OOPS, BHAI.'};$('#botStatus').textContent=status[state]||status.idle}
function syncModeControls(){const friend=mode==='friend';$('#friendNames').hidden=!friend;$('#markControl').hidden=friend;$('#difficultyControl').hidden=friend;$('#firstMoveLabel').textContent=friend?'WHO STARTS?':'FIRST MOVE';$('[data-first="human"]').textContent=friend?`${friendNames.x} (X)`:'ME';$('[data-first="computer"]').textContent=friend?`${friendNames.o} (O)`:'ZERO-BHAI';$('#playerXName').value=friendNames.x==='Player X'?'':friendNames.x;$('#playerOName').value=friendNames.o==='Player O'?'':friendNames.o}
function turnMessage(){if(mode==='friend')return `${playerName(turn)}'s turn (${turn}). Chalo, dikhao magic!`;return turn===human?`Your turn (${human}). Chalo, dikhao magic!`:pick(copy.thinking)}
function newRound(){clearTimeout(thinkingTimer);thinkingTimer=null;$('#modal').hidden=true;board=Array(9).fill('');gameOver=false;turn=mode==='friend'?(first==='human'?'X':'O'):(first==='human'?human:bot);$('#winLine').style.display='none';setMascot('idle');say(turnMessage());render();if(mode==='computer'&&turn===bot)computerTurn()}
function move(i){if(gameOver||board[i]||thinkingTimer){if(board[i]){say('Wahan jagah nahi hai, bhai.');$('#board').classList.remove('shake');void $('#board').offsetWidth;$('#board').classList.add('shake');tone(120,.12,'sawtooth')}return} board[i]=turn;tone(turn==='X'?520:380,.1,'triangle');buzz();say(mode==='friend'?`${playerName(turn)} ne ${turn} lagaya!`:`${turn} placed. Board is watching.`);render();let r=result(board);if(r)return finish(r);turn=turn==='X'?'O':'X';render();if(mode==='computer'&&turn===bot)computerTurn()}
function result(b){for(let w of WINS)if(b[w[0]]&&w.every(i=>b[i]===b[w[0]]))return{winner:b[w[0]],line:w};return b.every(Boolean)?{draw:true}:null}
function finish(r){
  gameOver=true;render();
  if(r.draw){
    score.draw++;score.streak=0;setMascot('shrug');say(pick(copy.draw));
    openModal('🤝','Dono hi sharif!',pick(copy.draw));tone(250,.25,'sine');
  }else{
    highlight(r.line);
    const playerWon=mode==='friend'?r.winner==='X':r.winner===human;
    if(playerWon){
      score.you++;score.streak++;setMascot('shocked');setTimeout(()=>setMascot('clap'),350);say(pick(copy.win));
      const winnerName=mode==='friend'?playerName('X'):'YOU';const title=mode==='friend'?`${winnerName} WINS!`:'YOU WIN!';openModal('🏆',title,mode==='friend'?`${winnerName} ne baazi maar li!`:`${pick(copy.win)} Zero-Bhai ko clean sweep!`);confetti();tone(700,.35,'square');
    }else{
      score.bot++;score.streak=0;
      if(mode==='friend'){
        const winnerName=playerName('O');setMascot('clap');say(`${winnerName} ne baazi maar li!`);openModal('🏆',`${winnerName} WINS!`,`${winnerName} ne O ke saath baazi maar li!`);confetti();tone(700,.35,'square');
      }else{
        setMascot('smug');say(pick(copy.lose));openModal('😎','Zero-Bhai wins!',pick(copy.lose));tone(160,.45,'sawtooth');
      }
    }
  }
  save();updateScore();
}
function highlight(line){let cells=$$('.cell');line.forEach(i=>cells[i].classList.add('win'));let a=cent(line[0]),b=cent(line[2]),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),el=$('#winLine');el.style.cssText=`display:block;left:${a.x}px;top:${a.y-5}px;width:${l}px;transform:rotate(${Math.atan2(dy,dx)}rad)`}function cent(i){let c=$$('.cell')[i],p=$('.board-wrap').getBoundingClientRect(),r=c.getBoundingClientRect();return{x:r.left-p.left+r.width/2,y:r.top-p.top+r.height/2}}
function computerTurn(){setMascot('thinking');say(pick(copy.thinking));thinkingTimer=setTimeout(()=>{if(gameOver)return;thinkingTimer=null;setMascot('idle');move(aiMove())},500+Math.random()*400);render()}
function aiMove(){let d=$('#difficulty').value,empty=board.map((x,i)=>x?null:i).filter(x=>x!==null);if(d==='easy')return pick(empty);let tactical=m=>{for(let i of empty){let b=[...board];b[i]=m;if(result(b)?.winner===m)return i}return null};const smartPick=()=>[4,0,2,6,8,1,3,5,7].find(i=>empty.includes(i));return tactical(bot)??tactical(human)??(d==='medium'?smartPick():minimax(board,bot,-Infinity,Infinity).i)}
function minimax(b,p,a,be){let r=result(b);if(r)return{v:r.draw?0:r.winner===bot?10:-10};let options=[];for(let i=0;i<9;i++)if(!b[i]){b[i]=p;let q=minimax(b,p===bot?human:bot,a,be);options.push({i,v:q.v});b[i]='';if(p===bot)a=Math.max(a,q.v);else be=Math.min(be,q.v);if(be<=a)break}return p===bot?options.reduce((x,y)=>y.v>x.v?y:x):options.reduce((x,y)=>y.v<x.v?y:x)}
function openModal(e,t,c){$('#resultEmoji').textContent=e;$('#resultTitle').textContent=t;$('#resultCopy').textContent=c;$('#modal').hidden=false}function confetti(){for(let i=0;i<34;i++){let e=document.createElement('i');e.className='conf';e.textContent=Math.random()>.5?'✕':'◯';e.style.left=Math.random()*100+'vw';e.style.color=Math.random()>.5?'var(--pink)':'var(--yellow)';e.style.animationDelay=Math.random()*.3+'s';$('#confetti').append(e);setTimeout(()=>e.remove(),1900)}}
$$('[data-mode]').forEach(x=>x.onclick=()=>{mode=x.dataset.mode;$$('[data-mode]').forEach(y=>y.classList.toggle('selected',y===x));syncModeControls();newRound()});$$('[data-human]').forEach(x=>x.onclick=()=>{human=x.dataset.human;bot=human==='X'?'O':'X';$$('[data-human]').forEach(y=>y.classList.toggle('selected',y===x));newRound()});$$('[data-first]').forEach(x=>x.onclick=()=>{first=x.dataset.first;$$('[data-first]').forEach(y=>y.classList.toggle('selected',y===x));newRound()});
$('#newRound').onclick=newRound;$('#again').onclick=()=>newRound();$('#changeMode').onclick=()=>{newRound();$('.controls').scrollIntoView({behavior:'smooth'})};$('#closeModal').onclick=()=>$('#modal').hidden=true;$('#share').onclick=()=>{if(navigator.share){navigator.share({title:'ZeroKata',text:'I beat Zero-Bhai at ZeroKata! Can you?',url:location.href}).catch(error=>{if(error.name!=='AbortError')say('Share app ne thoda nakhra kiya. Phir try karo!')});return}if(navigator.clipboard){navigator.clipboard.writeText(location.href).then(()=>say('Link copied. Ab sabko challenge karo!')).catch(()=>say('Copy-paste this page URL, bhai!'))}else say('Copy-paste this page URL, bhai!')};
$('#sound').checked=prefs.sound;$('#vibration').checked=prefs.vibration;$('#sound').onchange=e=>{prefs.sound=e.target.checked;save()};$('#vibration').onchange=e=>{prefs.vibration=e.target.checked;save()};if(prefs.dark)document.body.classList.add('dark');$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');prefs.dark=document.body.classList.contains('dark');save()};$('#resetScore').onclick=()=>{score={you:0,bot:0,draw:0,streak:0};save();updateScore();say('Scores wiped. Naya chapter, bhai!')};
$('#playerXName').oninput=e=>{friendNames.x=cleanName(e.target.value,'Player X');save();syncModeControls();updateScore()};$('#playerOName').oninput=e=>{friendNames.o=cleanName(e.target.value,'Player O');save();syncModeControls();updateScore()};
document.addEventListener('keydown',e=>{let cells=$$('.cell'),n=cells.indexOf(document.activeElement);if(n<0)return;let next={ArrowRight:n+1,ArrowLeft:n-1,ArrowDown:n+3,ArrowUp:n-3}[e.key];if(next!==undefined){e.preventDefault();cells[(next+9)%9].focus()}if(e.key==='Enter'||e.key===' ')cells[n].click()});
window.addEventListener('offline',()=>say('Internet gaya chai peene. Game still works!'));window.addEventListener('online',()=>say('Internet chai se wapas aa gaya.'));if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');syncModeControls();newRound();

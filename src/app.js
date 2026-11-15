import { countCorrect, awardedStars, levelXP, totalXP, recommendedQuest, updateBest, loadProgress, saveProgress, selectUsername, activeUsername, playerDisplayName, readQuest, writeQuest, listQuestStates } from './scoring.js';
const app = document.getElementById('app');
const weeks = [
 {week:1,title:'Output & Variables',emoji:'🖨️',subtitle:'print(), input(), variables and arithmetic'},
 {week:2,title:'Logic & Decisions',emoji:'🚦',subtitle:'if / elif / else and Boolean logic'},
 {week:3,title:'Loop Master',emoji:'🔁',subtitle:'for, range(), while and nested loops'},
 {week:4,title:'Function Builder',emoji:'🧩',subtitle:'def, parameters and return values'}
];
const diffs = ['easy','medium','hard','extra'];
const coreDiffs = ['easy','medium','hard'];
const labels = {easy:'Easy',medium:'Medium',hard:'Hard',extra:'Extra Rock'};
const points = {easy:10,medium:15,hard:20,extra:25};
let allQuestions = [];
let allTraces = {};
let username = activeUsername();
let progress = username ? loadProgress(username) : {best:{}};
let state = {view:username ? 'home' : 'welcome',week:1,difficulty:'easy',index:0,attempt:[],draft:'',checked:false,feedback:null,hint:false,answered:false,loginDraft:'',reviewPractice:false,reviewDraft:'',reviewFeedback:null,traceOpen:false,traceIndex:0};
const escapeHTML = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (label,action,kind='')=>`<button class="btn ${kind}" data-action="${action}">${label}</button>`;
const scoreKey=(w,d)=>`W${w}-${d}`;
const best=(w,d)=>progress.best[scoreKey(w,d)] || 0;
function render(){
 document.getElementById('total-xp').textContent=totalXP(progress.best).toLocaleString();
 const playerEl=document.getElementById('player-switch');
 if(playerEl){playerEl.textContent=username?'👤 '+playerDisplayName(username)+' · Switch':'👤 Choose Player';playerEl.hidden=false;}
 let content;
 if(state.view==='welcome')content=welcome();
 else if(state.view==='home')content=home();
 else if(state.view==='levels')content=levels();
 else if(state.view==='difficulty')content=difficultyView();
 else if(state.view==='quiz')content=quiz();
 else if(state.view==='resume')content=resumeView();
 else if(state.view==='review')content=reviewView();
 else if(state.view==='results')content=results();
 else if(state.view==='progress')content=progressView();
 app.innerHTML=content;
}
function welcome(){return `<section class="welcome card"><div class="big-emoji">🐍</div><div class="eyebrow">Python Quest</div><h1>Welcome, Python Explorer!</h1><p class="muted">Enter a player name to keep your stars and scores on this browser. Leave it blank to play as <strong>username</strong>.</p><form id="player-form"><label for="player-name">Player name (optional)</label><input id="player-name" class="answer-input" type="text" maxlength="32" autocomplete="off" placeholder="e.g. CodingDragon" value="${escapeHTML(state.loginDraft||'')}"><button class="btn primary block" type="submit">Start Playing →</button></form><p class="footnote">No password or account needed. Each name has separate progress on this computer. Names are not private or secure.</p></section>`;}
function header(){return `<button class="back" data-action="back">← Back</button>`;}
function home(){
 const next=recommendedQuest(progress.best);
 const activeRuns=Object.entries(listQuestStates(username)).filter(([key,v])=>v?.active&&(!key.endsWith('-hard')||v.active.revision==='curriculum-v2'));
 const completed=Object.values(progress.best).filter(n=>n>=3).length;
 return `<section class="hero"><div class="eyebrow">Welcome, ${escapeHTML(playerDisplayName(username))}!</div><h1>Small challenges. Big discoveries. 🚀</h1><p class="muted">Practice real Python skills, earn stars and build confidence—five questions at a time.</p><div class="btn-row">${button('Continue: Week '+next.week+' · '+labels[next.difficulty],'continue','primary')}${button('My progress','progress')}</div></section>
 ${activeRuns.length?`<div class="card" style="margin-bottom:16px"><h3>📌 Unfinished quests</h3><p class="muted small">Continue from your saved question.</p>${activeRuns.map(([key,v])=>`<button class="btn" style="margin:5px" data-action="open-saved:${key}">${escapeHTML(key.replace('-', ' · '))} · Question ${v.active.index+1}/5 →</button>`).join('')}</div>`:''}
 <div class="kpi-row"><div class="kpi"><b>${totalXP(progress.best)}</b><span class="muted small">Total XP</span></div><div class="kpi"><b>${completed}/16</b><span class="muted small">Quests passed</span></div><div class="kpi"><b>${weeks.filter(w=>coreDiffs.every(d=>best(w.week,d)>=3)).length}/4</b><span class="muted small">Topic badges</span></div></div>
 <h2 class="section-title">Choose your challenge</h2><div class="cards">
 <article class="card week-card"><div class="big-emoji">🚀</div><h3>Challenge 1 — Python Explorer</h3><p class="muted">Weeks 1–4: basic syntax, logic, loops and functions.</p><span class="tag green">4 weeks · 80 questions</span>${button('Explore levels →','levels','primary block')}</article>
 <article class="card week-card"><div class="big-emoji">💎</div><h3>Challenge 2 — Data Explorer</h3><p class="muted">Weeks 6–9: lists, strings, sets and dictionaries.</p><span class="tag">Coming later</span><button class="btn block" disabled>Not available yet</button></article></div>`;
}
function levels(){
 const recommended=recommendedQuest(progress.best);
 return `${header()}<div class="eyebrow">Challenge 1</div><h1>Choose a Week</h1><p class="muted">Every level is unlocked. Follow the suggested path or jump to any topic.</p>
 <div class="cards">${weeks.map(w=>`<article class="card week-card"><div class="split"><span class="big-emoji">${w.emoji}</span>${recommended.week===w.week?'<span class="tag">Recommended</span>':''}</div><h3>Week ${w.week} · ${w.title}</h3><p class="muted small">${w.subtitle}</p><p class="status-line">Best: ${diffs.map(d=>`${labels[d]} ${best(w.week,d)}/5`).join(' · ')}</p>${button('Choose difficulty →','week:'+w.week,'primary block')}</article>`).join('')}</div>`;
}
function difficultyView(){
 const w=weeks.find(x=>x.week===state.week);
 return `${header()}<div class="eyebrow">Challenge 1 · Week ${w.week}</div><h1>${w.emoji} ${w.title}</h1><p class="muted">${w.subtitle}. Pick any difficulty.</p><div class="difficulty-grid">
 ${diffs.map(d=>{const saved=getQuest(username,state.week,d);return `<article class="card week-card"><span class="tag ${d==='easy'?'green':d==='hard'?'red':d==='extra'?'red':'gold'}">${labels[d]}</span><h3>5 questions</h3><p class="muted small">${d==='easy'?'Understand the basics':d==='medium'?'Apply what you learned':d==='hard'?'Multi-step reasoning and debugging':'Ultimate cross-topic challenge'}</p><p>Best: <strong>${best(w.week,d)}/5</strong> · ${'⭐'.repeat(awardedStars(best(w.week,d))) || 'No stars yet'}</p><p class="muted small">${points[d]} XP per question solved</p>${d==='extra'?'<span class="tag gold">🪨 Bonus challenge</span>':''}${button(saved.active?'Continue / Start Over':'Start '+labels[d],'start:'+d,'primary block')}${saved.completed?button('📖 Review cards','review:'+d,'block'):''}</article>`;}).join('')}</div>`;
}

function getQuest(username,week,difficulty){
 const record=readQuest(username,week,difficulty);
 if(difficulty==='hard'){
  if(record.active?.revision!=='curriculum-v2')record.active=null;
  if(record.completed?.revision!=='curriculum-v2')record.completed=null;
 }
 return record;
}

function saveActive(){
 if(!username||state.view!=='quiz')return;
 const active={
  revision:'curriculum-v2',index:state.index,draft:state.draft,checked:state.checked,feedback:state.feedback,hint:state.hint,
  attempt:state.attempt.map(a=>({
   id:a.question.id,solved:!!a.solved,revealed:!!a.revealed,submitted:!!a.submitted,
   lastAnswer:a.lastAnswer??'',lastWasCorrect:!!a.lastWasCorrect,hintUsed:!!a.hintUsed
  }))
 };
 writeQuest(username,state.week,state.difficulty,{active});
}
function hydrateRun(saved){
 if(!saved||!Array.isArray(saved.attempt)||saved.attempt.length!==5)return false;
 const attempt=saved.attempt.map(a=>{
  const question=allQuestions.find(q=>q.id===a.id);
  return question?{question,solved:!!a.solved,revealed:!!a.revealed,submitted:!!a.submitted,
   lastAnswer:a.lastAnswer??'',lastWasCorrect:!!a.lastWasCorrect,hintUsed:!!a.hintUsed}:null;
 });
 if(attempt.some(a=>!a))return false;
 state={...state,view:'quiz',index:Math.min(4,Math.max(0,Number(saved.index)||0)),
  attempt,draft:saved.draft||'',checked:!!saved.checked,feedback:saved.feedback||null,
  hint:!!saved.hint,oldBest:best(state.week,state.difficulty)};
 return true;
}
function resumeView(){
 const saved=getQuest(username,state.week,state.difficulty);
 return `${header()}<div class="card welcome"><div class="big-emoji">📌</div><h1>Your quest is saved!</h1><p>Week ${state.week} · ${labels[state.difficulty]}</p><p class="muted">You stopped at question ${(saved.active?.index??0)+1} of 5.</p>
 <div class="btn-row">${button('▶ Continue Quest','resume','primary')}${button('↻ Start Over','fresh')}</div><p class="footnote">Start Over discards only this unfinished run, never your personal best score.</p></div>`;
}
function reviewView(){
 const snap=getQuest(username,state.week,state.difficulty).completed;
 if(!snap?.attempt?.length)return `${header()}<div class="card">No completed cards to review yet.</div>`;
 const item=snap.attempt[state.index];const q=allQuestions.find(x=>x.id===item.id);
 if(!q)return `${header()}<p>This question is no longer available.</p>`;
 const practice=state.reviewPractice;
 const editable=practice?(q.options?.length
 ?`<div role="group" aria-label="Practice answers">${q.options.map((o,i)=>`<button class="option" data-review-choice="${i}" aria-pressed="${state.reviewDraft===o}"><span class="letter">${'ABCD'[i]}</span><span class="choice-text">${escapeHTML(o)}</span></button>`).join('')}</div>`
 :`<label for="review-answer">Try it again</label><textarea id="review-answer" class="answer-input" rows="${q.answer.includes('\n')?4:2}" placeholder="Your answer...">${escapeHTML(state.reviewDraft)}</textarea>`):'';
 const status=item.solved?'✅ Solved':item.revealed?'📖 Answer viewed':'💡 Not solved';
 return `<div class="question-panel">${header()}<div class="question-meta"><span class="tag">Review · Week ${state.week} · ${labels[state.difficulty]}</span><strong>Card ${state.index+1} / 5</strong></div>
 <div class="progress"><div style="width:${(state.index+1)*20}%"></div></div><div class="card" style="margin-top:18px">
 <span class="tag ${item.solved?'green':'gold'}">${status}</span><h2 style="margin-top:12px">${escapeHTML(q.prompt)}</h2>${tracePanel(q)}
 ${!practice?`<div class="review-answer"><p><strong>Your saved answer:</strong> <span style="white-space:pre-wrap">${escapeHTML(item.lastAnswer||'No answer entered')}</span></p>
 <p><strong>Correct answer:</strong> <span style="white-space:pre-wrap">${escapeHTML(q.answer)}</span></p>
 <p><strong>Explanation:</strong> ${escapeHTML(q.explanation)}</p></div>`:''}
 ${editable}
 ${state.reviewFeedback?`<div class="feedback ${state.reviewFeedback.correct?'':'wrong'}" role="status"><strong>${state.reviewFeedback.correct?'✅ You got it!':'Not yet — try again or return to the answer.'}</strong>${state.reviewFeedback.correct?`<p>${escapeHTML(q.explanation)}</p>`:''}</div>`:''}
 <div class="btn-row">${practice?button('Check retry','review-check','primary')+button('Cancel retry','review-cancel'):button('↻ Retry this card','review-retry','primary')}</div>
 </div><div class="btn-row">${button('← Previous','review-prev')}${button(state.index===4?'Back to results':'Next →',state.index===4?'review-exit':'review-next','primary')}</div>
 <p class="footnote">Review is always available after finishing. Practice retries here do not change your saved best score; to earn more XP, start a new five-card quest.</p></div>`;
}
function finishQuest(){
 const n=countCorrect(state.attempt);
 const completed={revision:'curriculum-v2',completedAt:new Date().toISOString(),score:n,attempt:state.attempt.map(a=>({
  id:a.question.id,solved:!!a.solved,revealed:!!a.revealed,
  lastAnswer:a.lastAnswer??'',lastWasCorrect:!!a.lastWasCorrect,hintUsed:!!a.hintUsed
 }))};
 writeQuest(username,state.week,state.difficulty,{active:null,completed});
 progress=updateBest(progress,state.week,state.difficulty,n);saveProgress(progress,username);
 navigate('results');
}


function resetTrace(){state.traceOpen=false;state.traceIndex=0;}
function valueDisplay(value){return typeof value==='string'?JSON.stringify(value):String(value);}
function traceCondition(step,codeLines){
 // Only show decisions when a trace explicitly reports True/False.
 // This avoids treating assignments or function calls as condition checks.
 if(!Number.isInteger(step.line)||step.line<0)return null;
 const source=(codeLines[step.line]||'').trim();
 if(!/^(if|elif|while)\b/.test(source))return null;
 const match=step.explanation.match(/\b(?:True|False)\b(?=[.:,;\s]|$)/);
 if(!match)return null;
 const passed=match[0]==='True';
 const loop=source.startsWith('while ');
 const expression=source.replace(/^(?:if|elif|while)\s+/,'').replace(/:\s*$/,'');
 return {passed,expression,action:loop?(passed?'Continue Loop':'Exit Loop'):(passed?'Enter Branch':'Skip Branch')};
}

function tracePanel(q){
 const trace=allTraces[q.id];
 const simpleCode=()=>`<pre class="code"><code>${escapeHTML(q.code)}</code></pre>`;
 if(!trace)return simpleCode();
 if(!state.traceOpen)return `${simpleCode()}<button class="btn trace-toggle" data-action="trace-open">👀 Watch How the Code Works</button>`;
 const steps=trace.steps;
 const index=Math.min(state.traceIndex,steps.length-1);
 const step=steps[index];const previous=steps[Math.max(0,index-1)];
 const code=q.code.split('\n');
 const variables=Object.entries(step.variables||{});
 const condition=traceCondition(step,code);
 const codeLines=code.map((line,i)=>`<div class="trace-line ${step.line===i?'trace-line-active':''}"><span class="trace-arrow" aria-hidden="true">${step.line===i?'➜':''}</span><span class="trace-lineno">${i+1}</span><span class="trace-source">${escapeHTML(line)}</span></div>`).join('');
 const variableRows=variables.map(([name,value])=>{
  const isNew=!(name in (previous.variables||{}));
  const changed=isNew||JSON.stringify(previous.variables[name])!==JSON.stringify(value);
  return `<div class="trace-variable ${changed?'trace-variable-changed':''}"><span class="trace-var-name">${escapeHTML(name)}</span><span class="trace-var-value">${escapeHTML(valueDisplay(value))}</span>${changed?`<span class="trace-var-tag">${isNew?'New':'Updated'}</span>`:''}</div>`;
 }).join('');
 return `<section class="trace-shell" aria-label="Step-by-step Python execution">
  <div class="trace-titlebar"><strong>👀 Watch How the Code Works</strong><button class="btn trace-close" data-action="trace-close">✕ Close</button></div>
  <div class="trace-layout">
   <div class="trace-code-panel"><div class="trace-panel-title">Python Code</div><div class="trace-code" aria-label="Current executing line: ${step.line<0?'not started':step.line+1}">${codeLines}</div></div>
   <div class="trace-state-panel"><div class="trace-panel-title">Variables</div><div class="trace-vars">${variableRows||'<p class="trace-empty">No variables yet</p>'}</div>
    ${condition?`<div class="trace-condition ${condition.passed?'trace-condition-pass':'trace-condition-fail'}" role="status"><div class="trace-condition-label">Condition Check</div><div class="trace-condition-result"><span class="trace-condition-icon" aria-hidden="true">${condition.passed?'✓':'✕'}</span><span><strong>${condition.passed?'True':'False'}</strong><span class="trace-condition-action">${condition.action}</span></span></div><code class="trace-condition-expression">${escapeHTML(condition.expression)}</code></div>`:''}
    <div class="trace-panel-title trace-output-title">Output</div>
    <div class="trace-output" aria-label="Program output">${(step.output||[]).length?`<pre>${escapeHTML(step.output.join('\n'))}</pre>`:'<span class="trace-empty">Nothing printed yet</span>'}</div>
    ${step.error?`<div class="trace-error"><strong>Program stopped with an error</strong><div>${escapeHTML(step.error)}</div></div>`:''}
   </div>
  </div>
  <div class="trace-narration" aria-live="polite"><div class="trace-stepcount">Step ${index} / ${steps.length-1}</div><p><strong class="trace-explanation-label">Explanation:</strong> ${escapeHTML(step.explanation)}</p></div>
  <div class="trace-controls">
   <button class="btn" data-action="trace-prev" ${index===0?'disabled':''}>← Previous</button>
   <button class="btn primary" data-action="trace-next" ${index===steps.length-1?'disabled':''}>Next Step →</button>
   <button class="btn" data-action="trace-restart" ${index===0?'disabled':''}>↻ Restart</button>
  </div><p class="trace-footnote">A guided example, not a live Python runner. The trace starts with empty variables. Tracing does not change your score.</p>
 </section>`;
}

function currentQuestion(){return state.attempt[state.index];}
function normalize(x){return String(x).replace(/\\n/g,'\n').replace(/\r\n/g,'\n').trim();}
function quiz(){
 const item=currentQuestion(); const q=item.question;
 const locked=state.checked;
 const opts=q.options?.length ? `<div role="group" aria-label="Answer options">${q.options.map((o,i)=>`<button class="option" data-choice="${i}" aria-pressed="${state.draft===o}" ${locked?'disabled':''}><span class="letter">${'ABCD'[i]}</span><span class="choice-text">${escapeHTML(o)}</span></button>`).join('')}</div>`:`<label for="answer" class="small muted">Type your answer below. For multiple lines, use the Enter key.</label><textarea id="answer" class="answer-input" rows="${q.answer.includes('\n')?4:2}" ${locked?'disabled':''} placeholder="Your answer...">${escapeHTML(state.draft)}</textarea>`;
 const f=state.feedback;
 const correct=state.checked&&f?.correct;
 const revealed=state.checked&&f?.revealed;
 const wrong=state.checked&&!correct&&!revealed;
 let actions;
 if(correct||revealed) actions=button(state.index===4?'See results →':'Next question →','next','primary');
 else if(wrong)actions=button('💡 Give me a hint','hint')+button('↻ Retry','retry','primary')+button('Show answer','reveal');
 else actions=button('💡 Give me a hint','hint')+button('Check answer','check','primary');
 return `<div class="question-panel">${header()}<div class="question-meta"><span class="tag">Week ${state.week} · ${labels[state.difficulty]}</span><strong>Question ${state.index+1} / 5</strong></div><div class="progress"><div style="width:${(state.index+1)*20}%"></div></div><div class="card" style="margin-top:22px"><h2>${escapeHTML(q.prompt)}</h2>${tracePanel(q)}${opts}
 ${state.hint&&!revealed&&!correct?`<div class="hint">💡 ${escapeHTML(q.hint)}</div>`:''}
 ${state.checked?`<div class="feedback ${wrong?'wrong':''}" role="status"><strong>${correct?'✅ Correct!':revealed?'📖 Answer & explanation':'🔄 Not quite. Try again or see the answer.'}</strong>${correct||revealed?`<p><strong>Correct answer:</strong> <span style="white-space:pre-wrap">${escapeHTML(q.answer)}</span></p><p style="margin-top:8px">${escapeHTML(q.explanation)}</p>`:`<p>You can ask for a hint, retry the question, or reveal the correct answer with an explanation.</p>`}</div>`:''}
 <div class="btn-row">${actions}</div></div><p class="footnote">Correct answers earn full XP, even after a hint or retry. Revealing the answer earns 0 XP for that question.</p></div>`;
}
function results(){
 const n=countCorrect(state.attempt);const old=state.oldBest;const fresh=best(state.week,state.difficulty);const xpGain=(fresh-old)*points[state.difficulty];const stars=awardedStars(n);
 return `<div class="result"><div class="big-emoji">${n>=3?'🏆':'🌱'}</div><h1>${n>=3?'Quest complete!':'Nice effort—keep practicing!'}</h1><p class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)}</p><p class="muted">Week ${state.week} · ${labels[state.difficulty]}</p><div class="kpi-row"><div class="kpi"><b>${n}/5</b><span class="small muted">Questions solved</span></div><div class="kpi"><b>${fresh}/5</b><span class="small muted">Personal best</span></div><div class="kpi"><b>+${xpGain}</b><span class="small muted">New XP earned</span></div></div><div class="card" style="text-align:left;margin-top:18px"><h3>Review these topics</h3>${state.attempt.filter(a=>!a.solved).length?'<p class="muted">'+state.attempt.filter(a=>!a.solved).map(a=>escapeHTML(a.question.concept)).join(' · ')+'</p>':'<p class="muted">All five solved! Excellent work.</p>'}</div><div class="btn-row">${button('📖 Review all 5 cards','review:'+state.difficulty)}${button('Try again','start:'+state.difficulty)}${button('Choose another level','levels','primary')}${button('My progress','progress')}</div></div>`;
}
function progressView(){
 const completed=weeks.filter(w=>coreDiffs.every(d=>best(w.week,d)>=3));
 return `${header()}<div class="eyebrow">Your journey</div><h1>My Progress 🏅</h1><div class="kpi-row"><div class="kpi"><b>${totalXP(progress.best)}</b><span class="small muted">XP / 1400</span></div><div class="kpi"><b>${Object.values(progress.best).filter(v=>v>=3).length}/16</b><span class="small muted">Quests passed</span></div><div class="kpi"><b>${completed.length}/4</b><span class="small muted">Topic badges</span></div></div><h2 class="section-title">Badges</h2><div class="cards">${weeks.map(w=>`<article class="card"><div class="big-emoji">${completed.some(x=>x.week===w.week)?'🏅':'🔒'}</div><h3>${w.title}</h3><p class="muted small">${completed.some(x=>x.week===w.week)?'Unlocked!':'Pass Easy, Medium and Hard to unlock. Extra Rock is optional.'}</p></article>`).join('')}</div>${Object.keys(progress.archivedHardBest||{}).length?`<div class="card" style="margin-top:15px"><h3>Earlier Hard scores (archive)</h3><p class="muted small">Hard questions were redesigned to match the class curriculum. Your earlier scores are preserved here but are not counted toward the new challenges.</p><p class="muted small">${Object.entries(progress.archivedHardBest).map(([k,v])=>`${escapeHTML(k)}: ${v}/5`).join(' · ')}</p></div>`:''}<h2 class="section-title">Best scores</h2><div class="card">${weeks.map(w=>`<div style="padding:10px 0;border-bottom:1px solid #eef1f6"><strong>Week ${w.week} · ${w.title}</strong><p class="muted small" style="margin:6px 0 0">${diffs.map(d=>`${labels[d]}: ${best(w.week,d)}/5`).join(' · ')}</p><div class="btn-row" style="margin-top:9px">${diffs.filter(d=>getQuest(username,w.week,d).completed).map(d=>`<button class="btn" data-action="review-from:${w.week}:${d}">📖 Review ${labels[d]}</button>`).join('')}</div></div>`).join('')}</div><div class="btn-row">${button('Choose a level','levels','primary')}</div>`;
}
function navigate(view){resetTrace();state.view=view;render();window.scrollTo({top:0,behavior:'instant'});}
function start(d){
 state.difficulty=d;
 if(getQuest(username,state.week,d).active){navigate('resume');return;}
 startFresh(d);
}
function startFresh(d){
 const qs=allQuestions.filter(q=>q.week===state.week&&q.difficulty===d);
 if(qs.length!==5){app.innerHTML='<div class="card empty">This quest is missing questions. Please report this to your teacher.</div>';return;}
 state={...state,view:'quiz',difficulty:d,index:0,attempt:qs.map(question=>({question,solved:false,submitted:false,revealed:false,lastAnswer:'',lastWasCorrect:false,hintUsed:false})),draft:'',checked:false,feedback:null,hint:false,oldBest:best(state.week,d)};
 render();saveActive();window.scrollTo(0,0);
}
function check(){
 if(state.checked||!state.draft.trim())return;
 const item=currentQuestion(); const q=item.question;
 const correct=normalize(state.draft)===normalize(q.answer);
 if(correct && !item.revealed)item.solved=true;
 item.submitted=true;item.lastAnswer=state.draft;item.lastWasCorrect=correct;
 state.checked=true;state.feedback={correct,revealed:false};render();saveActive();
}
function next(){
 if(state.index===4){finishQuest();return;}
 state.index++;resetTrace();state.draft='';state.checked=false;state.feedback=null;state.hint=false;render();saveActive();
}
document.getElementById('player-switch').addEventListener('click',()=>{state.loginDraft='';navigate('welcome');});
app.addEventListener('click',event=>{
 const choice=event.target.closest('[data-choice]');
 if(choice&&!state.checked){state.draft=currentQuestion().question.options[Number(choice.dataset.choice)];render();saveActive();return;}
 const reviewChoice=event.target.closest('[data-review-choice]');if(reviewChoice&&state.view==='review'){const snapshot=getQuest(username,state.week,state.difficulty).completed;const item=snapshot.attempt[state.index];const question=allQuestions.find(x=>x.id===item.id);state.reviewDraft=question.options[Number(reviewChoice.dataset.reviewChoice)];state.reviewFeedback=null;render();return;}
 const btn=event.target.closest('[data-action]');if(!btn)return;
 const action=btn.dataset.action;
 if(action==='trace-open'){state.traceOpen=true;state.traceIndex=0;render();return;}
 if(action==='trace-close'){resetTrace();render();return;}
 if(action==='trace-next'){const q=state.view==='quiz'?currentQuestion()?.question:allQuestions.find(q=>q.id===getQuest(username,state.week,state.difficulty).completed?.attempt?.[state.index]?.id);const steps=allTraces[q?.id]?.steps;if(steps){state.traceIndex=Math.min(steps.length-1,state.traceIndex+1);render();}return;}
 if(action==='trace-prev'){state.traceIndex=Math.max(0,state.traceIndex-1);render();return;}
 if(action==='trace-restart'){state.traceIndex=0;render();return;}
 if(action==='switch'){state.loginDraft='';navigate('welcome');return;}
 if(action==='back'){navigate(['quiz','resume','review','results'].includes(state.view)?'difficulty':state.view==='difficulty'?'levels':'home');return;}
 if(action==='continue'){const q=recommendedQuest(progress.best);state.week=q.week;state.difficulty=q.difficulty;start(q.difficulty);return;}
 if(action.startsWith('open-saved:')){const [,w,d]=action.match(/^open-saved:W([1-4])-(easy|medium|hard|extra)$/)||[];if(w&&d){state.week=Number(w);state.difficulty=d;start(d);}return;}
 if(action==='resume'){const saved=getQuest(username,state.week,state.difficulty).active;if(saved&&hydrateRun(saved))navigate('quiz');else startFresh(state.difficulty);return;}
 if(action==='fresh'){writeQuest(username,state.week,state.difficulty,{active:null});startFresh(state.difficulty);return;}
 if(action.startsWith('review-from:')){const parts=action.split(':');state.week=Number(parts[1]);state.difficulty=parts[2];state.index=0;state.reviewPractice=false;state.reviewDraft='';state.reviewFeedback=null;navigate('review');return;}
 if(action.startsWith('review:')){state.difficulty=action.split(':')[1];state.index=0;state.reviewPractice=false;state.reviewDraft='';state.reviewFeedback=null;navigate('review');return;}
 if(action==='review-next'||action==='review-prev'){resetTrace();state.index=Math.max(0,Math.min(4,state.index+(action==='review-next'?1:-1)));state.reviewPractice=false;state.reviewDraft='';state.reviewFeedback=null;render();return;}
 if(action==='review-retry'){state.reviewPractice=true;state.reviewDraft='';state.reviewFeedback=null;render();return;}
 if(action==='review-cancel'){state.reviewPractice=false;state.reviewDraft='';state.reviewFeedback=null;render();return;}
 if(action==='review-check'){const q=getQuest(username,state.week,state.difficulty).completed?.attempt?.[state.index];const actual=allQuestions.find(x=>x.id===q?.id);if(!actual||!state.reviewDraft.trim())return;state.reviewFeedback={correct:normalize(state.reviewDraft)===normalize(actual.answer)};render();return;}
 if(action==='review-exit'){navigate('difficulty');return;}
 if(action==='levels'){navigate('levels');return;}
 if(action==='progress'){navigate('progress');return;}
 if(action.startsWith('week:')){state.week=Number(action.split(':')[1]);navigate('difficulty');return;}
 if(action.startsWith('start:')){start(action.split(':')[1]);return;}
 if(action==='hint'){state.hint=true;if(state.view==='quiz')currentQuestion().hintUsed=true;render();saveActive();return;}
 if(action==='retry'){state.checked=false;state.draft='';state.feedback=null;render();saveActive();return;}
 if(action==='reveal'){const item=currentQuestion();item.revealed=true;item.lastAnswer=state.draft;state.checked=true;state.feedback={correct:false,revealed:true};render();saveActive();return;}
 if(action==='check'){check();return;}
 if(action==='next'){next();return;}
});
app.addEventListener('input',event=>{if(event.target.id==='answer'){state.draft=event.target.value;saveActive();}if(event.target.id==='review-answer'){state.reviewDraft=event.target.value;state.reviewFeedback=null;}if(event.target.id==='player-name')state.loginDraft=event.target.value;});
app.addEventListener('submit',event=>{if(event.target.id!=='player-form')return;event.preventDefault();username=selectUsername(state.loginDraft);progress=loadProgress(username);state.loginDraft='';navigate('home');});
async function init(){
 try{
 const resp=await fetch('./data/questions.json',{cache:'no-cache'});
 if(!resp.ok)throw new Error('Question data returned '+resp.status);
 const payload=await resp.json();allQuestions=payload.questions;
 for(const week of [1,2,3,4]){
  try{
   const traceResp=await fetch('./data/traces-week'+week+'.json',{cache:'no-cache'});
   if(traceResp.ok){const traceData=await traceResp.json();Object.assign(allTraces,traceData.traces||{});}
  }catch(error){console.warn('Week '+week+' trace examples unavailable',error);}
 }
 if(!Array.isArray(allQuestions)||allQuestions.length!==80)throw new Error('Expected 80 questions');
 render();
 }catch(err){app.innerHTML=`<div class="card empty"><h2>Could not load the questions</h2><p class="muted">${escapeHTML(err.message)}</p><p>Please serve the project through a web server, not by double-clicking index.html.</p></div>`;}
}
init();

export const POINTS = {easy:10,medium:15,hard:20,extra:25};
const LEGACY_KEY='python-quest-v1-progress';
const PLAYERS_KEY='python-quest-v2-players';
const ACTIVE_KEY='python-quest-v2-active';
const QUEST_KEY='python-quest-v3-quests';
export function normalizeUsername(name){return String(name||'').trim().toLowerCase()||'username';}
export function displayUsername(name){return String(name||'').trim()||'username';}
export function awardedStars(n){return n>=5?3:n===4?2:n===3?1:0;}
export function countCorrect(attempt){return attempt.filter(a=>a.solved && !a.revealed).length;}
export function levelXP(n,d){return (POINTS[d]||0)*n;}
export function totalXP(best){return Object.entries(best).reduce((sum,[key,n])=>sum+levelXP(n,key.split('-')[1]),0);}
export function updateBest(progress,week,difficulty,score){const key='W'+week+'-'+difficulty;return {...progress,best:{...progress.best,[key]:Math.max(progress.best[key]||0,score)}};}
export function recommendedQuest(best){for(const week of [1,2,3,4,6,7,8,9])for(const difficulty of ['easy','medium','hard'])if((best['W'+week+'-'+difficulty]||0)<3)return {week,difficulty};for(const week of [1,2,3,4,6,7,8,9])if((best['W'+week+'-extra']||0)<3)return {week,difficulty:'extra'};return {week:1,difficulty:'easy'};}
function readPlayers(){
 try{const p=JSON.parse(localStorage.getItem(PLAYERS_KEY));if(p&&typeof p==='object'&&!Array.isArray(p))return p;}catch{}
 return {};
}
export function activeUsername(){try{return sessionStorage.getItem(ACTIVE_KEY)||'';}catch{return '';}}
export function selectUsername(name){
 const key=normalizeUsername(name);
 try{sessionStorage.setItem(ACTIVE_KEY,key);}catch{}
 const players=readPlayers();
 if(!players[key]){
  let legacy={};
  if(key==='username'){
   try{const old=JSON.parse(localStorage.getItem(LEGACY_KEY));if(old?.best&&typeof old.best==='object')legacy=old.best;}catch{}
  }
  players[key]={name:displayUsername(name),best:legacy};
  try{localStorage.setItem(PLAYERS_KEY,JSON.stringify(players));}catch{}
 }
 return key;
}
export function loadProgress(username){
 const players=readPlayers();const key=normalizeUsername(username);let p=players[key];
 if(!p||!p.best||typeof p.best!=='object')return {best:{},archivedHardBest:{}};
 // Hard content was replaced in curriculum-v2. Archive the original scores;
 // otherwise old XP would appear as achievements on unseen new questions.
 if(p.curriculumRevision!=='curriculum-v2'){
  p.archivedHardBest={...(p.archivedHardBest||{})};
  for(const week of [1,2,3,4]){
   const k='W'+week+'-hard';
   if(Object.hasOwn(p.best,k)){p.archivedHardBest[k]=p.best[k];delete p.best[k];}
  }
  p.curriculumRevision='curriculum-v2';
  players[key]=p;
  try{localStorage.setItem(PLAYERS_KEY,JSON.stringify(players));}catch{}
 }
 return {best:{...p.best},archivedHardBest:{...p.archivedHardBest}};
}
export function saveProgress(progress,username){
 const key=normalizeUsername(username);const players=readPlayers();
 const existing=players[key];
 players[key]={...existing,name:existing?.name||displayUsername(username),best:{...progress.best},archivedHardBest:{...(progress.archivedHardBest||existing?.archivedHardBest||{})},curriculumRevision:'curriculum-v2'};
 try{localStorage.setItem(PLAYERS_KEY,JSON.stringify(players));return true;}catch{return false;}
}
export function playerDisplayName(username){const p=readPlayers()[normalizeUsername(username)];return p?.name||displayUsername(username);}

function readQuestStore(){
 try{const value=JSON.parse(localStorage.getItem(QUEST_KEY));if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}
 return {};
}
function questKey(week,difficulty){return 'W'+week+'-'+difficulty;}
export function readQuest(username,week,difficulty){
 const user=readQuestStore()[normalizeUsername(username)];
 const q=user?.[questKey(week,difficulty)];
 return q&&typeof q==='object'?JSON.parse(JSON.stringify(q)):{active:null,completed:null};
}
export function writeQuest(username,week,difficulty,change){
 const store=readQuestStore();const userKey=normalizeUsername(username);
 const user=store[userKey]||{};const key=questKey(week,difficulty);
 user[key]={...(user[key]||{}),...change};store[userKey]=user;
 try{localStorage.setItem(QUEST_KEY,JSON.stringify(store));return true;}catch{return false;}
}
export function listQuestStates(username){
 return readQuestStore()[normalizeUsername(username)]||{};
}

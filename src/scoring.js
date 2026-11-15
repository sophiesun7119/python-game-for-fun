export const POINTS = {easy:10,medium:15,hard:20};
const LEGACY_KEY='python-quest-v1-progress';
const PLAYERS_KEY='python-quest-v2-players';
const ACTIVE_KEY='python-quest-v2-active';
export function normalizeUsername(name){return String(name||'').trim().toLowerCase()||'username';}
export function displayUsername(name){return String(name||'').trim()||'username';}
export function awardedStars(n){return n>=5?3:n===4?2:n===3?1:0;}
export function countFirstTry(attempt){return attempt.filter(a=>a.firstCorrect).length;}
export function levelXP(n,d){return (POINTS[d]||0)*n;}
export function totalXP(best){return Object.entries(best).reduce((sum,[key,n])=>sum+levelXP(n,key.split('-')[1]),0);}
export function updateBest(progress,week,difficulty,score){const key='W'+week+'-'+difficulty;return {...progress,best:{...progress.best,[key]:Math.max(progress.best[key]||0,score)}};}
export function recommendedQuest(best){for(const week of [1,2,3,4])for(const difficulty of ['easy','medium','hard'])if((best['W'+week+'-'+difficulty]||0)<3)return {week,difficulty};return {week:1,difficulty:'easy'};}
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
 const players=readPlayers();const key=normalizeUsername(username);const p=players[key];
 return p&&p.best&&typeof p.best==='object'?{best:{...p.best}}:{best:{}};
}
export function saveProgress(progress,username){
 const key=normalizeUsername(username);const players=readPlayers();
 const existing=players[key];
 players[key]={name:existing?.name||displayUsername(username),best:{...progress.best}};
 try{localStorage.setItem(PLAYERS_KEY,JSON.stringify(players));return true;}catch{return false;}
}
export function playerDisplayName(username){const p=readPlayers()[normalizeUsername(username)];return p?.name||displayUsername(username);}

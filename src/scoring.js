export const POINTS = {easy:10,medium:15,hard:20};
const KEY='python-quest-v1-progress';
export function awardedStars(n){return n>=5?3:n===4?2:n===3?1:0;}
export function countFirstTry(attempt){return attempt.filter(a=>a.firstCorrect).length;}
export function levelXP(n,d){return (POINTS[d]||0)*n;}
export function totalXP(best){return Object.entries(best).reduce((sum,[key,n])=>sum+levelXP(n,key.split('-')[1]),0);}
export function updateBest(progress,week,difficulty,score){const key='W'+week+'-'+difficulty;return {...progress,best:{...progress.best,[key]:Math.max(progress.best[key]||0,score)}};}
export function loadProgress(){try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&typeof p.best==='object'&&!Array.isArray(p.best))return p;}catch{}return {best:{}};}
export function saveProgress(p){try{localStorage.setItem(KEY,JSON.stringify(p));}catch{ /* private browsing or storage denied */ }}
export function recommendedQuest(best){for(const week of [1,2,3,4])for(const difficulty of ['easy','medium','hard'])if((best['W'+week+'-'+difficulty]||0)<3)return {week,difficulty};return {week:1,difficulty:'easy'};}

// Enrich fixed, trusted, teacher-authored trace JSON with explicit arithmetic
// evaluation steps. This is an offline transformation, NOT a Python executor.
// Idempotent: a second pass does not add duplicate calculations.
function enrichTrace(question, trace) {
 const lines=question.code.split('\n');
 const result=[],returnValues=new Map();
 const repr=v=>typeof v==='string'?JSON.stringify(v):String(v);
 const safeMath=expr=>/^[\d+\-*/%. ()]+$/.test(expr)&&!/[a-zA-Z]/.test(expr);
 const calculate=expr=>{
  if(!safeMath(expr))return null;
  try {
   const fn=new Function('"use strict";return ('+expr+');');
   const value=fn();
   return typeof value==='number'&&Number.isFinite(value)?value:null;
  } catch{return null;}
 };
 function replaceVariables(expr,vars) {
  return expr.replace(/\b[A-Za-z_]\w*\b/g,(word,i,all)=>{
   if (i>0&&/[a-zA-Z_.]/.test(all[i-1]))return word;
   const v=vars[word];
   return typeof v==='number'?String(v):word;
  });
 }
 function embeddedReturn(line,expr,at){
  const history=returnValues.get(line)||[];
  let substitution=expr;
  const uses=[];
  for(const {fn,value} of history){
    const pattern=new RegExp('\\b'+fn+'\\s*\\([^()]*\\)');
    if(pattern.test(substitution)){
      substitution=substitution.replace(pattern,typeof value==='number'?String(value):repr(value));
      uses.push(fn+'() → '+repr(value));
    }
  }
  return{expr:substitution,uses};
 }
 function calcFor(expr,step,line,resultValue){
  const {expr:substituted,uses}=embeddedReturn(line,expr);
  const expanded=replaceVariables(substituted,step.variables||{});
  // Arithmetic content (or an f-string with a computed expression) deserves
  // its own step; a direct literal or variable print does not.
  const arithmetic=/[+*/%]|(?:\b\w+\s+-\s+\w+)|(?:\d\s+-\s+\d)/.test(expr);
  if(!arithmetic)return null;
  let explanation;
  const direct=calculate(expanded);
  if(direct!==null && !String(expr).includes('//')){
    explanation='Calculate '+expanded.trim()+' = '+repr(direct)+'.';
  }else if(uses.length){
    explanation='Use '+uses.join(', ')+'. Then evaluate '+expanded.trim()+' to get '+repr(resultValue)+'.';
  }else if(/^f['"]/.test(expr)){
    const names=Object.keys(step.variables||{}).filter(name=>new RegExp('\\b'+name+'\\b').test(expr));
    const values=names.map(name=>name+' = '+repr(step.variables[name]));
    explanation='Evaluate the f-string'+(values.length?' with '+values.join(', '):'')+'; the formatted result is '+repr(resultValue)+'.';
  }else{
    const names=Object.keys(step.variables||{}).filter(name=>new RegExp('\\b'+name+'\\b').test(expr));
    const values=names.map(name=>name+' = '+repr(step.variables[name]));
    explanation='Evaluate '+expr.trim()+(values.length?' using '+values.join(', '):'')+'; the result is '+repr(resultValue)+'.';
  }
  return {...step,output:[...step.output],variables:{...step.variables},phase:'calculate',explanation};
 }
 function parseReturned(note){
  const m=note.match(/^Return from (\w+)\(\).*?with value (.+?)\. Continue/);
  if(!m)return null;
  const raw=m[2];
  let value;
  if(raw==='None')value=null;
  else if(raw==='True')value=true;
  else if(raw==='False')value=false;
  else if(/^['"]/.test(raw))value=raw.slice(1,-1);
  else if(!Number.isNaN(Number(raw)))value=Number(raw);
  else value=raw;
  return{fn:m[1],value};
 }
 for(let i=0;i<trace.steps.length;i++){
  const step=trace.steps[i];
  if(step.phase==='calculate'){result.push(step);continue;}
  const src=(lines[step.line]||'').trim();
  if(i===0){result.push(step);continue;}
  const previous=trace.steps[i-1];
  const ret=parseReturned(step.explanation||'');
  if(ret) {
   const list=returnValues.get(step.line)||[];
   list.push(ret);returnValues.set(step.line,list);
  }
  // Avoid speculation: report explicit intermediate expressions only where
  // final numeric result is grounded in a return / assignment / print step.
  let expr=null,value=null,kind=null;
  const print=src.match(/^print\((.*)\)$/);
  const returnStmt=src.match(/^return\s+(.+)$/);
  const assign=src.match(/^([A-Za-z_]\w*)\s*(\+=|-=|\*=|=)\s*(.+)$/);
  const outputChanged=(step.output||[]).length>(previous.output||[]).length;
  if(print&&outputChanged){expr=print[1];value=step.output.slice(previous.output.length).join('\n');kind='print';}
  else if(returnStmt&&/^Return (?!from )/.test(step.explanation||'')){expr=returnStmt[1];value=(step.explanation.match(/^Return (.+?) to the calling line/)||[])[1];kind='return';}
  else if(assign&&/^Evaluate /.test(step.explanation||'')&&!/^\s*(?:input|int\(input)\(/.test(assign[3])){
   expr=assign[3];value=step.variables?.[assign[1]];kind='assignment';
  }
  if(expr){
   const evaluated=calcFor(expr,step,step.line,value);
   if(evaluated){
    // Before evaluating, preserve the prior variable/output state. For a
    // calculation step do not yet apply this line's new assignment or print.
    evaluated.variables={...previous.variables};
    evaluated.output=[...previous.output];
    result.push(evaluated);
   }
  }
  if(print&&outputChanged){
   const printed=step.output.slice(previous.output.length);
   result.push({...step,explanation:'Call print() to display '+printed.map(x=>repr(x)).join(', ')+'.',event:'print'});
  }else result.push(step);
  // The current line is fully evaluated after this statement; avoid reusing
  // stale return values from a prior iteration of the same source line.
  if(kind==='print'||kind==='return'||kind==='assignment')returnValues.delete(step.line);
 }
 return {...trace,steps:result};
}

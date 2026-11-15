// Enrich fixed, trusted, teacher-authored trace JSON with explicit arithmetic
// evaluation steps. This is an offline transformation, NOT a Python executor.
// Idempotent: a second pass does not add duplicate calculations.
function enrichTrace(question, trace) {
 const lines=question.code.split('\n');
 const result=[],returnValues=new Map();
 // Strip any earlier injected calculation steps before rebuilding. This makes
 // the transform safe to rerun after correcting its pedagogical rules.
 const baseSteps=trace.steps.filter(step=>step.phase!=='calculate');
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
 // A tiny arithmetic-only expression parser. Every binary operation gets its
 // own teaching step, in Python's precedence order. Unsupported expressions
 // fall back to a factual one-step explanation rather than guessed execution.
 function arithmeticOperations(expr) {
  const plain=expr.replace(/\s+/g,'');
  if(!plain||!/^[\d.()+\-*/%]+$/.test(plain))return [];
  const tokens=plain.match(/\d+(?:\.\d+)?|\/\/|[()+\-*/%]/g)||[];
  if(tokens.join('')!==plain)return [];
  let at=0;const ops=[];
  const pretty=n=>String(Number(Number(n).toPrecision(12)));
  function primary(){
   const token=tokens[at++];
   if(token==='('){const value=additive();if(tokens[at++]!==')')throw Error('Missing )');return value;}
   if(token==='-')return -primary();
   if(token==='+')return primary();
   const n=Number(token);if(!Number.isFinite(n))throw Error('Not numeric');return n;
  }
  function apply(left,op,right){
   let value;
   if(op==='+')value=left+right;
   else if(op==='-')value=left-right;
   else if(op==='*')value=left*right;
   else if(op==='/')value=left/right;
   else if(op==='//')value=Math.floor(left/right);
   else if(op==='%')value=left-Math.floor(left/right)*right;
   if(!Number.isFinite(value))throw Error('Nonfinite');
   const displayed=pretty(value);
   ops.push('Calculate '+pretty(left)+' '+op+' '+pretty(right)+' = '+displayed+'.');
   return value;
  }
  function multiplicative(){
   let left=primary();
   while(['*','/','//','%'].includes(tokens[at])){const op=tokens[at++],right=primary();left=apply(left,op,right);}
   return left;
  }
  function additive(){
   let left=multiplicative();
   while(['+','-'].includes(tokens[at])){const op=tokens[at++],right=multiplicative();left=apply(left,op,right);}
   return left;
  }
  try{additive();if(at!==tokens.length)return [];return ops;}catch{return [];}
 }

 function calcFor(expr,step,line,resultValue){
  const {expr:substituted,uses}=embeddedReturn(line,expr);
  const vars=step.variables||{};
  const expanded=replaceVariables(substituted,vars);
  const arithmetic=/[+*/%]|(?:\b\w+\s+-\s+\w+)|(?:\d\s+-\s+\d)/.test(expr);
  if(!arithmetic)return [];
  const {event:discardEvent,...base}=step;
  const make=explanation=>({...base,output:[...step.output],variables:{...vars},
   phase:'calculate',explanation});
  const steps=[];
  // For a numeric expression, show each operation (e.g. 19 // 4,
  // 19 % 4, then 4 + 3), not one unexplained leap to the result.
  if(/^f['"]/.test(expr)){
   const expressions=[...expr.matchAll(/\{([^{}]+)\}/g)].map(x=>x[1].split(':')[0]);
   for(const piece of expressions){
    const substitutedPiece=replaceVariables(piece,vars);
    for(const operation of arithmeticOperations(substitutedPiece))steps.push(make(operation));
   }
  }else{
   for(const operation of arithmeticOperations(expanded))steps.push(make(operation));
  }
  if(/^f['"]/.test(expr)){
   const names=Object.keys(vars).filter(name=>new RegExp('\\b'+name+'\\b').test(expr));
   const values=names.map(name=>name+' = '+repr(vars[name]));
   const formatted=typeof resultValue==='string'&&/^['"].*['"]$/.test(resultValue)
    ?resultValue.slice(1,-1):resultValue;
   steps.push(make('Format the f-string'+(values.length?' with '+values.join(', '):'')+
    '; the printed/returned text is '+repr(formatted)+'.'));
  }else if(steps.length===0){
   let explanation;
   const direct=calculate(expanded);
   if(direct!==null&&!String(expr).includes('//')){
    explanation='Calculate '+expanded.trim()+' = '+repr(direct)+'.';
   }else if(uses.length){
    explanation='Use '+uses.join(', ')+'. Then evaluate '+expanded.trim()+
     ' to get '+repr(resultValue)+'.';
   }else{
    const names=Object.keys(vars).filter(name=>new RegExp('\\b'+name+'\\b').test(expr));
    const values=names.map(name=>name+' = '+repr(vars[name]));
    explanation='Evaluate '+expr.trim()+(values.length?' using '+values.join(', '):'')+
     '; the result is '+repr(resultValue)+'.';
   }
   steps.push(make(explanation));
  }
  return steps;
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
 for(let i=0;i<baseSteps.length;i++){
  const step=baseSteps[i];
  const src=(lines[step.line]||'').trim();
  if(i===0){result.push(step);continue;}
  const previous=baseSteps[i-1];
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
   // Assignment snapshots contain the NEW value. Expressions on the right
   // side must use the OLD variable values, prior to the assignment.
   const context=kind==='assignment'?{...step,variables:previous.variables}:step;
   for(const evaluated of calcFor(expr,context,step.line,value)){
    // Calculation has not updated the assigned variable or printed anything yet.
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

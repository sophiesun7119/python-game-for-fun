// Restricted offline trace generator for trusted, fixed, teacher-authored Python examples.
// This is NOT used as an in-browser Python executor. It generates static snapshots.
function buildTrace(question) {
  const sourceLines=question.code.split("\n").map((text,line)=>({line,text:text.trim(),indent:(text.match(/^ */)||[""])[0].length})).filter(x=>x.text);
  const output=[];
  const steps=[{line:-1,variables:{},output:[],explanation:"Ready! Press Next Step to run the example. No variables exist yet."}];
  let ticks=0;
  let globals={};
  let active=globals;
  let currentLine=-1; // The real caller's source line, not a function definition line.
  const display=x=> x===null?"None":x===true?"True":x===false?"False":typeof x==="string"?x:String(x);
  const repr=x=>typeof x==="string"?"'"+x+"'":display(x);
  function snapshot(){
    const result={};let p=active;
    while(p&&p!==Object.prototype){for(const k of Object.keys(p))if(!Object.prototype.hasOwnProperty.call(result,k)&&typeof p[k]!=="function")result[k]=p[k];p=Object.getPrototypeOf(p);}
    return result;
  }
  function record(line,explanation){
    ticks++;if(ticks>1500)throw Error("Too many trace steps: "+question.id);
    steps.push({line,variables:snapshot(),output:[...output],explanation});
  }
  function splitArguments(source){
    const parts=[];let part="",quote=null,depth=0,escaped=false;
    for(const ch of source){
      if(escaped){part+=ch;escaped=false;continue;}
      if(ch==="\\"){part+=ch;escaped=true;continue;}
      if(quote){part+=ch;if(ch===quote)quote=null;continue;}
      if(ch==="'"||ch==='"'){quote=ch;part+=ch;continue;}
      if(ch==="("||ch==="["){depth++;part+=ch;continue;}
      if(ch===")"||ch==="]"){depth--;part+=ch;continue;}
      if(ch===","&&depth===0){parts.push(part.trim());part="";continue;}
      part+=ch;
    }
    if(part.trim())parts.push(part.trim());
    return parts;
  }
  function evalExpr(raw,env){
    let expr=raw.trim();
    expr=expr.replace(/f'([^']*)'/g,(_,body)=>"__f("+JSON.stringify(body)+")");
    expr=expr.replace(/\bTrue\b/g,"true").replace(/\bFalse\b/g,"false").replace(/\bNone\b/g,"null");
    expr=expr.replace(/\bnot\s+([A-Za-z_]\w*\s*(?:<|>|<=|>=|==|!=)\s*[A-Za-z_]\w*)/g,"!($1)");
    expr=expr.replace(/\band\b/g,"&&").replace(/\bor\b/g,"||").replace(/\bnot\b/g,"!");
    expr=expr.replace(/\b(int|str|len|range)\s*\(/g,(_,fn)=>"__"+fn+"(");
    expr=expr.replace(/([A-Za-z_]\w*|\d+)\s*\/\/\s*(\([^)]*\)|[A-Za-z_]\w*|\d+)/g,"Math.floor($1 / $2)");
    expr=expr.replace(/('[^']*'|"[^"]*")\s*\*\s*([A-Za-z_]\w*|\d+)/g,"__mul($1,$2)");
    expr=expr.replace(/([A-Za-z_]\w*)\s*\*\s*([A-Za-z_]\w*|\d+)/g,(match,left,right)=>typeof env[left]==="string"?"__mul("+left+","+right+")":match);
    const fmt=body=>body.replace(/\{([^{}]+)\}/g,(_,inner)=>{
      const p=inner.split(/:(.+)/);const v=evalExpr(p[0],env);const spec=p[1]||"";
      if(!spec)return display(v);
      let text=display(v);
      const fixed=spec.match(/^(0?)(\d+)?\.(\d+)f$/);
      if(fixed){text=Number(v).toFixed(Number(fixed[3]));if(fixed[2])text=fixed[1]?text.padStart(Number(fixed[2]),"0"):text.padStart(Number(fixed[2])," ");return text;}
      const dec=spec.match(/^0(\d+)d$/);if(dec)return text.padStart(Number(dec[1]),"0");
      const left=spec.match(/^<(\d+)$/);if(left)return text.padEnd(Number(left[1])," ");
      return text;
    });
    const pythonRange=(...args)=>{
      const [start,stop,step]=args.length===1?[0,args[0],1]:args.length===2?[args[0],args[1],1]:args;
      if(step===0)throw Error("range() step cannot be zero");
      const vals=[];for(let i=start;step>0?i<stop:i>stop;i+=step){if(vals.length>500)throw Error("Range too long");vals.push(i);}return vals;
    };
    let run;try{run=new Function("env","__f","__int","__str","__len","__range","__mul","with(env){return ("+expr+");}");}catch(e){throw Error("Cannot parse "+raw+" => "+expr+" :: "+e.message);}
    return run(env,fmt,x=>Number.parseInt(x,10),display,x=>x.length,pythonRange,(a,b)=>typeof a==="string"&&Number.isInteger(b)?a.repeat(b):typeof b==="string"&&Number.isInteger(a)?b.repeat(a):a*b);
  }
  function findBlock(i,parentIndent){
    let at=i+1;while(at<sourceLines.length&&sourceLines[at].indent>parentIndent)at++;
    const childIndent=i+1<sourceLines.length?sourceLines[i+1].indent:parentIndent;
    if(childIndent<=parentIndent)throw Error("Expected indented body near "+sourceLines[i].line);
    return {children:parse(i+1,at,childIndent),end:at};
  }
  function parse(from,to,indent){
    const nodes=[];let i=from;
    while(i<to){
      const p=sourceLines[i];if(p.indent<indent)break;
      if(p.indent!==indent)throw Error("Unexpected indent at "+p.line);
      const text=p.text;
      const def=text.match(/^def\s+(\w+)\(([^)]*)\):$/);
      const forMatch=text.match(/^for\s+(\w+)\s+in\s+(.+):$/);
      const whileMatch=text.match(/^while\s+(.+):$/);
      const ifMatch=text.match(/^if\s+(.+):$/);
      if(def||forMatch||whileMatch||ifMatch){
        const blk=findBlock(i,indent);
        if(def){nodes.push({kind:"def",line:p.line,name:def[1],params:def[2].split(",").map(s=>s.trim()).filter(Boolean),body:blk.children});i=blk.end;continue;}
        if(forMatch){nodes.push({kind:"for",line:p.line,name:forMatch[1],expr:forMatch[2],body:blk.children});i=blk.end;continue;}
        if(whileMatch){nodes.push({kind:"while",line:p.line,expr:whileMatch[1],body:blk.children});i=blk.end;continue;}
        if(ifMatch){
          const branches=[{line:p.line,cond:ifMatch[1],body:blk.children}];i=blk.end;
          while(i<to&&sourceLines[i].indent===indent&&/^(elif |else:)/.test(sourceLines[i].text)){
            const br=sourceLines[i];const eb=findBlock(i,indent);
            const condition=br.text.startsWith("else:")?null:br.text.match(/^elif\s+(.+):$/)[1];
            branches.push({line:br.line,cond:condition,body:eb.children});i=eb.end;
          }
          nodes.push({kind:"if",branches});continue;
        }
      }
      if(text.startsWith("elif ")||text==="else:")throw Error("Orphan branch "+p.line);
      nodes.push({kind:"stmt",line:p.line,text});i++;
    }
    return nodes;
  }
  const program=parse(0,sourceLines.length,sourceLines[0].indent);
  function execute(nodes,env){
    const prev=active;active=env;
    try{
      for(const node of nodes){
        if(node.kind==="def"){
          env[node.name]=(...args)=>{
            const callerLine=currentLine;
            const callerFrame=active;
            // Function invocation happens AT THE CALL SITE (e.g. print(message(...))),
            // not where the def statement originally executed.
            active=callerFrame;
            record(callerLine,"Call "+node.name+"("+args.map(display).join(", ")+") from this line.");
            const local=Object.create(globals);
            node.params.forEach((param,i)=>local[param]=args[i]);
            active=local;
            // Distinguish declaration, invocation, entry and body execution.
            // On entry, highlight the def line to show parameter bindings.
            // Only the following trace step moves into the first body statement.
            record(node.line,"Enter "+node.name+"(): bind "+(node.params.length?node.params.map(p=>p+" = "+repr(local[p])).join(", "):"no parameters")+". Parameters are ready; the function body runs next.");
            let returned,finished=false;
            try{
              const res=execute(node.body,local);
              returned=res?.type==="return"?res.value:null;
              finished=true;
              return returned;
            }finally{
              active=callerFrame;
              currentLine=callerLine;
              if(finished&&Number.isInteger(callerLine)&&callerLine>=0){
                record(callerLine,"Return from "+node.name+"() to this calling line with value "+repr(returned)+". Continue evaluating this statement.");
              }
            }
          };
          currentLine=node.line;
          active=env;
          record(node.line,"Define "+node.name+"(). Its body does not run until the function is called.");
        }else if(node.kind==="for"){
          currentLine=node.line;active=env;
          const values=evalExpr(node.expr,env);
          for(const value of values){
            currentLine=node.line;active=env;
            env[node.name]=value;
            record(node.line,"for loop: "+node.name+" = "+display(value)+". Enter the loop body.");
            const result=execute(node.body,env);active=env;
            if(result?.type==="return")return result;
            if(result?.type==="break")break;
          }
          currentLine=node.line;active=env;
          record(node.line,"The for loop has finished or exited. Continue after the loop.");
        }else if(node.kind==="while"){
          for(let n=0;n<300;n++){
            currentLine=node.line;active=env;
            const ok=!!evalExpr(node.expr,env);
            record(node.line,"Check while "+node.expr+": "+display(ok)+(ok?". Run the body.":". Exit the loop."));
            if(!ok)break;
            const result=execute(node.body,env);active=env;
            if(result?.type==="return")return result;
            if(result?.type==="break")break;
          }
        }else if(node.kind==="if"){
          for(const br of node.branches){
            currentLine=br.line;active=env;
            const ok=br.cond===null?true:!!evalExpr(br.cond,env);
            record(br.line,br.cond===null?"Take the else branch.":"Check "+br.cond+": "+display(ok)+(ok?". Enter this branch.":". Skip this branch."));
            if(ok){const result=execute(br.body,env);active=env;if(result)return result;break;}
          }
        }else{
          const text=node.text;
          currentLine=node.line;active=env;
          if(text==="break"){record(node.line,"break exits this loop immediately.");return{type:"break"};}
          if(text==="continue"){record(node.line,"continue skips the remaining statements in this round.");return{type:"continue"};}
          if(text.startsWith("return ")){
            const value=evalExpr(text.slice(7),env);active=env;
            record(node.line,"Return "+repr(value)+" to the calling line.");return{type:"return",value};
          }
          const print=text.match(/^print\((.*)\)$/);
          if(print){
            const params=splitArguments(print[1]).map(x=>evalExpr(x,env));
            output.push(params.map(display).join(" "));active=env;
            record(node.line,"Print "+params.map(repr).join(", ")+".");
            continue;
          }
          const assign=text.match(/^([A-Za-z_]\w*)\s*(\+=|-=|\*=|=)\s*(.+)$/);
          if(assign){
            const [,name,op,expr]=assign;
            const value=evalExpr(expr,env);
            env[name]=op==="="?value:op==="+="?env[name]+value:op==="-="?env[name]-value:env[name]*value;
            active=env;
            record(node.line,"Evaluate "+expr+" and "+(op==="="?"set ":"update ")+name+" to "+repr(env[name])+".");continue;
          }
          // Function call as a standalone statement, e.g. greet().
          if(/^[A-Za-z_]\w*\s*\(.*\)$/.test(text)){
            evalExpr(text,env);active=env;currentLine=node.line;
            record(node.line,"Finish this function call and continue.");
            continue;
          }
          throw Error("Unsupported statement: "+text);
        }
      }
    }finally{active=prev;}
    return null;
  }
  execute(program,globals);
  return {steps};
}

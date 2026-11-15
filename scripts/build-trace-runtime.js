// Restricted offline trace generator for trusted, fixed, teacher-authored Python examples.
// This is NOT used as an in-browser Python executor. It generates static snapshots.
function buildTrace(question) {
  const sourceLines=question.code.split("\n").map((text,line)=>({line,text:text.trim(),indent:(text.match(/^ */)||[""])[0].length})).filter(x=>x.text);
  const output=[];
  const steps=[{line:-1,variables:{},output:[],explanation:"Ready! Press Next Step to run the example. No variables exist yet."}];
  let ticks=0;
  let globals={};
  let active=globals;
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
  function evalExpr(raw,env){
    let expr=raw.trim();
    expr=expr.replace(/f'([^']*)'/g,(_,body)=>"__f("+JSON.stringify(body)+")");
    expr=expr.replace(/\bTrue\b/g,"true").replace(/\bFalse\b/g,"false").replace(/\bNone\b/g,"null");
    expr=expr.replace(/\bnot\s+([A-Za-z_]\w*\s*(?:<|>|<=|>=|==|!=)\s*[A-Za-z_]\w*)/g,"!($1)");
    expr=expr.replace(/\band\b/g,"&&").replace(/\bor\b/g,"||").replace(/\bnot\b/g,"!");
    expr=expr.replace(/\b(int|str|len|range)\s*\(/g,(_,fn)=>"__"+fn+"(");
    expr=expr.replace(/([A-Za-z_]\w*|\d+)\s*\/\/\s*(\([^)]*\)|[A-Za-z_]\w*|\d+)/g,"Math.floor($1 / $2)");
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
    const run=new Function("env","__f","__int","__str","__len","__range","with(env){return ("+expr+");}");
    return run(env,fmt,x=>Number.parseInt(x,10),display,x=>x.length,pythonRange);
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
            const local=Object.create(globals);
            node.params.forEach((param,i)=>local[param]=args[i]);
            record(node.line,"Call "+node.name+"("+args.map(display).join(", ")+"). Bind parameters and enter its body.");
            const res=execute(node.body,local);
            active=env;
            return res?.type==="return"?res.value:null;
          };
          record(node.line,"Define "+node.name+"(). Its body does not run until the function is called.");
        }else if(node.kind==="for"){
          const values=evalExpr(node.expr,env);
          for(const value of values){
            env[node.name]=value;
            record(node.line,"for loop: "+node.name+" = "+display(value)+". Enter the loop body.");
            const result=execute(node.body,env);active=env;
            if(result?.type==="return")return result;
            if(result?.type==="break")break;
          }
          record(node.line,"The for loop has finished or exited. Continue after the loop.");
        }else if(node.kind==="while"){
          for(let n=0;n<300;n++){
            const ok=!!evalExpr(node.expr,env);
            record(node.line,"Check while "+node.expr+": "+display(ok)+(ok?". Run the body.":". Exit the loop."));
            if(!ok)break;
            const result=execute(node.body,env);active=env;
            if(result?.type==="return")return result;
            if(result?.type==="break")break;
          }
        }else if(node.kind==="if"){
          for(const br of node.branches){
            const ok=br.cond===null?true:!!evalExpr(br.cond,env);
            record(br.line,br.cond===null?"Take the else branch.":"Check "+br.cond+": "+display(ok)+(ok?". Enter this branch.":". Skip this branch."));
            if(ok){const result=execute(br.body,env);active=env;if(result)return result;break;}
          }
        }else{
          const text=node.text;
          if(text==="break"){record(node.line,"break exits this loop immediately.");return{type:"break"};}
          if(text==="continue"){record(node.line,"continue skips the remaining statements in this round.");return{type:"continue"};}
          if(text.startsWith("return ")){
            const value=evalExpr(text.slice(7),env);active=env;
            record(node.line,"Return "+repr(value)+" to the calling line.");return{type:"return",value};
          }
          const print=text.match(/^print\((.*)\)$/);
          if(print){
            const params=print[1].split(/,\s*(?![^()]*\))/).map(x=>evalExpr(x,env));
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
          throw Error("Unsupported statement: "+text);
        }
      }
    }finally{active=prev;}
    return null;
  }
  execute(program,globals);
  return {steps};
}

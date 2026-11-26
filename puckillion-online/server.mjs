import http from 'node:http';
import {randomBytes,randomInt} from 'node:crypto';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('./index.html',import.meta.url));
const base=process.env.NHL_API_BASE||'https://api.nhle.com/stats/rest/en';
const port=Number(process.env.PORT||3000), rooms=new Map(), cache=new Map();
const now=()=>Date.now(), token=()=>randomBytes(24).toString('hex');
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^a-z0-9]/g,'');
const pick=a=>a[randomInt(a.length)];
const season=y=>`${y}${y+1}`;
const yearLabel=y=>`${y}–${String(y+1).slice(-2)}`;
const lastYear=()=>{const d=new Date();return d.getUTCFullYear()-(d.getUTCMonth()<9?1:0)};
async function stats(kind,y){
 const key=kind+':'+y; if(cache.has(key))return cache.get(key);
 const task=(async()=>{let out=[],start=0; const seen=new Set();
 while(true){const p=new URLSearchParams({isAggregate:'false',isGame:'false',start:String(start),limit:'500',cayenneExp:`seasonId=${season(y)} and gameTypeId=2`,sort:'[{"property":"playerId","direction":"ASC"}]'});
 const res=await fetch(`${base}/${kind}/summary?${p}`,{signal:AbortSignal.timeout(16000),headers:{'Accept':'application/json'}}); if(!res.ok)throw Error('NHL statistics temporarily unavailable ('+res.status+')');
 const j=await res.json(); if(!Array.isArray(j.data))throw Error('Unexpected NHL statistics response');
 for(const r of j.data){const id=String(r.playerId); if(!seen.has(id)){seen.add(id);out.push(r)}}
 start+=j.data.length; if(!j.data.length||start>=Number(j.total??Infinity)||(j.total==null&&j.data.length<500))break; if(start>5000)throw Error('Unexpected NHL data pagination');
 }return out.filter(r=>Number(r.gamesPlayed)>0&&r.playerId&&r[kind==='skater'?'skaterFullName':'goalieFullName']);})();
 cache.set(key,task);task.catch(()=>cache.delete(key));return task;
}
const famous=new Set(['wayne gretzky','mario lemieux','connor mcdavid','sidney crosby','alex ovechkin','alexander ovechkin','bobby orr','gordie howe','jaromir jagr','patrick roy','martin brodeur','dominik hasek','maurice richard','jean beliveau','mark messier','steve yzerman','joe sakic','auston matthews','connor bedard','nathan mackinnon','cale makar','pavel bure','teemu selanne','henrik lundqvist'].map(norm));
function makeQuestion(y,skaters,goalies){
 const label=yearLabel(y);const variants=[];
 function add(text,rows,kind,metric,tag){if(rows.length>=8)variants.push({text,rows,kind,metric,tag});}
 for(const [field,thresholds,word] of [['goals',[5,10,15,20,30,40], 'goals'],['assists',[10,20,30,40,50], 'assists'],['points',[10,20,30,40,50,60,80], 'points']]){
  for(const n of thresholds){const rows=skaters.filter(r=>Number(r[field])>=n);if(rows.length>=8&&rows.length<=180)add(`Name an NHL skater with at least ${n} ${word} in the ${label} regular season.`,rows,'skater',field,'SCORING RECORDS');}
 }
 const teams=[...new Set([...skaters,...goalies].flatMap(r=>String(r.teamAbbrevs||'').split(',').map(t=>t.trim()).filter(t=>/^[A-Z]{2,4}$/.test(t))))];
 for(const team of teams){const includes=r=>String(r.teamAbbrevs||'').split(',').map(t=>t.trim()).includes(team);const rows=[...skaters.filter(includes).map(r=>({...r,_kind:'skater'})),...goalies.filter(includes).map(r=>({...r,_kind:'goalie'}))];add(`Name any player who appeared for ${team} in the ${label} NHL regular season.`,rows,'mixed','gamesPlayed','TEAM HISTORY');}
 for(const n of [1,5,10,20,30]){const rows=goalies.filter(r=>Number(r.wins)>=n);if(rows.length>=8&&rows.length<=100)add(`Name an NHL goalie with at least ${n} wins in the ${label} regular season.`,rows,'goalie','wins','BETWEEN THE PIPES');}
 for(const n of [1,10,25,50]){const rows=skaters.filter(r=>Number(r.gamesPlayed)>=n);if(rows.length>=8)add(`Name a skater who played at least ${n} NHL regular-season games in ${label}.`,rows,'skater','gamesPlayed','THROUGH THE ERAS');}
 if(!variants.length)throw Error('Not enough NHL data for '+label);
 const groups=[...new Set(variants.map(x=>x.tag))];const group=pick(groups);const v=pick(variants.filter(x=>x.tag===group));
 return build(v,y);
}
function build(v,y){const rows=v.rows.map(r=>{const kind=r._kind||v.kind;const name=r[kind==='skater'?'skaterFullName':'goalieFullName'];const prominence=kind==='goalie'?Number(r.wins||0)*2+Number(r.gamesPlayed||0)*0.2:Number(r.points||0)+Number(r.gamesPlayed||0)*0.15;return{id:String(r.playerId),name,value:Number(r[v.metric]||0),prominence:prominence+(famous.has(norm(name))?10000:0)}}).filter(r=>r.name);
 rows.sort((a,b)=>b.prominence-a.prominence||a.name.localeCompare(b.name));
 const pts=[10,30,60,85,100],labels=['Surface','Uncommon','Rare','Deep cut','ONE IN A PUCKILLION'];
 const a=rows.map((r,i)=>{const tier=Math.min(4,Math.floor(i/rows.length*5));return{id:r.id,name:r.name,value:r.value,points:pts[tier],tier:labels[tier]}});
 return{text:v.text,tag:v.tag,year:y,answers:a};}
async function makeGame(r){const end=lastYear(),eras=[[1917,1939],[1940,1966],[1967,1979],[1980,1999],[2000,2014],[2015,end]].map(([a,b])=>[a,Math.min(b,end)]).filter(([a,b])=>a<=b);let years=[];
 const choices=r.era==='modern'?[[2000,end]]:r.era==='classic'?[[1917,1999]]:eras;
 for(let i=0;i<r.count;i++){const [a,b]=choices[i%choices.length];let y;do{y=randomInt(a,b+1)}while(y===2004||years.includes(y));years.push(y)}
 for(let i=years.length-1;i>0;i--){let j=randomInt(i+1);[years[i],years[j]]=[years[j],years[i]]}
 const qs=[]; for(let i=0;i<years.length;i+=3){const batch=await Promise.all(years.slice(i,i+3).map(async y=>{const [s,g]=await Promise.all([stats('skater',y),stats('goalie',y)]);return makeQuestion(y,s,g)}));qs.push(...batch);r.loaded=qs.length;}
 r.questions=qs;r.round=0;r.players.forEach(p=>{p.score=0;p.results=[]});startRound(r);
}
function startRound(r){r.phase='playing';r.deadline=now()+r.seconds*1000;r.players.forEach(p=>{p.lock=null});}
function result(r){if(r.phase!=='playing')return;r.players.forEach(p=>{if(!p.lock)p.lock={input:'',answer:null};p.score+=p.lock.answer?.points||0;p.results.push(p.lock)});r.phase='reveal';r.deadline=0;}
function tick(r){if(r.phase==='playing'&&(now()>=r.deadline||r.players.every(p=>p.lock)))result(r)}
function find(q,input){const key=norm(input);if(!key)return null;const alias={alexovechkin:'alexanderovechkin',alexanderovechkin:'alexovechkin',mauricerichard:'mauricerichard',bobbyorr:'robertorr'};const exact=q.answers.filter(a=>norm(a.name)===key||norm(a.name)===alias[key]);if(exact.length===1)return exact[0];const last=q.answers.filter(a=>norm(a.name.trim().split(/\s+/).at(-1))===key);return last.length===1?last[0]:null;}
function state(r,p){tick(r);const q=r.questions?.[r.round];const reveal=['reveal','finished'].includes(r.phase);return{code:r.code,me:p.id,host:p.id===r.players[0].id,phase:r.phase,round:r.round+1,count:r.count,seconds:r.seconds,era:r.era,loaded:r.loaded||0,error:r.error||'',serverNow:now(),deadline:r.deadline||0,players:r.players.map(x=>({id:x.id,name:x.name,score:x.score,locked:!!x.lock,answer:reveal?x.lock:undefined})),question:q&&['playing','reveal'].includes(r.phase)?{text:q.text,tag:q.tag,year:q.year,answerCount:reveal?q.answers.length:undefined,answers:reveal?q.answers:undefined}:null,history:reveal?r.players.map(x=>({name:x.name,results:x.results})):undefined};}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
async function read(req){let s='';for await(const c of req){s+=c;if(s.length>8192)throw Error('Request too large')}return JSON.parse(s||'{}')}
function player(name){return{id:randomBytes(8).toString('hex'),secret:token(),name:String(name||'Player').trim().slice(0,28)||'Player',score:0,results:[],lock:null}}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(page)}if(u.pathname==='/health'){return send(res,200,{ok:true})}if(!u.pathname.startsWith('/api/'))return send(res,404,{error:'Not found'});
 const action=u.pathname.slice(5),b=req.method==='POST'?await read(req):Object.fromEntries(u.searchParams);let r,p;
 if(action==='create'&&req.method==='POST'){if(rooms.size>=1000)throw Error('Server full');let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase()}while(rooms.has(code));p=player(b.name);r={code,players:[p],phase:'lobby',count:[7,10,15].includes(+b.count)?+b.count:7,seconds:[15,25,40].includes(+b.seconds)?+b.seconds:25,era:['all','modern','classic'].includes(b.era)?b.era:'all',round:0,touched:now()};rooms.set(code,r);return send(res,200,{token:p.secret,state:state(r,p)})}
 r=rooms.get(String(b.code||'').toUpperCase());if(!r)throw Error('Room not found or expired');r.touched=now();
 if(action==='join'&&req.method==='POST'){if(r.phase!=='lobby'||r.players.length!==1)throw Error('Room is full or already started');p=player(b.name);r.players.push(p);return send(res,200,{token:p.secret,state:state(r,p)})}
 p=r.players.find(x=>x.secret===b.token);if(!p)return send(res,403,{error:'Invalid player session'});tick(r);
 if(action==='state')return send(res,200,state(r,p));if(req.method!=='POST')throw Error('POST required');
 if(action==='start'||action==='rematch'){if(p!==r.players[0]||r.players.length!==2||!['lobby','finished'].includes(r.phase))throw Error('Only the host can start with two players');r.phase='loading';r.error='';r.loaded=0;r.questions=null;r.round=0;r.players.forEach(x=>{x.score=0;x.lock=null;x.results=[]});makeGame(r).catch(e=>{r.phase='lobby';r.error='Unable to load complete NHL records. '+e.message+' Try starting again.'});}
 else if(action==='answer'){if(r.phase!=='playing'||p.lock||Number(b.round)!==r.round+1)throw Error('Answer window closed');const input=String(b.answer||'').trim().slice(0,100);p.lock={input,answer:find(r.questions[r.round],input)};tick(r);}
 else if(action==='next'){if(p!==r.players[0]||r.phase!=='reveal')throw Error('Only the host can advance');if(r.round+1>=r.count){r.phase='finished'}else{r.round++;startRound(r)}}else throw Error('Unknown action');return send(res,200,state(r,p));
 }catch(e){return send(res,400,{error:e.message||'Unexpected error'})}});
setInterval(()=>{for(const [k,r] of rooms){tick(r);if(now()-r.touched>3*3600000)rooms.delete(k)}},250).unref();
server.listen(port,'0.0.0.0',()=>console.log('PUCKILLION online on port '+port));

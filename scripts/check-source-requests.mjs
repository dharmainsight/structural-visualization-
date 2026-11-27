// Validate source-request IDs and exact headings against the TOC registry.
import { readFileSync } from "node:fs";
function validate(toc,plan){
  const errors=[], registry=new Map(), seen=new Set();
  for(const line of toc.split(/\r?\n/)){
    const m=line.match(/^\|\s*(T\d{2}(?:\.\d{2}){0,2})\s*\|\s*(-|T\d{2}(?:\.\d{2}){0,2})\s*\|\s*([^|]+?)\s*\|$/);
    if(!m){if(/^\|\s*T\d/.test(line))errors.push("Malformed TOC row: "+line);continue}
    const [,id,parent,title]=m;
    if(registry.has(id))errors.push("Duplicate TOC ID: "+id);
    registry.set(id,{parent,title});
    const expected=id.includes(".")?id.slice(0,id.lastIndexOf(".")):"-";
    if(parent!==expected)errors.push("Incorrect parent: "+id+" -> "+parent);
  }
  if(!registry.size)errors.push("TOC registry is empty");
  for(let i=1;i<=6;i++)if(!registry.has("T0"+i))errors.push("Missing chapter T0"+i);
  for(const [id,row] of registry)if(row.parent!=="-"&&!registry.has(row.parent))errors.push("Missing parent: "+id);
  const start="<!-- SOURCE-REQUESTS:START -->",end="<!-- SOURCE-REQUESTS:END -->";
  if(plan.split(start).length!==2||plan.split(end).length!==2||plan.indexOf(start)>plan.indexOf(end))return [...errors,"Missing, duplicate or reversed source-request markers"];
  const queue=plan.slice(plan.indexOf(start)+start.length,plan.indexOf(end));
  let next=0,later=0;const chapters=new Set();
  for(const line of queue.split(/\r?\n/)){
    if(!line.trim()||/^\|\s*状態\s*\|/.test(line)||/^\|[-|\s]+\|$/.test(line))continue;
    const m=line.match(/^\|\s*(NEXT|LATER|OPTIONAL|DONE)\s*\|\s*(T\d{2}(?:\.\d{2}){0,2})\s*\|\s*([^|]+?)\s*\|$/);
    if(!m){errors.push("Malformed request row: "+line);continue}
    const [,status,id,title]=m;
    if(seen.has(id))errors.push("Duplicate request ID: "+id);
    seen.add(id);
    if(!registry.has(id))errors.push("Unknown TOC ID: "+id);
    else if(registry.get(id).title!==title)errors.push("Title mismatch: "+id+" -> "+title);
    if(status==="NEXT"){next++;chapters.add(id.slice(0,3))}
    if(status==="LATER")later++;
  }
  if(!seen.size)errors.push("Empty source-request queue");
  if(chapters.size>1)errors.push("NEXT spans multiple chapters");
  if(later>0&&next===0)errors.push("LATER exists without NEXT");
  return errors;
}
const toc = readFileSync(new URL("../docs/TOC.md", import.meta.url), "utf8");
const plan = readFileSync(new URL("../docs/PLAN.md", import.meta.url), "utf8");
const errors = validate(toc, plan);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Source request registry and queue: OK");
}

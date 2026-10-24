'use strict';
const STAFF = ['Owner','Developer','HeadAdmin','Admin','HeadModerator','Moderator'];
function isStaff(member,cfg) {
 if (!member) return false;
 return member.id === member.guild?.ownerId || cfg.Owners?.includes(member.id) || cfg.Developers?.includes(member.id) ||
   member.permissions?.has('Administrator') || [...(cfg.StaffRoles||[]),...STAFF.map(k=>cfg.Roles?.[k])]
     .some(id=>id && id!==member.guild?.id && member.roles?.cache?.has(id));
}
// Strict Europe/Amsterdam conversion, including ambiguous/nonexistent DST times.
function parseEnd(value,now=Date.now()) {
 const m=/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/.exec(value.trim());
 if(!m) throw Error('Gebruik DD-MM-JJJJ UU:MM, bijvoorbeeld 24-10-2026 20:00.');
 const [,d,mo,y,h,mi]=m.map(Number);
 const utc=Date.UTC(y,mo-1,d,h,mi);
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const matches=[utc-3600000,utc-7200000].filter(t=>{
   const parts=Object.fromEntries(fmt.formatToParts(t).map(x=>[x.type,x.value]));
   return +parts.year===y && +parts.month===mo && +parts.day===d && +parts.hour===h && +parts.minute===mi;
 });
 if(matches.length!==1) throw Error('Deze Nederlandse datum/tijd bestaat niet of is dubbel door de klokwisseling. Kies een andere tijd.');
 const end=matches[0];
 if(end<=now || end>now+28*86400000) throw Error('Kies een toekomstig tijdstip binnen 28 dagen.');
 return end;
}
function verdict(text) {
 const obj=JSON.parse(text);
 if(!['ok','violation','review'].includes(obj.verdict) || typeof obj.confidence!=='number' || obj.confidence<0 || obj.confidence>1 || typeof obj.reason!=='string') throw Error('Ongeldig moderatieantwoord');
 return {verdict:obj.verdict,confidence:obj.confidence,reason:obj.reason.slice(0,500),category:obj.category==='adult'?'adult':'other'};
}
module.exports={isStaff,parseEnd,verdict};

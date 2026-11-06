const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const docs = require('../services/documentation');
(async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bot-docs-'));
    try {
        await fs.mkdir(path.join(root, 'sub'));
        await fs.writeFile(path.join(root, 'sub/guide.md'), 'Nested guide');
        await fs.writeFile(path.join(root, 'secret.env'), 'hidden');
        await fs.writeFile(path.join(root, '.hidden.md'), 'hidden');
        await fs.symlink(path.join(root, 'secret.env'), path.join(root, 'unsafe.md'));
        for (let i=0;i<30;i++) await fs.writeFile(path.join(root, `guide-${i}.md`), `Guide ${i}`);
        let entries = await docs.catalog(root);
        assert.equal(entries.length,31);
        assert.equal((await docs.readDocument('sub/guide.md',root)).attachment.toString(),'Nested guide');
        for (const value of ['../README.md','secret.env','.hidden.md','unsafe.md','/etc/passwd']) await assert.rejects(docs.readDocument(value,root),/DOCUMENT_NOT_FOUND/);
        await fs.writeFile(path.join(root,'new.pdf'),'%PDF-1.4');
        assert.ok((await docs.catalog(root)).some(d=>d.name==='new.pdf'));
        const long='a'.repeat(110)+'.md';await fs.writeFile(path.join(root,long),'Long filename');
        const item=(await docs.catalog(root)).find(d=>d.name===long);assert.ok(item.value.length<=100);assert.equal((await docs.readDocument(item.value,root)).attachment.toString(),'Long filename');
        await fs.writeFile(path.join(root,'large.txt'),Buffer.alloc(8*1024*1024+1));
        await assert.rejects(docs.readDocument('large.txt',root),/DOCUMENT_TOO_LARGE/);
        assert.deepEqual(await docs.catalog(path.join(root,'missing')),[]);
        // Exercise command handlers without opening a production database.
        const localization=require('../utils/localization');const originalSend=localization.send;
        localization.send=(target,method,data)=>target[method](data);
        delete require.cache[require.resolve('../commands/general/help')];
        const help=require('../commands/general/help');
        const i=(values={})=>({options:{getString:k=>values[k]??null,getFocused:()=>values.query||''},deferReply:async()=>{},async editReply(data){this.result=data;},async respond(data){this.result=data;}});
        let interaction=i({taal:'en'});await help.execute({},interaction);assert.equal(interaction.result.files[0].name,'MANUAL-EN.md');
        interaction=i({document:'NOTIFY-HUB.md',taal:'en'});await help.execute({},interaction);assert.match(interaction.result.files[0].attachment.toString(),/Gedeelde notify/);
        interaction=i({document:'overzicht',taal:'nl'});await help.execute({},interaction);
        const all=await docs.catalog();for(const d of all)assert.ok(interaction.result.files[0].attachment.toString().includes(d.name));
        interaction=i({query:'notify'});await help.autocomplete({},interaction);assert.ok(interaction.result.length>0);assert.ok(interaction.result.every(d=>d.value.toLowerCase().includes('notify')));
        interaction=i({document:'../.env',taal:'nl'});await help.execute({},interaction);assert.equal(interaction.result.files,undefined);
        localization.send=originalSend;
        // Only README remains at project root; changelog and all manuals are discoverable.
        const project=path.resolve(__dirname,'..');
        assert.deepEqual((await fs.readdir(project)).filter(f=>f.endsWith('.md')),['README.md']);
        for(const name of ['CHANGELOG.md','HANDLEIDING.md','MANUAL-EN.md'])assert.ok(all.some(d=>d.name===name));
        // Verify relative Markdown links after relocation (ignore web links and anchors).
        for(const file of ['README.md',...all.filter(d=>d.name.endsWith('.md')).map(d=>'docs/'+d.name)]) {
            const text=await fs.readFile(path.join(project,file),'utf8');
            for(const m of text.matchAll(/\]\(([^\s)]+)\)/g)) {
                const target=m[1].split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;
                await assert.doesNotReject(fs.access(path.resolve(project,path.dirname(file),target)),`${file}: ${target}`);
            }
        }
        console.log('PASS: docs discovery, nested/new files, overview, language selection, search, safe paths, size limits and document links.');
    } finally {await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

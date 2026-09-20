const {test} = require('node:test');
const assert = require('node:assert/strict');
const {repository,isNewerStable,checkForUpdate} = require('../services/updateChecker');
test('repo accepts GitHub links and rejects other hosts / credentials / paths', () => {
    assert.equal(repository('https://github.com/example/bot.git/'),'example/bot');
    assert.equal(repository('example/bot'),'example/bot');
    for (const value of ['https://evil.example/a/b','https://github.com/a/b/issues','https://user:pass@github.com/a/b','a/..','']) assert.throws(()=>repository(value));
});
test('numeric versions, stable releases and local beta', () => {
    assert.equal(isNewerStable('v2.4.10','2.4.9'),true);
    assert.equal(isNewerStable('v2.4.7','2.4.7'),false);
    assert.equal(isNewerStable('2.4.6','2.4.7'),false);
    assert.equal(isNewerStable('2.5.0-beta.1','2.4.7'),false);
    assert.equal(isNewerStable('2.5.0','2.5.0-beta.1'),true);
    assert.equal(isNewerStable('2.4.7+build','2.4.7'),false);
    assert.throws(()=>isNewerStable('latest','2.4.7'));
});
test('GitHub response handling uses timeout, no auth, validated URL', async () => {
    const fetchImpl = async(url, options)=> {
        assert.equal(url,'https://api.github.com/repos/example/bot/releases/latest');
        assert.equal(options.redirect,'error');
        assert.ok(options.signal);
        assert.equal(options.headers.Authorization,undefined);
        return {ok:true,json:async()=>({tag_name:'v2.4.8',html_url:'https://evil.example'})};
    };
    const result = await checkForUpdate({repo:'example/bot',fetchImpl});
    assert.equal(result.status,'update');
    assert.equal(result.url,'https://github.com/example/bot/releases/tag/v2.4.8');
    for (const [status, expected] of [[404,'missing'],[403,'limited'],[429,'limited']]) {
        assert.equal((await checkForUpdate({repo:'example/bot',fetchImpl:async()=>({status})})).status,expected);
    }
    for (const release of [{tag_name:'v3.0.0',draft:true},{tag_name:'v3.0.0',prerelease:true}]) {
        assert.equal((await checkForUpdate({repo:'example/bot',fetchImpl:async()=>({ok:true,json:async()=>release})})).status,'ignored');
    }
    await assert.rejects(checkForUpdate({repo:'example/bot',fetchImpl:async()=>({ok:false,status:500})}),/500/);
    await assert.rejects(checkForUpdate({repo:'example/bot',fetchImpl:async()=>({ok:true,json:async()=>({})})}),/geldige release/);
    await assert.rejects(checkForUpdate({repo:'example/bot',fetchImpl:async()=>{throw new Error('timeout');}}),/timeout/);
});

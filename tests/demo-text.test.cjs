"use strict";
const assert=require("node:assert/strict");
const demo=require("../scripts/demo-text.js");
const agents=["MCP","MAXIS","TRON","JN","VOLT","RELAY"];
for(const [text,agent,intent] of [
 ["Hey, can you fix my C# build?","MAXIS","debug"],["Hi MAXIS!","MCP","greeting"],
 ["Review firewall rules","TRON","review"],["Find duplicate files","JN","review"],
 ["GPU performance status","VOLT","status"],["Send an email briefing","RELAY","action"],
 ["Thanks!","MCP","thanks"],["Email a report to user@example.com","RELAY","action"]
]){
 assert.equal(demo.route(text,agents),agent,text);
 assert.equal(demo.classify(text).intent,intent,text);
}
const history=[{role:"You",text:"Review my repository"}];
assert.equal(demo.classify("tell me more",history).domain,"MAXIS");
assert.equal(demo.classify("what did I say?",history).previous,"Review my repository");
assert.equal(demo.classify("tell me more",[]).domain,null);
assert.match(demo.reply("MAXIS","fix my build"),/regression test/);
assert.match(demo.reply("MCP","review firewall rules"),/TRON/);
assert.notEqual(demo.reply("MAXIS","hello"),demo.reply("TRON","hello"));
assert.match(demo.reply("RELAY","send email"),/requires a connected service/);
assert.equal(demo.route("GPU performance",["MCP","MAXIS"]),"MCP");
console.log("Demo text matcher tests passed.");

const os = require('os');
const fs=require('fs');

module.exports=os.platform()==='win32'
    ?{
        debug:true,
        exec:function (cmd,fn) {
            return fn(this.execSync(cmd));
        },
        execSync:function (cmd) {
            cmd=cmd.trim();
            var f=require('./files').test+cmd.substr(0,(cmd+' ').indexOf(' '))+'.txt';
            console.log(cmd);
            if(fs.existsSync(f))return fs.readFileSync(f).toString();
        },
        spawn:require('child_process').spawn,
        spawnSync:require('child_process').spawnSync,

        network:{name:'bridge0x1',ip:'192.168.8.1',gap:'192.168.8'},

    }
    :{
        debug:false,
        exec:function (cmd,fn) {
            console.log(cmd);
            return require('child_process').exec(cmd,fn);
        },
        execSync:function (cmd) {
            console.log(cmd);
            return require('child_process').execSync(cmd).toString('UTF-8');
        },
        spawn:require('child_process').spawn,
        spawnSync:require('child_process').spawnSync,

        network:(function () {
            var n=require('os').networkInterfaces();
            var ip,name='bridge0x1';
            for(var e in n){
                if(e===name)n[e].some(function (v) {
                    if(v.family==='IPv4'){
                        ip=v.address;
                        return true;
                    }else return false;
                });
            };
            return ip?{name:name,ip:ip,gap:ip.substr(0,ip.lastIndexOf('.'))}:null;
        })(),
    };

module.exports.md5=(function () {
    const crypto = require('crypto');
    return function (str) {
        return crypto.createHash('md5').update(str).digest('hex');
    };
})();

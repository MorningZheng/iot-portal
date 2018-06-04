const os = require('os');
const fs=require('fs');

const $=module.exports=os.platform()==='win32'
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
    };

const crypto = require('crypto');

$.md5=function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
};

const spawn=require("child_process").spawn;
const spawnSync=require("child_process").spawnSync;


$.spawn=function (cmd,callback) {
    const options={shell: true,killSignal:'SIGTERM',};
    if (process.platform === 'win32') options.windowsVerbatimArguments = options.windowsHide=true;

    var child=spawn(cmd,options);
    child.on('close',function () {
        child.removeAllListeners('close');
        child.stderr.removeAllListeners('data');
        child.stdout.removeAllListeners('data');
        if(callback instanceof Function)callback(child);
    });

    return child;
};

$.spawnSync=function (cmd) {
    const options={shell: true,killSignal:'SIGTERM',};
    if (process.platform === 'win32') options.windowsVerbatimArguments = options.windowsHide=true;
    return spawnSync(cmd,options);
};

$.network=(function () {
    var data=undefined;
    return function () {
        var ip,name='bridge0x1';
        if(data===undefined){
            var current=undefined;
            data=$.execSync('nmcli device show').split('\n').reduce(function (a,b) {
                b=b.split(/\:\s+/).map(function (c) {
                    return c.trim();
                });
                if(b[0]==='GENERAL.DEVICE'){
                    if(b[1]===name){
                        current=b[1];
                        a[current]={};
                    }else current=undefined;
                }else if(current){
                    if(b[0]==='GENERAL.HWADDR')b[0]='IP4.MAC';
                    if(b[0].indexOf('IP')!==-1){
                        b[0]=b[0].split('.');
                        if(a[current].hasOwnProperty(b[0][0])===false)a[current][b[0][0]]={size:0,family:'IPv'+b[0][0].substr(-1)};

                        switch(b[0][1]){
                            case 'MAC':
                                a[current][b[0][0]].mac=b[1];
                                a[current][b[0][0]].size++;
                                break;
                            case 'ADDRESS[1]':
                                a[current][b[0][0]].address=b[1].substr(0,b[1].lastIndexOf('/'));
                                a[current][b[0][0]].cidr=b[1];
                                a[current][b[0][0]].size++;
                                break;
                        };
                    };
                }
                return a;
            },{});
            current=undefined;

            for(var d in data){
                data[d]=(Object.values(data[d]).filter(function (d) {
                    try{
                        return d.size!==0;
                    }finally {
                        delete d.size;
                    };
                }));
            };
        };

        if(data.hasOwnProperty(name))data[name].some(function (v) {
            if(v.family==='IPv4'){
                ip=v.address;
                return true;
            }else return false;
        });
        return ip?{name:name,ip:ip,gap:ip.substr(0,ip.lastIndexOf('.'))}:null;
    }
})();


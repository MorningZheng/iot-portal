(function () {
    const fs=require('fs');
    const path=require('path');
    const files=require('./lib/files');
    const layer=require('./lib/layer');


    const start=(function () {
        const spawn=require("child_process").spawn;
        const stdout=function (data) {
            process.stdout.write(data);
        };

        return function (cmd,onError,daemon) {
            var child=layer.spawn(cmd,function () {
                if(daemon>0){
                    setTimeout(function () {
                        start(cmd,onError,daemon);
                    },daemon);
                };
            });
            child.stdout.on('data',stdout);

            if(onError instanceof Function){
                child.stderr.setEncoding('UTF-8');
                child.stderr.on('data',onError);
            };
        };
    })();
    const errorFile=path.join(__dirname,'error.log');
    const errorLog=function (data) {
        data+='\n';
        console.log(data);
        fs.appendFileSync(errorFile,data);
    };


    //将系统开启的热点关闭，并使用自己的配置文件
    start('killall dnsmasq hostapd');

    //dnsmasq以及hostapd已经使用了daemon模式启动，所以不用守护
    start('dnsmasq -C '+files.dnsmasq.config,errorLog);
    console.log(files.dnsmasq.config);
    start('hostapd -B '+files.hostapd.config,errorLog);
    console.log(files.hostapd.config);
    // start('cpufreq-set -u 860000');

    var task=['portal.js','action.js']
        .reduce(function (a,file) {
            var file=path.resolve(__dirname,file);
            if(fs.existsSync(file))a.push(process.execPath+' '+path.resolve(__dirname,file));
            return a;
        },[]);

    var then=function () {
        if(task.length){
            const cmd=task.shift();
            start(cmd,errorLog,1000);
            setTimeout(then,1000);
        }else task=then=null;
    };
    then();
})();
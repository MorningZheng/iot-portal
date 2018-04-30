const fs = require('fs');
const files=require('./files');
const layer=require('./layer');

const $this={
    iptables:{
        mac:{
            accept:function (mac,pos) {
                pos=pos?'I':'A';
                return [
                    'iptables -t raw -'+pos+' PREROUTING -m mac --mac-source '+mac+' -j ACCEPT ',
                    'iptables -t nat -'+pos+' PREROUTING -m mac --mac-source '+mac+' -j ACCEPT',
                ];
            },
        },
        ip:{
            redirect:function (ip,pos) {
                pos=pos?'I':'A';
                return [
                    'iptables -t raw -'+pos+' PREROUTING -d '+ip+' -j ACCEPT',
                    'iptables -t nat -'+pos+' PREROUTING -d '+ip+' -j DNAT --to '+layer.network.ip,
                ];
            }
        }
    },
    boot:function () {
        console.log('> system is booting.');

        var net=layer.network;
        if(net===null){
            console.log('No network interface in your machine which names bridge0x1,pleas config it follow the document.');
            return false;
        }else{
            var cmd=[
                'iptables -t raw -A PREROUTING -i '+net.name+' -p tcp -m multiport --dport 22,53,80,443,8080 -j ACCEPT',
                'iptables -t raw -A PREROUTING -i '+net.name+' -p udp -m multiport --dport 22,53,67,68,546,8080 -j ACCEPT',
                'iptables -t nat -A PREROUTING -i '+net.name+' -p tcp --dport 80 -j DNAT --to-destination '+net.ip+':80',
                'iptables -t nat -A PREROUTING -i '+net.name+' -p tcp --dport 8080 -j DNAT --to-destination '+net.ip+':8080',
                'iptables -t nat -A PREROUTING -i '+net.name+' -p tcp --dport 443 -j DNAT --to-destination '+net.ip+':443',
                'iptables -t nat -A POSTROUTING -j MASQUERADE ',
            ];


            console.log('> accept iot mac.');
            //放行设备mac
            try{
                fs.readFileSync(files.iptables.accept_mac).toString().split(/[\r\n\t\s]+/).forEach(function (m) {
                    if(m) Array.prototype.push.apply(cmd,$this.iptables.mac.accept(m));
                });
            }catch (_){};

            console.log('> redirect ip.');
            try{
                fs.readFileSync(files.iptables.redirect_ip).toString().split(/[\r\n\t\s]+/).forEach(function (i) {
                    if(i) Array.prototype.push.apply(cmd,$this.iptables.ip.redirect(i));
                });
            }catch (_){};

            //不符合以上规则的，全部拒绝
            cmd.push('iptables -t raw -A PREROUTING -i '+net.name+' -j DROP');

            //备份
            cmd.push('iptables-restore > '+files.iptables.backup);

            console.log('> committing config & starting application.');
            cmd.forEach(function (c) {
                layer.execSync(c);
            });

            return true;
        };
    },
    os:{
        reboot:function () {
            setTimeout(function () {
                layer.execSync('reboot');
            },200);
            return 'reboot at '+(new Date()).toDateString();
        },
        shutdown:function () {
            return layer.execSync('shutdown');
        },
        shell:function (cmd) {
            return layer.execSync(cmd);
        },
    },
    server:{
        url:{
            get:function () {
                return fs.readFileSync(files.network.server).toString();
            },
            set:function (value) {
                return fs.writeFileSync(files.network.server,value);
            },
        }
    },
    update:function (url,fn) {
        var file=files.root+'update.zip';
        layer.exec('wget -O '+file+' '+url,function () {
            layer.exec('unzip '+file,function (data) {
                if(fn instanceof Function)fn(data);
            });
        });
    },
};

$this.room={id:fs.existsSync(files.room.id)?fs.readFileSync(files.room.id).toString():-1,};
module.exports=$this;
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
                    'iptables -t nat -'+pos+' PREROUTING -d '+ip+' -j DNAT --to '+layer.network().ip,
                ];
            }
        },
        acceptGuest:function (txt) {
            txt.split(/[\r\n\t\s]+/).forEach(function (mac) {
                mac=mac.trim();
                if(mac){
                    layer.execSync('iptables -t raw -I PREROUTING -m mac --mac-source '+mac+' -j ACCEPT ');
                    layer.execSync('iptables -t nat -I PREROUTING -m mac --mac-source '+mac+' -j ACCEPT');
                };
            });
        },
    },
    boot:function () {
        console.log('> system is booting.');

        var net=layer.network();
        if(net===null){
            console.log('No network interface in your machine which names bridge0x1,pleas config it follow the document.');
            return false;
        }else{
            var cmd=[
                'iptables -t raw -A PREROUTING -i bridge0x1 -p tcp -m multiport --dport 22,53,80,443,8080 -j ACCEPT',
                'iptables -t raw -A PREROUTING -i bridge0x1 -p udp -m multiport --dport 22,53,67,68,546,8080 -j ACCEPT',
                'iptables -t nat -A PREROUTING -i bridge0x1 -p tcp --dport 80 -j DNAT --to-destination '+net.ip+':80',
                'iptables -t nat -A PREROUTING -i bridge0x1 -p tcp --dport 8080 -j DNAT --to-destination '+net.ip+':8080',
                'iptables -t nat -A PREROUTING -i bridge0x1 -p tcp --dport 443 -j DNAT --to-destination '+net.ip+':443',
                'iptables -t nat -A POSTROUTING -j MASQUERADE ',
            ];


            console.log('> accept iot mac.');
            //放行设备mac
            files.file.readTxtSync(files.iptables.accept_mac).split(/[\r\n\t\s]+/).forEach(function (m) {
                if(m) Array.prototype.push.apply(cmd,$this.iptables.mac.accept(m));
            });

            console.log('> redirect ip.');
            files.file.readTxtSync(files.iptables.redirect_ip).split(/[\r\n\t\s]+/).forEach(function (i) {
                if(i) Array.prototype.push.apply(cmd,$this.iptables.ip.redirect(i));
            });

            //不符合以上规则的，全部拒绝
            cmd.push('iptables -t raw -A PREROUTING -i bridge0x1 -j DROP');

            //备份
            cmd.push('iptables-restore > '+files.iptables.backup);

            console.log('> committing config & starting application.');
            cmd.forEach(function (c) {
                layer.execSync(c);
            });

            console.log('> pass guest mac.');
            //先完成备份，最后再放行用户mac
            $this.iptables.acceptGuest(files.file.readTxtSync(files.iptables.accept_guest));

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
                return files.file.readTxtSync(files.network.server);
            },
            set:function (value) {
                return fs.writeFileSync(files.network.server,value);
            },
        }
    },
    update:function (url,fn) {
        var file=files.join('./update.zip');
        layer.exec('wget -O '+file+' '+url,function () {
            layer.exec('unzip -o '+file+' -d '+files.root,function (data) {
                fs.unlink(file,function () {});
                if(fn instanceof Function)fn(data);
            });
        });
    },
    mode:(function () {
        var ifconfig=(function () {
            var inet=undefined;
            var match={
                task:[
                    [/(\w+)\s+Link\s+encap\:Ethernet\s+HWaddr\s+([\w\:]{17})/,function (o,r) {
                        r[2]=r[1].substr(0,3);
                        inet= (r[2]==='enx'||r[2]==='wlx')?r[2]:r[1].substr(0,6)==='bridge'?'bridge':r[1];
                        o[inet]=({name:r[1],mac:r[2]});
                        r.length=0;
                    }],
                    [/inet\s+addr:(\d+\.\d+\.\d+\.\d+)\s+Bcast:\d+\.\d+\.\d+\.\d+\s+Mask:(\d+\.\d+\.\d+\.\d+)/,function (o,r) {
                        o[inet].ip=r[1];
                        o[inet].gap=r[1].substr(0,r[1].lastIndexOf('.'));
                        o[inet].mask=r[2];
                    }],
                ],
                work:function (txt,obj) {
                    match.task.some(function (task) {
                        var r=task[0].exec(txt);
                        if(r===null)return false;
                        else{
                            task[1](obj,r);
                            r.length=0;
                            return true;
                        };
                    });
                },
            };
            return function() {
                try{
                    inet=undefined;
                    return layer.execSync('ifconfig -a').split('\n').reduce(function (a,b) {
                        match.work(b,a);
                        return a;
                    },{});
                }finally {
                    inet=undefined;
                };
            };
        })();

        var w2l=function (path) {
            return path.indexOf(':\\')===-1?path:'/home/amethyst/portal'+path.substr(path.indexOf('\\config')).replace(/\\/g,'/');
        };

        var commit=function (inet,data) {
            files.file.writeTxtSync(files.hostapd.config,'interface='+inet.wlan0.name+'\n' +
                'bridge='+inet.bridge.name+'\n' +
                'ssid=nesthue.cn\n' +
                'driver=nl80211\n' +
                'hw_mode=g\n' +
                'channel=10\n' +
                'driver=nl80211\n' +
                'ignore_broadcast_ssid=0\n' +
                'beacon_int=100\n' +
                'dtim_period=1\n' +
                'max_num_sta=255\n' +
                'rts_threshold=2347\n' +
                'fragm_threshold=2346\n' +
                'macaddr_acl=0\n' +
                'deny_mac_file='+w2l(files.hostapd.mac_file_deny)+'\n' +
                'wmm_enabled=1\n' +
                'wmm_ac_bk_cwmin=4\n' +
                'wmm_ac_bk_cwmax=10\n' +
                'wmm_ac_bk_aifs=7\n' +
                'wmm_ac_bk_txop_limit=0\n' +
                'wmm_ac_bk_acm=0\n' +
                'wmm_ac_be_aifs=3\n' +
                'wmm_ac_be_cwmin=4\n' +
                'wmm_ac_be_cwmax=10\n' +
                'wmm_ac_be_txop_limit=0\n' +
                'wmm_ac_be_acm=0\n' +
                'wmm_ac_vi_aifs=2\n' +
                'wmm_ac_vi_cwmin=3\n' +
                'wmm_ac_vi_cwmax=4\n' +
                'wmm_ac_vi_txop_limit=94\n' +
                'wmm_ac_vi_acm=0\n' +
                'wmm_ac_vo_aifs=2\n' +
                'wmm_ac_vo_cwmin=2\n' +
                'wmm_ac_vo_cwmax=3\n' +
                'wmm_ac_vo_txop_limit=47\n' +
                'wmm_ac_vo_acm=0\n');

            files.file.writeTxtSync(files.dnsmasq.config,'user=nobody\n' +
                'no-poll\n' +
                'bogus-priv\n' +
                'no-negcache\n' +
                'clear-on-reload\n' +
                'bind-dynamic\n' +
                'interface='+inet.bridge.name+'\n' +
                'listen-address=127.0.0.1,'+inet.bridge.gap+'.1\n' +
                'min-port=4096\n' +
                'cache-size=512\n' +
                'domain=lan\n' +
                'expand-hosts\n' +
                'dhcp-range='+inet.bridge.gap+'.2,'+inet.bridge.gap+'.244,'+inet.bridge.mask+',86400\n' +
                'quiet-dhcp\n' +
                'dhcp-authoritative\n' +
                'addn-hosts='+w2l(files.dnsmasq.hosts)+'\n');


            files.file.writeTxtSync(files.network.interfaces,'auto lo\niface lo inet loopback\n\n'+data);
            return 'please reboot the system.';
        };


        return {
            'monet>wifi&rj45':function (confirm) {
                if(confirm){
                    var inet=ifconfig();
                    if(inet.hasOwnProperty('enx')===false) return 'no monet interface!';
                    if(inet.hasOwnProperty('wlan0')===false&&inet.hasOwnProperty('eth0')===false)return 'no network interface!';

                    return commit(inet,
                        'auto '+inet.bridge.name+'\n' +
                        'allow-hotplug '+inet.bridge.name+'\n' +
                        'iface '+inet.bridge.name+' inet static\n' +
                        '        address '+inet.bridge.gap+'.1\n' +
                        '        network '+inet.bridge.gap+'.0\n' +
                        '        netmask '+inet.bridge.mask+'\n' +
                        '        broadcast '+inet.bridge.gap+'.255\n' +
                        '        bridge-ports '+(inet.hasOwnProperty('wlan0')?'wlan0':'')+' '+(inet.hasOwnProperty('eth0')?'eth0':''));
                };
            },
            'rj45>wifi':function (confirm) {
                if(confirm){
                    var inet=ifconfig();
                    if(inet.hasOwnProperty('wlan0')===false) return 'no wifi interface!';

                    return commit(inet,
                        'auto '+inet.bridge.name+'\n' +
                        'allow-hotplug '+inet.bridge.name+'\n' +
                        'iface '+inet.bridge.name+' inet static\n' +
                        '        address '+inet.bridge.gap+'.1\n' +
                        '        network '+inet.bridge.gap+'.0\n' +
                        '        netmask '+inet.bridge.mask+'\n' +
                        '        broadcast '+inet.bridge.gap+'.255\n' +
                        '        bridge-ports wlan0\n');
                };
            },
            'rj45>wifi&rj45':function (confirm) {
                if(confirm){
                    var inet=ifconfig();
                    if(inet.hasOwnProperty('eth1')===false) return 'no eth1 interface!';
                    if(inet.hasOwnProperty('wlan0')===false&&inet.hasOwnProperty('eth0')===false)return 'no network interface!';

                    return commit(inet,
                        'auto '+inet.bridge.name+'\n' +
                        'allow-hotplug '+inet.bridge.name+'\n' +
                        'iface '+inet.bridge.name+' inet static\n' +
                        '        address '+inet.bridge.gap+'.1\n' +
                        '        network '+inet.bridge.gap+'.0\n' +
                        '        netmask '+inet.bridge.mask+'\n' +
                        '        broadcast '+inet.bridge.gap+'.255\n' +
                        '        bridge-ports '+(inet.hasOwnProperty('wlan0')?'wlan0':'')+' '+(inet.hasOwnProperty('eth0')?'eth0':''));
                };
            },
            'wifi>wifi&rj45':function (ssid,password) {
                if(ssid){
                    var inet=ifconfig();

                    if(inet.hasOwnProperty('enx')===false) return 'no monet interface!';
                    if(inet.hasOwnProperty('wlan0')===false&&inet.hasOwnProperty('eth0')===false)return 'no network interface!';


                    return commit(inet,
                        'auto '+inet.bridge.name+'\n' +
                        'allow-hotplug '+inet.bridge.name+'\n' +
                        'iface '+inet.bridge.name+' inet static\n' +
                        '        address '+inet.bridge.gap+'.1\n' +
                        '        network '+inet.bridge.gap+'.0\n' +
                        '        netmask '+inet.bridge.mask+'\n' +
                        '        broadcast '+inet.bridge.gap+'.255\n' +
                        '        bridge-ports '+((inet.hasOwnProperty('wlan0')?'wlan0':'')+' '+(inet.hasOwnProperty('eth0')?'eth0':'')) +
                        '\n\n'+
                        (inet.hasOwnProperty('wlx')?'auto '+inet.wlx.name+'\n' +
                            'allow-hotplug '+inet.wlx.name+'\n' +
                            'iface '+inet.wlx.name+' inet dhcp  \n' +
                            'wpa-conf '+w2l(files.wifi.wpa):'')
                    );
                };
            },
        }
    })(),
    sensor:{
        map:function (id,type,tag,sql) {
            var data=files.file.readTxtSync(files.sensor.map).trim();
            data=data===''?{}:JSON.parse(data);

            if(data.hasOwnProperty(id)===false)data[id]={};
            if(data[id].type!==type || data[id].tag!==tag || data[id].sql!==sql){
                data[id]={id:id,type:type,tag:tag,sql:sql};
                files.file.writeTxtSync(files.sensor.map,JSON.stringify(data));
            };

            data=null;
        },
    },
};

module.exports=$this;
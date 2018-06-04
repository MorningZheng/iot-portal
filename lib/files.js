const path=require('path');
const fs=require('fs');

const root=path.resolve(__dirname,'../');

module.exports={
    root:root,
    system:{
        version:{
            number:'./data/version.number',
            label:'./data/version.label',
        }
    },
    join:function (file) {
        return path.join(root,file);
    },
    log:{
        error:'./data/log.error',
        shell:'./data/log.shell',
        temp:{
            alive:'./data/alive.temp',
        },
    },
    wifi:{
        password:'./config/wifi_password.conf',
        wpa:'./config/wpa_supplicant.conf',
    },
    iptables:{
        backup:'./config/iptables.bak',
        accept_mac:'./config/accept.mac',
        accept_guest:'./config/accept.guest',
        redirect_ip:'./config/redirect.ip',
    },
    hostapd:{
        config:'./config/hostapd.conf',
        mac_file_deny:'./config/mac.deny',
    },
    dnsmasq:{
        config:'./config/dnsmasq.conf',
        hosts:'./config/hosts',
        dhcp:{
            hostsdir:'./config/hostsdir',
        }
    },
    config:'./config',
    room:{
        id:'./config/room.id',
    },
    test:'./data/',
    device:{
        wlan:{
            name:'./config/wlan.name',
            mac:'./config/wlan.mac',
        },
    },
    sensor:{
        map:'./config/sensor.map',
    },
    www:'./www',
    pem:{
        key:'./data/key.pem',
        cert:'./data/cert.pem',
    },
    network:{
        interfaces:'./config/interfaces',
        server:'./config/server',
        timestamp:'./data/timestamp/'
    },
    prison:{
        zhengguo:{
            res:'./data/zhengguo.M2.res',
        }
    },
    find: {
        file: {
            indexOf: function (file, word) {
                try {
                    return fs.readFileSync(file).toString().indexOf(word);
                } catch (_) {
                    return -1;
                };
            },
            replace: function (file, start, next, word) {
                return module.exports.find.text.replace(fs.readFileSync(file).toString(), start, next, word);
            },
        },
        text: {
            replace: function (txt, start, next, word) {
                var a;
                a = txt.indexOf(start) + start.length;
                return txt.substr(0, a) + word + txt.substr(txt.indexOf(next, a));
            },
        }
    },
    file:{
        readTxtSync:function (file) {
            try{
                return fs.readFileSync(Array.prototype.reduce.call(arguments,function (a,b) {
                    return b?path.join(a,b):a;
                },'')).toString();
            }catch (_){
                return '';
            };
        },
        writeTxtSync:function (file,data) {
            file=Array.prototype.slice.call(arguments,0,-1).reduce(function (a,b) {
                return b?path.join(a,b):a;
            },'');
            data=arguments[arguments.length-1];
            fs.writeFileSync(file,data);
        },
    },
    bridge:{
        port:'./data/bridge',
    },
};

/**
 * 文件的绝对地址
 * @param file 相对路径
 */
var real=function (file) {
    return path.join(root,file);
};

/**
 * 递归转换文件路径
 * @param o 文件路径集盒
 * @returns {object}
 */
var each=function (o) {
    Object.keys(o).forEach(function (f) {
        if(o[f] instanceof Object)each(o[f]);
        else if(f!=='root') o[f]=real(o[f]);
    });
    return o;
};

['config','data',
    module.exports.dnsmasq.dhcp.hostsdir,
    module.exports.bridge.port,
    module.exports.network.timestamp,
].forEach(function (p) {
    p=real(p);
    if(fs.existsSync(p)===false)fs.mkdirSync(p,0777);
});
each(module.exports);

module.exports.events={
    wifi:{
        checkin:'wifiCheckIn',
    },
    action:{
        room:{
            nobody:'roomNobody',
            someone:'roomSomeone',
        },
        guest:{
            move:'guestMove',
            still:'guestStill',
        }
    },
    sensor:{
        door:{
            open:'sensorDoorOpen',
            close:'sensorDoorClose',
        },
        body:{
            move:'sensorBodyMove',
            still:'sensorBodyStill',
        }
    },
};


const path=require('path');
const fs=require('fs');

const root=path.join(__dirname,'../');

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
        else o[f]=real(o[f]);
    });
    return o;
};

module.exports={
    root:root,
    log:{
        error:'./data/log.error',
        shell:'./data/log.shell',
        temp:{
            alive:'./data/alive.temp',
        },
    },
    wifi:{
        password:'./config/wifi_password.conf',
    },
    iptables:{
        backup:'./config/iptables.bak',
        accept_mac:'./config/accept.mac',
        redirect_ip:'./config/redirect.ip',
    },
    hostapd:{
        config:'../hostapd/hostapd.conf',
        mac_file_deny:'../hostapd/mac_file.deny',
    },
    dnsmasq:{
        config:'../dnsmasq/dnsmasq.conf',
        hosts:'../dnsmasq/hosts',
        dhcp:{
            hostsdir:'../dnsmasq/hostsdir',
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
        }
    },
    www:'./www',
    pem:{
        key:'./data/key.pem',
        cert:'./data/cert.pem',
    },
    network:{
        interfaces:'./config/interfaces',
        server:'./config/server',
        timestamp:'./data/network.timestamp'
    },
    prison:{
        zhengguo:{
            res:'./data/zhengguo.M2.res',
        }
    }
};

['config','../dnsmasq','../hostapd','data',module.exports.dnsmasq.dhcp.hostsdir].forEach(function (p) {
    p=real(p);
    if(fs.existsSync(p)===false)fs.mkdirSync(p,0777);
});
each(module.exports);

module.exports.find={
    file:{
        indexOf:function (file,word) {
            try{
                return fs.readFileSync(file).toString().indexOf(word);
            }catch (_){
                return -1;
            };
        },
        replace:function (file,start,next,word) {
            return module.exports.find.text.replace(fs.readFileSync(file).toString(),start,next,word);
        },
    },
    text:{
        replace:function (txt,start,next,word) {
            var a;
            a=txt.indexOf(start)+start.length;
            return txt.substr(0,a)+word+txt.substr(txt.indexOf(next,a));
        },
    }
};
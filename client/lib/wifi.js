const fs=require('fs');
const files=require('./files');
const layer=require('./layer');
const system=require('./system');

var $this=module.exports={
    ip:{
        /**
         * 将指定的ip地址转换成mac地址
         * @param {string} ip 待转换的ip地址
         * @returns {string} 大写的mac地址
         */
        mac:function (ip) {
            if(ip==='127.0.0.1')return 'ff:ff:ff:ff:ff:ff';
            else{
                var mac;
                layer.execSync('arp -av '+ip).split('\n').some(function(v) {
                    if(v.indexOf(ip)===-1)return false;
                    else{
                        mac=v.match(/\w{2}\:\w{2}\:\w{2}\:\w{2}\:\w{2}\:\w{2}/)[0];
                        return true;
                    };
                });

                return mac;
            };
        },
        /**
         * 放行指定ip地址
         * @param ip 待放行的ip地址
         * @returns {string} 返回ip地址对应的mac地址
         */
        pass:function (ip) {
            return $this.mac.pass($this.ip.mac(ip));
        },
        /**
         * 禁止某ip访问网络
         * @param ip 待禁止的ip地址
         * @returns {string} 返回ip地址对应的mac地址
         */
        drop:function (ip) {
            return $this.mac.drop($this.ip.mac(ip));
        },
        /**
         * 禁止指定ip连接上wifi网络
         * @param ip 待禁止的ip地址
         * @param deadline 禁止到期的时间，默认3天后
         * @returns {string} 返回ip地址对应的mac地址
         */
        reject:function (ip,deadline) {
            return $this.mac.reject($this.ip.mac(ip),deadline);
        },
    },
    mac:{
        /**
         * 放行指定mac主机
         * @param mac 主机的网卡地址
         * @returns {string} 大写的mac地址
         */
        pass:function (mac) {
            if(mac){
                mac=mac.toUpperCase();
                layer.execSync('iptables -t raw -I PREROUTING -m mac --mac-source '+mac+' -j ACCEPT');
                layer.execSync('iptables -t nat -I PREROUTING -m mac --mac-source '+mac+' -j ACCEPT');
            };
            return mac;
        },
        /**
         * 禁止某主机访问网络
         * @param ip 主机的网卡地址
         * @returns {string} 大写的mac地址
         */
        drop:function (mac) {
            if(mac){
                mac=mac.toUpperCase();
                layer.execSync('iptables -t raw -D PREROUTING -m mac --mac-source '+mac+' -j ACCEPT');
                layer.execSync('iptables -t nat -D PREROUTING -m mac --mac-source '+mac+' -j ACCEPT');
            };
            return mac;
        },
        /**
         * 禁止主机连入wifi网络
         * @param mac 待禁止的主机mac
         * @param deadline 禁止到期的时间，默认3天后
         * @returns {string} 大写的mac地址
         */
        reject:function (mac,deadline) {
            // hostqpd)
            console.log('reject ',mac,'until',deadline);
            if(mac){
                mac=mac.toUpperCase();

                var file=files.hostapd.mac_file_deny;
                if(fs.readFileSync(file).toString().indexOf(mac)===-1){
                    fs.appendFileSync(file, mac+' #'+(deadline||((new Date()).getTime()+72*3600000))+'\n');
                    layer.execSync('pkill -SIGHUP hostapd');
                };
                return mac;
            }

            //dnsmasq
            {
                // fs.writeFileSync(path.join('./dnsmasq',mac.replace(/\:/g,'')+'.conf'),'--dhcp-host='+mac+',ignore');

                //--dhcp-hostsfile 用这个要发送SIGHUP
                //--dhcp-hostsdir  这个会动态监测
                // layer.execSync('pgrep -f dnsmasq').split('\n').forEach(function (pid) {
                //     layer.execSync('pkill -SIGHUP '+pid);
                // });
            }
        },
        /**
         * 放行被禁止的主机
         * @param mac 待放行的主机mac
         * @returns {string} 大写的mac地址
         */
        accept:function (mac) {
            //dnsmasq
            {
                // fs.unlinkSync('./dnsmasq/'+(mac.replace(/\:/g,''))+'.conf');
            }


            // hostqpd
            if(mac) {
                mac=mac.toUpperCase();
                console.log('accept ',mac);

                var file=files.hostapd.mac_file_deny;
                var data=fs.readFileSync(file).toString();
                var a=data.indexOf(mac)
                if(a!==-1){
                    var b=data.indexOf('\n',a)+1;
                    fs.writeFileSync(file, (data.substr(0,a)+data.substr(b)));
                    data=a=b=null;
                    layer.execSync('pkill -SIGHUP hostapd');
                };
                return mac;
            }
        },
    },
    /**
     * 检查连入wifi的验证码是否正确
     * @param password 验证的密码
     * @returns {boolean}
     */
    checkin:function (password) {
        if(password){
            password=password.trim();
            var hash=layer.md5(password);
            return $this.password.data.some(function (val) {
                return password===val || val===hash;
            });
        }else return false;
    },
    /**
     * 放行已到期的被禁连入wifi的主机
     * @param deadline 到期事件
     * @returns {boolean} 是否有改动的主机
     */
    release:function () {
        var file=files.hostapd.mac_file_deny;
        var data=fs.readFileSync(file).toString().split('\n');

        var deadline=(new Date()).getTime();
        var change=false;
        var str='';
        for(var i=0;i<data.length;i++){
            if(data[i].length>1){
                data[i].substr(1)>deadline?str+=data[i]+'\n'+data[i+1]+'\n':change=true;
                i++;
            }else str+=data[i];
        };

        if(change){
            fs.writeFileSync(file, str);
            layer.execSync('pkill -SIGHUP hostqpd');
        };
        str=null;

        return change;
    },
    iptables:{
        /**
         * 清空所有的用户放行规则
         */
        reset:function () {
            layer.execSync('iptables-restore < '+files.iptables.backup);
        },
        /**
         * 备份放行规则
         */
        backup:function () {
            layer.execSync('iptables-restore > '+files.iptables.backup);
        },
    },
    password:{
        reset:function () {
            $this.password.data=fs.readFileSync(files.wifi.password).toString().split(/[\r\n\,\;]+/);
        },
        data:undefined,
    },
    edit:{
        name:function (value) {
            fs.writeFileSync(files.hostapd.config,
                files.find.file.replace(files.hostapd.config,'ssid=','\n',value)
            );
        },
        password:function (value) {
            $this.password.data=value.split(/[\r\n\,\;]+/).filter(function (p) {
                return p>1;
            });
            fs.writeFileSync(files.wifi.password,$this.password.data.join('\n'));
        },
        address:function (value) {
            value=(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/g).exec(value);
            if(value){
                var ip=value.slice(1,4).join('.');
                value.length=0;


                value=fs.readFileSync(files.dnsmasq.hosts).toString().split('\n').map(function (v) {
                    return ip+'.1'+v.substr(v.indexOf(' '));
                }).join('\n');
                fs.writeFileSync(files.dnsmasq.hosts,value);
                value=null;

                fs.writeFileSync(files.dnsmasq.config,
                    files.find.text.replace(
                        files.find.file.replace(files.dnsmasq.config,'listen-address=','\n',ip+'.1'),
                        'dhcp-range=','\n',ip+'.2,'+ip+'.244,255.255.255.0,86400'
                    )
                );

                fs.writeFileSync(files.network.interfaces,
                    files.find.text.replace(
                        files.find.file.replace(files.network.interfaces,'address ','\n',ip+'.1'),
                        'network ','\n',ip+'.0'
                    )
                );
                return true;
            }return false;
        },
        mac:{
            accept:function (address) {
                if(address){
                    address=address.trim();
                    if(files.find.file.indexOf(files.iptables.accept_mac,address)===-1){
                        fs.appendFileSync(files.iptables.accept_mac,address+'\n');
                        system.iptables.mac.accept(address,true).forEach(function (i) {
                            layer.execSync(i);
                        });
                    };

                    return address;
                }else return 'no mac address';
            }
        },
        ip:{
            redirect:function (ip) {
                if(ip){
                    ip=ip.trim();

                    if(files.find.file.indexOf(files.iptables.redirect_ip,ip)===-1){
                        fs.appendFileSync(files.iptables.redirect_ip,ip+'\n');
                        system.iptables.ip.redirect(ip,true).forEach(function (i) {
                            layer.execSync(i);
                        });
                    };

                    return ip;
                }else return 'no ip address';
            },
        },
    },
    initialize:function () {
        $this.password.reset();
        return this;
    },
};

$this.edit.mac.accept('60:01:94:42:07:46');
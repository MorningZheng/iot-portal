(function () {
    const fs=require('fs');
    const files=require('./lib/files');

    require('./lib/system').boot();
    const path=require('path');
    const layer=require('./lib/layer');
    const wifi=require('./lib/wifi').initialize();
    const url=require('url');

    /**
     * ip地址密码验证
     * @param ip 要验证的ip地址
     * @param password 密码
     * @returns {boolean|int} true，正确；数字为尝试的次数
     */
    const checkin=(function () {
        const deny={};

        //每隔一小时检查一次阻止列表
        const release=function () {
            wifi.release();
            setTimeout(release,3600000);
        };
        release();

        return function (ip,password) {
            if(ip==='127.0.0.1')return true;
            else if(wifi.checkin(password)){
                wifi.ip.pass(ip);
                return true;
            }else{
                if(deny.hasOwnProperty(ip)===false)deny[ip]={total:0,id:0,ip:ip};
                else{
                    clearTimeout(deny[ip].id);
                    if(deny[ip].total>checkin.max)return 0;
                };

                deny[ip].total++;
                deny[ip].total<checkin.max?
                    (
                        deny[ip].id=setTimeout(function () {
                            delete deny[ip];
                        },checkin.gap)
                    ):(
                        //先把当前的消息发送出去再禁止
                        setTimeout(function () {
                            wifi.ip.reject(ip,(new Date()).getTime()+checkin.expires)
                        },200)
                    );

                return checkin.max-deny[ip].total;
            };
        };
    })();

    /**
     * 允许重试的单位时间
     * @type {number}
     */
    checkin.gap=10*60*1000;

    /**
     * 单位时间内允许重试的最大次数
     * @type {number}
     */
    checkin.max=5;

    /**
     * 禁止过期单位时间
     * @type {number}
     */
    checkin.expires=3*24*60*60*1000;

    /**
     *  @param {string} file 页面地址
     */
    const page=(function () {
        var cache={};

        return {
            get:function (file) {
                if(layer.debug)delete cache[file];
                if(cache.hasOwnProperty(file)===false)cache[file]=fs.readFileSync(path.join(files.www,file+'.html')).toString();
                return cache[file];
            },
            hello:function (req,res) {
                res.end(page.get('hello').replace('{{}}','var target="http://'+req.headers.host+req.url+'"'));
            },
            welcome:function (req,res,rlt) {
                res.end(page.get('welcome').replace('{{}}',rlt===true?'welcome':('剩余验证次数：'+rlt)));
            },
            config:function (req,res) {
                res.end(page.get('config'));
            },
            other:function (req,res) {
                var file=path.join(files.www,req.get.pathname);
                fs.exists(file,function (exists) {
                    if(exists) fs.stat(file,function (error, stat) {
                        if(stat.isDirectory()) page.hello(req,res);
                        else{
                            var stream = fs.createReadStream(file);
                            res.writeHead(200);
                            stream.pipe(res);
                            return true;
                        };
                    });
                    else page.hello(req,res);
                });
            },
        };
    })();

    const handler=(function () {
        /**
         * 转换socket到ip地址
         * @param socket
         */
        const ip=function (socket) {
            if(socket.remoteAddress==='::1')return '127.0.0.1';
            else return socket.remoteAddress.substr(socket.remoteAddress.lastIndexOf(':')+1);
        };

        return {
            request:function (req,res) {
                req.get=url.parse(req.url);
                if(req.get.pathname==='/door.php'){
                    if (req.method === 'POST'){
                        var data = '';
                        req.on('data', function (chunk) {
                            data+=chunk;
                        });
                        req.on('end', function () {
                            try{
                                data=JSON.parse(data);
                                if(data instanceof Array)data=JSON.stringify(data[0]==='checkin'?checkin(ip(req.socket),data[1][0]):require('./lib/rpc')(data[0],data[1]));
                                else data='Arguments Error.';
                            }catch (_){
                                console.log(_.stack);
                                data='Parse Error.';
                            };
                            res.writeHead(200);
                            res.end(data);
                        });
                    }else res.end();
                }else if(req.headers.host==='config.morninghome.com' && req.get.pathname==='/')req.get.pathname='/config.html';
                else if(req.headers.host==='welcome.com' && req.get.pathname==='/'){
                    page.welcome(req,res,checkin(ip(req.socket), req.url.substr(2)));
                    return;
                };

                page.other(req,res);
            },
            error:function (err) {
                console.log(err);
            },
        };
    })();

//http
    {
        require('http').createServer()
            .on('request',handler.request)
            .on('error',handler.error)
            .listen(80);
    };

//https
    {
        require('https').createServer({
            key: fs.readFileSync(files.pem.key),
            cert: fs.readFileSync(files.pem.cert),
        })
            .on('request',handler.request)
            .on('error',handler.error)
            .listen(443);
    };

    console.log('> portal is started now.');
})();
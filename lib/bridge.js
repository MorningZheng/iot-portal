(function () {
    const files=require('./files');
    const fs=require('fs');
    const dgram = require('dgram');
    const path=require('path');

    /**
     * 空函数空函数
     */
    const empty=function () {};
    var upd=undefined;

    const port={
        id:23310,

        /**
         * 端口缓存文件
         */
        file:path.join(files.bridge.port,path.basename(__filename)),

        /**
         * 更新端口缓存文件的间隔时间
         * @type {number}
         */
        alive:30000,

        /**
         * 更新端口文件文件
         */
        update:function () {
            fs.writeFile(port.file,port.id,empty);
            // console.log('> update',port,(new Date()).getTime());
            setTimeout(port.update,port.alive);
        },

        /**
         * 创建新的通信端口实例
         * @param callback
         */
        create:function (callback) {
            upd = dgram.createSocket('udp4');
            upd.on('error', function(err){
                upd.removeAllListeners('error');
                upd.removeAllListeners('listening');
                upd.close();
                upd=null;
                if(err.message.indexOf('bind EADDRINUSE')!==-1) port.create(callback);
            });

            upd.on('listening', function(){
                port.update();
                upd.on('message',function (msg, rinfo) {
                    msg=msg.toString();
                    dispatcher.emit.apply(dispatcher,JSON.parse(msg));
                });

                if(callback instanceof Function)callback();
            });

            port.id++;
            upd.bind(port.id);
        },
    };

    const worker={
        /**
         *队列状态
         */
        running:false,

        /**
         * 缓存
         */
        message:[],

        /**
         * 广播消息
         * @param type
         * @param data
         */
        dispatch:function (type,data) {
            dispatcher.emit(type,data);

            if(worker.message.length===128)worker.message.shift();
            if(worker.running===false){
                worker.running=true;
                worker.message.push('["'+type+'",'+JSON.stringify(data)+']');
                worker.work()
            };
        },
        work:function () {
            fs.readdir(files.bridge.port,worker.ready);
        },
        ports:undefined,
        ready:function (err,list) {
            if(err)throw err;
            worker.ports=list;
            worker.broadcast(worker.ports);
        },
        broadcast:function (list) {
            /**
             * 建立副本
             * @type {*[]}
             */
            var tasks=worker.message.splice(0,worker.message.length);
            var total=0;
            var limit=(new Date()).getTime()-port.alive-1000;
            list.forEach(function (f) {
                f=path.join(files.bridge.port,f);
                if(f!==port.file)fs.stat(f,function (err,sta) {
                    if(sta.mtimeMs>limit){
                        var p=files.file.readTxtSync(f);
                        if(p)tasks.forEach(function (d) {
                            upd.send(d,0,d.length,p);
                        });
                    }else fs.unlink(f,empty);

                    //播放完成
                    if(total===list.length)worker.complete();
                });
                total++;
            },this);
        },
        complete:function () {
            worker.message.length?worker.broadcast(worker.ports):worker.running=false;
        },
    };

    const dispatcher=module.exports=new (require('events').EventEmitter)();
    dispatcher.dispatch=function () {
        worker.dispatch.apply(worker,arguments);
    };

    // port.create(function () {
    //     dispatcher.on('abc',console.log);
    //     dispatcher.dispatch('abc',111);
    // });
})();
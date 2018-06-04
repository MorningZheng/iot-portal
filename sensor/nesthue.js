(function () {
    exports.model={
        HM1:{
            name:'门磁',
            action:{move:1,still:0},
        }
    };

    const item={};
    const value={time:{out:10*1000}};

    const report=function (iot,time) {
        iot.report.time=time;
        iot.report.done=true;
        if(iot.report.id!==-1)clearTimeout(iot.report.id);

        if(exports.hasOwnProperty('emit'))exports.emit(iot.mac, iot.type===1?'move':'still');

        //还原静止状态
        if(iot.type===1){
            iot.report.id=setTimeout(function () {
                iot.report.id=-1;
                iot.type=0;
                report(iot,(new Date).getTime());
            },value.time.out);
        }else iot=null;
    };

    /**
     * 人体探测的数据包
     * @type {{head, end}}
     */
    const sign={head:new Buffer('{'),end:new Buffer('}')};

    const fn=function (err, bytes) {
        if(err)console.log(err);
    }

    const server = require('dgram').createSocket('udp4')
        .on('error',function(error){
            console.log('Error: ' + error);
            // server.close();
        })
        .on('message',function(data,info){
            if(data.length===2)server.send('1', 0, 1, info.port, info.address, fn);
            else if(data.slice(0,1)===sign.head && data.slice(-1)===sign.end){
                data=data.toString().split(/[\{\}\>\;}\s\t\n\r]/g).reduce(function (a,b) {
                    if(/^\w\w\:\w\w\:\w\w\:\w\w\:\w\w\:\w\w\&\d/.test(b)){
                        b=b.split('&');
                        a.mac=b[0];
                        a.type=parseInt(b[1]);
                    } else if(b) a.iot.push(b.split(':'));
                    return a;
                },{iot:[]});

                //初始状态是-1
                if(item.hasOwnProperty(data.mac)===false)item[data.mac]={mac:data.mac,sensor:{RCWL0516:{state:-1,time:-1},HCSR501:{state:-1,time:-1}},type:-1,report:{time:-1,done:false,id:-1}};
                var time=(new Date()).getTime();
                var iot=item[data.mac];

                data.iot.forEach(function (i) {
                    var s=i[0],a=i[1];
                    if(iot.sensor[s].state!==a){
                        iot.sensor[s].state=a;
                        iot.sensor[s].time=time+value.time.out;
                    };
                });

                //如果两个的状态都在有效期内，且两个传感器状态都相同，则表示一次成功的探测。
                if(iot.type!==data.type && iot.sensor.RCWL0516.time>time && iot.sensor.HCSR501.time>time ){
                    iot.type=data.type;
                    report(iot,time);
                };
            };
        })
        .on('listening',function(){
            console.log('human action is listening at port' + server.address().port);
        })
        .on('close',function(){
            console.log('human action listen stopped !');
        })
        .bind(10002);
})();
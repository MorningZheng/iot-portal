(function () {
    exports.model={
        'ZC-KT320':{
            name:'电动窗帘',
            action:{open:'open',close:'close',stop:'stop'},
        },
        'ZC-SH919':{
            name:'',
            action:{open:'open',close:'close'},
        },
        'ZC-TS3':{
            name:'三控窗帘wifi开关',
            action:{open:'open',close:'close',stop:'stop'},
        },
    };

    exports.act=function (callee,trig,target) {
        // console.log({
        //     topic: '/command/'+target.id,
        //     payload: '{"cmd":"'+trig+'"}',
        //     qos: 1,
        //     retain:true
        // });
        server.publish({
            topic: '/command/'+target.id,
            payload: '{"cmd":"'+trig+'"}',
            qos: 1,
            retain:true
        });
    };

    const mosca=require('mosca');
    const server =mosca.Server({
        port: 8827,
    })
        .on('ready', function(){//当服务开启时
            console.log('zichkj server is running...');
        })
        .on('clientConnected', function(client){//监听连接
            // console.log('client connected', client.id);
        })
        .on('published', function(packet) {
            ///command/DC4F22216699

            if(exports.hasOwnProperty('emit')){
                var a=packet.topic.indexOf('/',1);
                var b=packet.topic.substr(1,a-1);
                if(b==='state')
                    exports.emit(packet.topic.substr(packet.topic.indexOf('/',a)+1),JSON.parse(packet.payload.toString('UTF-8')).cmd);
            };
        })
        .on('message', function(topic, client) {
            console.log('message : ', topic);
        })
        .on('subscribed', function(topic, client) {
            console.log('subscribed : ', topic);
        });
})();
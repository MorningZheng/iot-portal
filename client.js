(function () {
    const room=require('./lib/room');
    const system=require('./lib/system');
    const wifi=require('./lib/wifi');
    const files=require('./lib/files');
    const fs=require('fs');
    const bridge=require('./lib/bridge');

    //!important
    {
        // var client= require('mqtt').connect({
        //     host:'localhost',
        //     port:8827,
        // });
        //
        // client.publish('system',JSON.stringify({url:'http://localhost/update.zip',type:'update',timestamp:-1,version:{label:'20180430.1'}}),{qos:1,retain:true});
    }



    const roomId=room.current();
    const mqtt = require('mqtt');
    var client= mqtt.connect({
        host:system.server.url.get(),
        port:8827,
        clean:false,
        clientId:roomId
    });


    {
        const config={qos:1,retain:true};

        //监听wifi动作
        bridge.on(files.events.wifi.checkin,function (type,data) {
            client.publish(type,JSON.stringify({type:type,room:roomId,data:data}),config);
        });

        //监听房屋状态
        [files.events.action.room.someone,files.events.action.room.nobody].forEach(function (e) {
            bridge.on(e,function (type) {
                client.publish(type,JSON.stringify({type:type,room:roomId}),config);
            });
        });
    }

    //服务器响应逻辑
    {
        var timestamp={};

        client
            .subscribe('system',{qos:1})
            .subscribe(roomId,{qos:1})
            .on('message', function (topic, message) {
                try{
                    var data=JSON.parse(message.toString());
                    if(data.hasOwnProperty('timestamp')===false)return;

                    if(timestamp.hasOwnProperty(topic)===false)timestamp[topic]=files.file.readTxtSync(files.network.timestamp,topic)||-1;

                    if((timestamp[topic]<data.timestamp)===false)return;

                    // 先处理
                    if(topic==='system'){//系统消息
                        //系统升级
                        if(data.type==='update' && data.hasOwnProperty('version') && data.version.hasOwnProperty('label') && data.version.label>files.file.readTxtSync(files.system.version.label)){
                            system.update(data.url,function () {
                                //升级完成后，写入版本缓存
                                fs.writeFileSync(files.system.version.label,data.version.label);
                                // system.os.reboot();
                            });
                        };
                    }
                    else if(topic===roomId){//房间消息
                        if(data.type==='wifi.password')wifi.edit.password(data.data);
                        else if(data.type==='guest.checkin'){
                            wifi.iptables.reset();
                            //更新密码
                            if(data.password)wifi.edit.password(data.password);

                            //放行已存在的客户设备
                            if(data.mac){
                                fs.writeFileSync(files.iptables.accept_guest,data.mac);
                                system.iptables.acceptGuest(data.mac);
                            };
                        };
                    };

                    //最后再记录时间戳
                    files.file.writeTxtSync(files.network.timestamp,topic,timestamp[topic]=data.timestamp);

                    // console.log(client.nextId,client.getLastMessageId(),client.messageIdToTopic)
                }catch (_){
                    console.log(_.stack);
                };
            });
    };
})();
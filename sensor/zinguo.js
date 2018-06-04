(function () {
    const net = require('net');

    // exports.sku='M2;';
    exports.model={
        'M2':{
            name:'门磁',
            action:{open:1,close:0},
        },
    };

    //引入之后，记得设定emit;emit是单一的static，过程式编程
    net.createServer(function(sk) {
        console.log('CONNECTED: ' + sk.remoteAddress + ':' + sk.remotePort +'\r\n');

        sk.on('data', function(data) {
            if(data.length===26){
                var req=data.toString('hex');
                if(exports.hasOwnProperty('emit'))
                    exports.emit(req[0]+req[1]+':'+req[2]+req[3]+':'+req[4]+req[5]+':'+req[6]+req[7]+':'+req[8]+req[9]+':'+req[10]+req[11],data[20]===0?'close':'open');
            };
        });
    }).listen(10001);
})();
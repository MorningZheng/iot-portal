(function () {
    const fs=require('fs');
    const files=require('./lib/files');
    const alasql=require('alasql');

    //定义一个数据库
    const db = new alasql.Database('nestHue');
    {
        db.exec('CREATE TABLE iot(id,tags,type,action)');
        db.exec('CREATE TABLE lib(name,type,alias,lib,action)');

        alasql.fn.find = function(raw/*,key*/) {
            if(alasql.fn.find.work){
                if(raw){
                    var key=Array.prototype.slice.call(arguments,1);
                    return key.every(function (k) {
                        return Array.prototype.some.call(raw,function (r) {
                            return k===r;
                        });
                    });
                }else return false;
            }else return true;
        };
        alasql.fn.find.work=true;

        alasql.fn.link=function () {
            return arguments;
        };

        alasql.fn.own=function (col,key) {
            return col.hasOwnProperty(key);
        };
    };

    //读取预置设备配置
    (function () {
        var parser={
            action:function (str) {
                var _={};
                if(str){
                    str.split(';').forEach(function (act) {
                        act=act.trim();
                        if(act){
                            var a=act.indexOf('>');
                            var b=act.lastIndexOf(':');

                            var c=act.substr(0,a);
                            _[c]={gpio:c,trig:act.substr(b+1),sql:act.substr(a+1,b-a-1)};
                        };
                    });
                };
                return _;
            },
            tag:function (txt) {
                return txt.split(/[;,|；，\s\t]/).reduce(function (a,t) {
                    if(t)a.push(t);
                    return a;
                },[]).join(';');
            },
        };

        var _=files.file.readTxtSync(files.sensor.map);
        _=_===''?{}:JSON.parse(_);

        for(var i in _){
            db.tables.iot.data.push({id:_[i].id,type:_[i].type,tags:parser.tag(_[i].tag),action:parser.action(_[i].link)});
        };

        delete parser.action;
        delete parser.tag;
        parser=null;
    })();

    //动态加载设备支持库
    const libs='./sensor/';
    {
        fs.readdir(libs,function (err,list) {

            if(!err) list.forEach(function (l) {
                var a=l.substr(0,l.indexOf('.'));
                var lib=require(libs+a);
                lib.emit=receiver;

                Object.keys(lib.model).forEach(function (m) {
                    db.tables.lib.data.push({name:a,type:m,alias:lib.model[m].name,lib:lib,action:lib.model[m].action});
                });
            });

            // receiver('1','move');
            // receiver('3','close');
            // receiver('0','shutdown');
        });
    };

    /**
     * 设备有两个信道，一个state，一个command。state会通过会上到这个层面，用lib.act下发command命令
     * @param id 设备ID
     * @param act 设备动作
     */
    const receiver=function (id,act) {
        db.exec('SELECT * FROM iot WHERE id="'+id+'" AND own(action,"'+act+'")').forEach(function (i) {
            alasql.fn.find.work=false;
            //寻找关联的操作
            var iot=db.exec('SELECT *,link(iot.tags,alias)AS tag FROM iot JOIN lib ON lib.type=iot.type WHERE own(lib.action,"'+i.action[act].trig+'") AND '+i.action[act].sql);

            //执行操作
            if(iot.length){
                alasql.fn.find.work=true;
                db.exec('SELECT * FROM ? WHERE '+i.action[act].sql,[iot]).forEach(function (t) {
                    t.lib.act(i,i.action[act].trig,t);
                });
                iot.length=0;
            };
        });
    };

    //强制GC
    try{
        ''['fs']();
    }catch (_){};
})();
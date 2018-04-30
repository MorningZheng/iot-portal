const fs=require('fs');
const files=require('./files');

if(fs.existsSync('./config')===false)fs.mkdirSync('./config');
const proxy={
    room:require('./room'),
    system:require('./system'),
    wifi:require('./wifi'),
    // action:require('../action')
};

const api=(function () {
    var $=function (_,h) {
        Object.keys(_).forEach(function (k) {
            var m=(h==='.'?'':h)+k;
            if(_[k] instanceof Function){
                var s=_[k].toString();
                var a=s.indexOf('(');
                var b=s.indexOf(')',a);
                a++;
                cache.push({name:m,args:s.substr(a,b-a)});
            } else if(_[k] instanceof Object)$(_[k],m+'.');
        });
    };

    var cache;
    return function () {
        cache=[];
        $(proxy,".");
        try{
            return cache;
        }finally{
            cache=null;
        };
    };
})();
module.exports=function (name,args) {
    if(name==='api')return api();
    else{
        var $=proxy;
        name.split('.').some(function (n) {
            if($.hasOwnProperty(n)) $=$[n];
            else return true;
        });

        if($ instanceof Function){
            try{
                return $.apply(null,args);
            }catch (_){
                return _.stack;
            };
        }else return 'Can not find method.';
    };
};
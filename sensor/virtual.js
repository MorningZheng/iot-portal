exports.model={
    center:{
        name:'中控',
        action:{shutdown:0,welcome:1,closed:0,opened:1,moved:1},
    },
};

var id=-1;
var move={
   time:new Date(),
   total:0,
};

const handler={
    moved:function (callee,trig,target) {
        var t=new Date();

        if(t-move.time>10000){
            move.total++;
            if(move.total===3){
                clearTimeout(id);
            };
        };
    },
    closed:function (callee,trig,target) {
        move.total=0;
        id=setTimeout(function () {
            console.log('no body');
            exports.emit(target.id,'shutdown');
        },1000);
    },
    opened:function (callee,trig,target) {
        id=setTimeout(function () {
            console.log('door open too long');
        },1000);
    },
}

exports.act=function (callee,trig,target) {
    if(handler.hasOwnProperty(trig))handler[trig].apply(handler,arguments);
};
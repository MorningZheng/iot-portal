exports.model={
    'HY86-16A':{
        name:'16A;插座',
        action:{open:1,close:0},
    }
};

exports.act=function (id,type,act) {
    console.log(id,act);
};
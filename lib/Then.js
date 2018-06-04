const join=(function () {
    const func=function (a) {
        if(a instanceof Function)this._tasks.push(a);
        else if(a instanceof Array)join.call(this,a);
    };

    return function (args) {
        Array.prototype.forEach.call(args,func,this);
    };
})();

module.exports=function (/**/tasks) {
    this._tasks=[];
    join.call(this,arguments);
};
module.exports.prototype={
    _tasks:null,
    _index:-1,
    add:function (task) {
        this._tasks.push(task);
    },
    push:function () {
        this.add.apply(this,arguments);
    },
    start:function () {
        this._index=-1;
        this.over.apply(this,arguments);
    },
    over:function () {
        this._index++;
        this._index<this._tasks.length?this._tasks[this._index].apply(this,arguments):console.log('All task done.');
    },
    next:function () {
        this.over.apply(this,arguments);
    },
    destroy:function () {
        this._tasks.length=0;
        this._index=-1;
        this._tasks=null;
    },
}
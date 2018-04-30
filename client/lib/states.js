module.exports={
    door:{
        _open:undefined,
        set open(value){
            if(value!==this._open){
                this._open=value;
            };
        },
        get open(){
            return this._open;
        }
    }
};
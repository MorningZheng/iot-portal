const layer=require('./layer');
const files=require('./files');
const fs=require('fs');

var $this=module.exports={
    edit:{
        name:function (value) {
            return $this.edit.id(layer.md5(value).substr(8,16).toUpperCase());
        },
        id:function (value) {
            fs.writeFileSync(files.room.id,value);
            return value;
        },
    },
    current:function () {
        return fs.readFileSync(files.room.id).toString();
    },
};
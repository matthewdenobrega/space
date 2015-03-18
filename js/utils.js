if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */) {
        "use strict";
        if (this === void 0 || this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n !== n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    }
}

var UTILS = ( function () {

    var my = {};

    //Private variables
    var waveAmplitude = 1.7;

    //General utility functions
    my.linearInterpolate = function (start, finish, step, steps) {
        return start + (step / steps) * (finish - start);
    };

    my.naturalInterpolate = function (start, finish, step, steps) {
        return start + (finish - start) * Math.atan(5 * step / steps) / (Math.PI / 2) + (finish - start) * UTILS.linearInterpolate(0, Math.PI / 2 - Math.atan(8), step, steps);
    };

    my.arctanInterpolate = function (start, finish, step, steps) {
        var x = 10 * (step / steps) - 5;
        var range = ( finish - start ) / Math.PI;
        return range * ( Math.atan(x) + Math.PI / 2 ) + start + UTILS.linearInterpolate(-range / 5.1, range / 5.1, step, steps);
    };

    my.bumpInterpolate = function (max, start, step, steps) {
        var alpha = max - start;
        var x = step / steps;
        return alpha * Math.exp(-8 * ( x - 0.5 ) * ( x - 0.5 )) - alpha * Math.exp(-8 * ( 0.5 ) * ( 0.5 ));
    };

    my.waveInterpolate = function (max, start, distance, step, steps) {
        var alpha = waveAmplitude * ( max - start );
        var x = step / steps;
        var variance = 0.005;

        return alpha * Math.exp(-1 * Math.pow(x - 0.4 - distance / 370, 2) / variance);
    };

    my.findDistance = function (xyAngle1, xyAngle2) {
        var xDist = xyAngle2[0] - xyAngle1[0];
        var yDist = xyAngle2[1] - xyAngle1[1];
        return Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2))
    };

    my.zeroArray = function (array) {
        for (var i = 0; i < array.length; i++) {
            array[i] = 0;
        }
    };

    my.copyObject = function (object) {
        var ret = {};
        for (var i in object) {
            ret[i] = object[i];
        }
        return ret;
    };

    my.copyArray = function(array) {
        var ret = [];
        for(var i=0; i<array.length; i++) {
            ret.push(array[i]);
        }

        return ret;
    };

    my.isEmpty = function(obj) {
        return Object.keys(obj).length === 0;
    };

    my.replaceItem = function (item, list) {
        for (var i = 0; i < list.length; i++) {
            if (list[i]._id == item._id) {
                list[i] = item;
                return;
            }
        }
    };

    my.findOneByKeyAndValue = function (list, key, value) {
        if(!list || !list.length) return;

        for (var i = 0; i < list.length; i++) {
            if (list[i][key] == value) return list[i];
        }
    };

    my.anyInCommon = function(list1, list2) {
        for( var i=0; i<list1.length; i++) {
            for(var j=0; j<list2.length; j++) {
                if (list1[i] == list2[j]) return true;
            }
        }

        return false;
    };

    my.any = function(list) {
        for (var i=0; i<list.length; i++) {
            if(list[i]) return true;
        }

        return false;
    };

    my.anyInObject = function(object) {
        for (var i in object) {
            if(object.hasOwnProperty(i)) {
                if(object[i]) return true;
            }
        }

        return false;
    };

    my.truncate = function (string, length) {
        if (string.length < length) {
            return string;
        }
        return string.substring(0, length) + "...";
    };

    my.strip = function(html)
    {
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent||tmp.innerText;
    };

    //Site-specific utility functions
    my.getItemShareIdentifier = function(item) {
        return item.position ? 'nodeId' : 'tipId'
    };

    return my;

}());
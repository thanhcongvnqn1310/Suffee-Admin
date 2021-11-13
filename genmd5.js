var md5 = require("md5")

function randStr(len) {
	let s = '';
	while (s.length < len) s += Math.random().toString(36).substr(2, len - s.length)
	return s
}

var salt = randStr(6)
var dbhash = salt + md5("123456" + salt)
console.log(dbhash)
console.log("Salt: " + dbhash.substring(0,6))
console.log("Hash: " + dbhash.substring(6))
// console.log(Date.now())
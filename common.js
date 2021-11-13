var fs = require("fs").promises
var MongoClient = require("mongodb").MongoClient

class Common {

	_dbo = null

	constructor() {
		var self = this
		MongoClient.connect("mongodb://localhost:27017/", {useUnifiedTopology: true}, function(err, client) {
			if (err) throw err
			self._dbo = client.db("nguyenthanhcong") // select the database
			console.log("DB connected!")
		})
	}

	getDb() {
		return this._dbo;
	}

	randStr(len) {
		let s = '';
		while (s.length < len) s += Math.random().toString(36).substr(2, len - s.length)
		return s
	}
	
	async render(res) {
		var html = await fs.readFile(res.viewpath, 'utf8')
		var re = /<~(.+?)~>/g;
		var m;

		do {
			m = re.exec(html);
			if (m) {
				var section = await fs.readFile('./views/sections/' + m[1], 'utf8')
				html = html.substring(0, m.index) + section + html.substring(m.index + m[0].length)
			}
		} while (m);

		const keys = Object.keys(res.parts)
		keys.forEach(function(item) {
			html = html.replace("{" + item + "}", res.parts[item])
		})
		res.send(html)
	}
}

module.exports = new Common()
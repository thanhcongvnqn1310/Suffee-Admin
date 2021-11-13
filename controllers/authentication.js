var md5 = require("md5")
var fs = require("fs").promises
var multer = require("multer")// Handling multipart/form-data, which is primarily used for uploading files
var express = require("express")
var router = express.Router()
var ObjectId = require("mongodb").ObjectID
var common = require("../common")
var upload = multer({ dest: 'uploads/' })
const sharp = require('sharp') // Convert large images in common formats to smaller, web-friendly JPEG, PNG and WebP images of varying dimensions.

router.get("/signin", function (req, res) {
	(async function () {
		let p = { usr_value: "", usr_err: "Username", pwd_err: "Password" }
		res.parts = { ...res.parts, ...p }
		res.viewpath = './views/signin.html'
		await common.render(res)
	})()
})

router.post("/signin", function (req, res) {	
	(async function () {
		let p = { usr_value: req.body.u, usr_err: "Username", pwd_err: "Password" }
		var query = { "username": req.body.u }
		var send_html = true, result = null
		try {
			result = await common.getDb().collection("users").findOne(query)
		} catch (err) {
			console.log("error")
		}
		if (result == null) {
			p["usr_err"] = "<span style='color:red'>Username not found</span>"
		} else {
			var dbhash = result["password"]
			var salt = dbhash.substring(0, 6)
			dbhash = dbhash.substring(6)
			var usrhash = md5(req.body.p + salt)
			if (dbhash == usrhash) {
				res.cookie('login', result["_id"], { maxAge: 3600000 })
				if (result["role"] === 1) {
					res.redirect(302, '/admin')
				}
				if (result["role"] === 9) {
					res.redirect(302, '/schedule_list')
				}

				send_html = false
			} else {
				p["pwd_err"] = "<span style='color:red'>Password not correct</span>"
			}
		}
		if (send_html) {
			res.parts = { ...res.parts, ...p }
			res.viewpath = './views/signin.html'
			await common.render(res)
		}
	})()
})

router.get("/profile", function (req, res) {
	(async function () {
		let success = true
		var objUser
		if (req.user == undefined) {
			res.send("Cannot get user data!")
			return;
		} else {
			objUser = req.user
		}

		let p = { msg_style: "display:none;", userId: objUser["_id"], usr_value: objUser.username, email_value: objUser.email, usr_err: "Username must be from 4 - 32 characters", pwd_err: "Password must be 6 - 32 characters" }
		res.parts = { ...res.parts, ...p }

		res.viewpath = './views/profile.html'

		await common.render(res)
	})()
})

router.post("/profile", upload.single('profile-pic'), function (req, res) {
	(async function () {
		let success = true
		var uid = req.cookies["login"]
		var oid = new ObjectId(uid)
		var query = { "_id": oid }
		objUser = null
		try {
			objUser = await common.getDb().collection("users").findOne(query)
		} catch (err) {
			console.log("error")
		}
		if (objUser == null) {
			res.send("User with id '" + uid + "' cannot be found!")
			return;
		}

		let parts = { msg_style: "display:none;", msg: "You successfully updated your profile", userId: uid, usr_value: req.body.username, email_value: req.body.email, usr_err: "Username must be from 4 - 32 characters", pwd_err: "Password must be 6 - 32 characters" }

		if (req.file != undefined) {
			var filename = objUser["username"] + ".jpg"
			await sharp(req.file.path)
				.resize(100, 100) // (width, height)
				.jpeg({ quality: 100, progressive: true })
				.toFile('public/profile_pics/' + filename)
			fs.unlink(req.file.path)// Remove a file or symbolic link from the filesystem
			objUser["avatar"] = 'profile_pics/' + filename
		}

		if (req.body.username.length < 4 || req.body.username.length > 32) {
			parts["usr_err"] = "<span style='color:red'>Username length is not valid</span>"
			success = false
		} else {
			var query = { "_id": { $ne: oid }, username: req.body.username }
			result = null
			try {
				result = await common.getDb().collection("users").findOne(query)
			} catch (err) {
				console.log("error")
			}
			if (result != null) {
				parts["usr_err"] = "<span style='color:red'>Username '" + req.body.username + "' has been used already</span>"
				success = false
			}
		}
		objUser["username"] = req.body.username
		objUser["email"] = req.body.email
		if (req.body["password"] != "") {
			if (req.body["password"].length < 6 || req.body["password"].length > 32) {
				parts["pwd_err"] = "<span style='color:red'>Password length is not valid</span>"
				success = false
			} else {
				let salt = common.randStr(6)
				let dbhash = salt + md5(req.body["password"] + salt)
				objUser["password"] = dbhash
				parts["msg"] = "You successfully updated your profile and password"
			}
		}

		if (success) {
			var query = { "_id": oid }
			try {
				const result = await common.getDb().collection("users").updateOne(query, { $set: objUser })
				parts["msg_style"] = ""
			} catch (err) {
				console.log(err)
				res.send("500 error updating db")
				return;
			}
		}

		res.parts = { ...res.parts, ...parts }
		res.viewpath = './views/profile.html'
		await common.render(res)
	})()
})

router.get("/signout", function (req, res) {
	res.clearCookie('login')
	res.redirect(302, "/signin")
})

module.exports = router
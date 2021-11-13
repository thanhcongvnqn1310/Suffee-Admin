var express = require("express")
var router = express.Router()
var multer = require("multer")
const sharp = require('sharp')
var fs = require("fs").promises
var ObjectId = require("mongodb").ObjectID
var common = require("../common")
var upload = multer({ dest: 'uploads/' })

router.get("/schedule_list", function (req, res) {
    (async function () {
        let tbtext = "";
        const result = await common.getDb().collection("schedules").find().toArray()
        let stt = 1
        result.forEach(function (schedule) {
            let regDate = new Date(schedule["date_created"])
            let strRegTime = regDate.getHours() + ":" + regDate.getMinutes() + ", "
                + regDate.getDate() + "/" + (regDate.getMonth() + 1) + "/" + regDate.getFullYear()
            tbtext = tbtext + "<tr><th scope=\"row\">" + stt + "</th>"
                + "<td>" + schedule["teacherName"] + "</td>"
                + "<td>" + schedule["class"] + "</td>"
                + "<td>" + schedule["room"] + "</td>"
                + "<td>" + schedule["time"] + "</td>"
                + "<td>" + schedule["date"] + "</td>"
                + "<td>" + strRegTime + "</td>"
                + "<td><a href=\"/schedule_edit_" + schedule["_id"] + "\">Edit</a></td><td><a href=\"javascript:confirmDelete('" + schedule["_id"] + "')\">Delete</a></td>"
                + "</tr>"
            stt++
        })
        let parts = { tb: tbtext }
        res.parts = { ...res.parts, ...parts }
        res.viewpath = './views/schedule_list.html'
        await common.render(res)
    })()
})

router.get("/schedule_create", function (req, res) {
    (async function () {
        if (req.user.role == 1) {
            let parts = { msg_style: "display:none;", tchName_value: "", cls_value: "", rm_value: "", time_value: "", date_value: "", tchName_err: "Teacher name must be from 4 - 32 characters" }
            res.parts = { ...res.parts, ...parts }
            res.viewpath = './views/schedule_create.html'
            await common.render(res)
        } else {
            res.viewpath = './views/forbidden.html'
            await common.render(res)
        }
    })()
})

router.post("/schedule_create", function (req, res) {
    (async function () {
        let success = true
        let parts = {
            msg_style: "display:none;", tchName_value: req.body.teacherName, cls_value: req.body.class, rm_value: req.body.room,
            time_value: req.body.time, date_value: req.body.date, tchName_err: "Teacher name must be from 4 - 32 characters" }
        var send_html = true, result = null
        if (req.body.teacherName.length < 4 || req.body.teacherName.length > 32) {
            parts["tchName_err"] = "<span style='color:red'>Teacher name length is not valid</span>"
            success = false
        }
        if (success) {
            let sch_obj = {
                "teacherName": req.body.teacherName, "class": req.body.class, "room": req.body.room,
                "time": req.body.time, "date": req.body.date, date_created: Date.now()
            }
            try {
                const result = await common.getDb().collection("schedules").insertOne(sch_obj)
                parts["msg_style"] = ""
            } catch (err) {
                console.log(err)
                res.send("500 error inserting to db")
                send_html = false
            }
        }
        if (send_html) {
            res.parts = { ...res.parts, ...parts }
            res.viewpath = './views/schedule_create.html'
            await common.render(res)
        }
    })()
})
router.get("/schedule_edit_:scheduleId", function (req, res) {
    (async function () {
        if (req.user.role == 1) {
            var oid = new ObjectId(req.params["scheduleId"])
            var query = { "_id": oid }
            result = null
            try {
                result = await common.getDb().collection("schedules").findOne(query)
            } catch (err) {
                console.log("error")
            }
            if (result == null) {
                res.send("Schedule with id '" + req.params["scheduleId"] + "' cannot be found!")
                return;
            }
            let parts = {
                msg_style: "display:none;", scheduleId: req.params["scheduleId"], tchName_value: result["teacherName"], cls_value: result["class"], rm_value: result["room"], date_value: result["date"],
                time_value: result["time"], tchName_err: "Teacher name must be from 4 - 32 characters"
            }
            res.parts = { ...res.parts, ...parts }
            res.viewpath = './views/schedule_edit.html'
            await common.render(res)
        } else {
            res.viewpath = './views/forbidden.html'
            await common.render(res)
        }
    })()
})

router.post("/schedule_edit_:scheduleId", function (req, res) {
    (async function () {
        let success = true
        var oid = new ObjectId(req.params["scheduleId"])
        var query = { "_id": oid }
        objschedule = null
        try {
            objschedule = await common.getDb().collection("schedules").findOne(query)
        } catch (err) {
            console.log("error")
        }
        if (objschedule == null) {
            res.send("Schedule with id '" + req.params["scheduleId"] + "' cannot be found!")
            return;
        }

        let parts = {
            msg_style: "display:none;", scheduleId: req.params["scheduleId"], tchName_value: req.body.teacherName, cls_value: req.body.class, rm_value: req.body.room,
            date_value: req.body.date, time_value: req.body.time, tchName_err: "Teacher name must be from 4 - 32 characters"
        }

        if (req.body.teacherName.length < 4 || req.body.teacherName.length > 32) {
            parts["tchName_err"] = "<span style='color:red'>Teacher name length is not valid</span>"
            success = false
        } else {
            var query = { "_id": { $ne: oid }, tchName: req.body.teacherName }
            result = null
            try {
                result = await common.getDb().collection("schedules").findOne(query)
            } catch (err) {
                console.log("error")
            }
            if (result != null) {
                parts["tchName_err"] = "<span style='color:red'>Teacher name '" + req.body.teacherName + "' has been used already</span>"
                success = false
            }
        }
        objschedule["teacherName"] = req.body.teacherName
        objschedule["class"] = req.body.class
        objschedule["room"] = req.body.room
        objschedule["date"] = req.body.date
        objschedule["time"] = req.body.time


        if (success) {
            var query = { "_id": oid }
            try {
                const result = await common.getDb().collection("schedules").updateOne(query, { $set: objschedule })
                parts["msg_style"] = ""
            } catch (err) {
                console.log(err)
                res.send("500 error updating db")
                return;
            }
        }

        res.parts = { ...res.parts, ...parts }
        res.viewpath = './views/schedule_edit.html'
        await common.render(res)
    })()
})

router.get("/schedule_delete_:scheduleId", function (req, res) {
    (async function () {
        if (req.user.role == 1) {
            var oid = new ObjectId(req.params["scheduleId"])
            var query = { "_id": oid }
            result = null
            try {
                result = await common.getDb().collection("schedules").deleteOne(query)
            } catch (err) {
                res.send("database error")
                return;
            }
            res.redirect(302, "/schedule_list")
        } else {
            res.viewpath = './views/forbidden.html'
            await common.render(res)
        }
    })()
})

module.exports = router
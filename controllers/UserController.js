var UserModel = require('../models/UserModel.js'),
    FIREBASE = require('../firebase'),
    FriendModel = require('../models/FriendModel.js'),
    UserModel = require("../models/UserModel");

module.exports = {

    suggestion: function(req, res) {
        if (req.error) {
            return res.status(403).json(req.error);
        }
        var myId = req["me"]["__id"],
            self = this;
        FriendModel.find({ "user1": { "$ne": myId }, "user2": { "$ne": myId } }).select("user1 user2").limit(5).exec(function(err, data) {
            if (!err) {
                if (data.length > 0) {
                    var ids = [];
                    for (var i = 0; i < data.length; i++) {
                        ids.push(data[i].user1);
                        ids.push(data[i].user2);
                    }
                    self._list(req, res, { "$in": ids });
                } else {
                    self._list(req, res, { "$ne": myId });
                }
            } else {
                return res.json({ status: false, result: [] });
            }
        });
    },
    locationSearch: function(req, res) {
        if (req.error) {
            return res.status(403).json(req.error);
        }
        var page = req.query.page ? req.query.page - 1 : 0,
            limit = req.query.limit ? req.query.limit : 5,
            skip = page * limit;

        var location = res.query.lat && res.query.long ? [res.query.long, res.query.lat] : res["me"].currentLocation.coordinates;
        res.query.minDis = res.query.minDis ? res.query.minDis : 10;
        res.query.maxDis = res.query.maxDis ? res.query.maxDis : 1000;
        var q = { "currentLocation": { "$near": { "$geometry": { "type": "Point", "coordinates":location }, "$minDistance": res.query.minDis, "$maxDistance": res.query.maxDis } } }
        UserModel.find(q).skip(Number(skip)).limit(Number(limit)).exec(function(err,nearUsers) {
            if(err){
                return res.status(500).json({
                    status: false,
                    message: 'Error when getting users.',
                    error: err
                });
            }
            return res.json({ status: true, result: nearUsers });
        })
    },
    _list: function(req, res, ids) {
        var select = "_id name photoURL email gender";
        UserModel.find({ "_id": ids }).select(select).limit(10).exec(function(err, suggestion) {
            if (err) {
                return res.status(500).json({
                    status: false,
                    message: 'Error when getting suggestion.',
                    error: err
                });
            }
            return res.json({ status: true, result: suggestion });
        });
    },
    show: function(req, res) {
        if (req.error) {
            return res.status(403).json(req.error);
        }
        var id = req.params.id;
        if (id == "me") {
            id = req["me"]["__id"];
        }
        UserModel.findOne({ _id: id }).populate({ path: 'cover', select: "_id name size url type" }).exec(function(err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting User.',
                    error: err
                });
            }
            if (!User) {
                return res.status(404).json({
                    message: 'No such User'
                });
            }
            return res.json(User);
        });
    },

    create: function(req, res) {
        var User = new UserModel(req.body);

        User.save(function(err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating User',
                    error: err
                });
            }
            return res.status(201).json(User);
        });
    },

    _update: function(req, res, User) {
        User.dob = req.body.dob ? req.body.dob : User.dob;
        User.name = req.body.name ? req.body.name : User.name;
        User.bio = req.body.bio ? req.body.bio : User.bio;
        User.photoURL = req.body.photoURL ? req.body.photoURL : User.photoURL;
        User.uid = req.body.uid ? req.body.uid : User.uid;
        User.phone = req.body.phone ? req.body.phone : User.phone;
        User.email = req.body.email ? req.body.email : User.email;
        User.address1 = req.body.address1 ? req.body.address1 : User.address1;
        User.city = req.body.city ? req.body.city : User.city;
        User.state = req.body.state ? req.body.state : User.state;
        User.country = req.body.country ? req.body.country : User.country;
        User.pincode = req.body.pincode ? req.body.pincode : User.pincode;
        User.cover = req.body.cover ? req.body.cover : User.cover;
        User.gender = req.body.gender ? req.body.gender : User.gender;
        User.hobbies = req.body.hobbies ? req.body.hobbies : User.hobbies;
        User.currentLocation = req.body.currentLocation ? req.body.currentLocation : User.currentLocation;
        User.regid = req.body.regid || req.body.regid == "" ? req.body.regid : User.regid;

        User.save(function(err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when updating User.',
                    error: err
                });
            }

            return res.json(User);
        });
    },

    remove: function(req, res) {
        if (req.error) {
            return res.status(403).json(req.error);
        }
        var id = req.params.id;
        UserModel.findByIdAndRemove(id, function(err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the User.',
                    error: err
                });
            }
            return res.status(204).json();
        });
    },
    getByUidFromFirebase: function(req, res) {
        if (req.error) {
            res.status(403).json(req.error);
            return;
        }
        FIREBASE.getByUidFromFirebase(req.params.uid, function() {

        });
    },
    sendPushNotification: function(req, res) {
        FIREBASE.getByUidFromLocal(req, function(rs) {
            if (rs.status && rs.result.regid != '') {
                req.body["to"] = rs.result.regid;
                delete req.body["uid"];
                req.body['notification']["icon"] = "/firebase-logo.png";
                req.body['notification']["click_action"] = "http://localhost/html/FCM/web/social-login/";
                console.log(req.body);
                FIREBASE.sendNotification(req.body, function(body) {
                    res.status(200).json(body);
                });
            } else {
                if (rs.result.regid == '') {
                    var dd = req["me"].name + " Not Loggedin Any Device"
                    rs = { status: false, message: dd };
                }
                res.status(200).json(rs);
            }
        }, req.body["uid"]);
    },
    saveOrUpdate: function(req, res) {
        var self = this;
        FIREBASE.getByUidFromLocal(req, function(rs) {
            if (rs.status) {
                self._update(req, res, rs.result);
            } else {
                self.create(req, res);
            }
        }, req.body["uid"], req.body["email"]);
    }
};

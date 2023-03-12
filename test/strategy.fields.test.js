/* global describe, it, expect, before */
/* jshint expr: true */

var chai = require('chai')
    , Strategy = require('../lib/strategy')
    , bcupFile = require('./buttercup-file')
    , uuid = require('uuid');


describe('Strategy', function() {
    var filePath = "/tmp/" + uuid.v4() + ".bcup";
    var masterPassword = "masterPassword!";

    before((done) => {
        bcupFile.createBcupFile(filePath, masterPassword, undefined)
            .then((success) => {
                done();
            });

    });

    after(function(done) {
        bcupFile.removeBcupFile(filePath);
        done();
    });

    describe('handling a request with valid credentials in body using custom field names', function() {
        var strategy = new Strategy({ usernameField: 'userid',
                                      passwordField: 'passwd',
                                      filename: filePath,
                                      groupName: "General",
                                      masterPassword: masterPassword},
        function(profile, done) {
            if (profile.buttercup.username == 'user01') {
                return done(null, { id: '1234' }, { scope: 'read' });
            }
            return done(null, false);
        });

        var user
            , info;

        before(function(done) {
            chai.passport(strategy)
                    .success(function(u, i) {
                        user = u;
                        info = i;
                        done();
                    })
                    .req(function(req) {
                        req.body = {};
                        req.body.userid = 'user01';
                        req.body.passwd = 'user01pass';
                    })
                    .authenticate();
        });

        it('should supply user', function() {
            expect(user).to.be.an.object;
            expect(user.id).to.equal('1234');
        });

        it('should supply info', function() {
            expect(info).to.be.an.object;
            expect(info.scope).to.equal('read');
        });
    });


    describe('handling a request with valid credentials in body using custom field names with object notation', function() {
        var strategy = new Strategy({ usernameField: 'user[username]',
                                      passwordField: 'user[password]',
                                      filename: filePath,
                                      groupName: "General",
                                      masterPassword: masterPassword},
        function(profile, done) {
            if (profile.buttercup.username == 'user01') {
                return done(null, { id: '1234' }, { scope: 'read' });
            }
            return done(null, false);
        });

    var user
      , info;

    before(function(done) {
        chai.passport(strategy)
            .success(function(u, i) {
                user = u;
                info = i;
                done();
            })
            .req(function(req) {
                req.body = {};
                req.body.user = {};
                req.body.user.username = 'user01';
                req.body.user.password = 'user01pass';
            })
            .authenticate();
    });

    it('should supply user', function() {
      expect(user).to.be.an.object;
      expect(user.id).to.equal('1234');
    });

    it('should supply info', function() {
      expect(info).to.be.an.object;
      expect(info.scope).to.equal('read');
    });
  });
});

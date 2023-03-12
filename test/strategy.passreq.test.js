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

    describe('passing request to verify callback', function() {
        var strategy = new Strategy({ filename: filePath,
                                      groupName: "General",
                                      masterPassword: masterPassword,
                                      passReqToCallback: true},
        function(req, profile, done) {
            if (profile.buttercup.username == 'user01') {
                return done(null, { id: '1234' }, { scope: 'read', foo: req.headers['x-foo'] });
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
                    req.headers['x-foo'] = 'hello';

                    req.body = {};
                    req.body.username = 'user01';
                    req.body.password = 'user01pass';
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

        it('should supply request header in info', function() {
            expect(info.foo).to.equal('hello');
        });
    });
});

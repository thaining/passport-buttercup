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

    describe('handling a request with valid credentials in body', function() {
        var strategy = new Strategy({ filename: filePath,
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
    });

    describe('handling a request with valid credentials in query', function() {
        var strategy = new Strategy({ filename: filePath,
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
                    req.query = {};
                    req.query.username = 'user01';
                    req.query.password = 'user01pass';
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

    describe('handling a request with valid credentials and extra data', function() {
        var filePath = "/tmp/" + uuid.v4() + ".bcup";
        var masterPassword = "masterPassword!";

        var buttercupProperties = {
            "db_reader": "boolean",
            "db_writer": "boolean",
            "count": "number",
            "data_string": "string",
            "data_object": "JSON",
            "data_string2": "string"
        };

        var strategy = new Strategy({ filename: filePath,
                                      groupName: "General",
                                      masterPassword: masterPassword,
                                      propertyDictObject: buttercupProperties},
        function(profile, done) {
            if (profile.buttercup.username == 'user01') {
                return done(null, {id: "1234"}, profile.buttercup);
            }
            return done(null, false);
        });

        var extraData = {
            "db_reader": "true",
            "db_writer": "false",
            "count": "2",
            "data_string": "\"this is a test\"",
            "data_object": '{"name1": "value1", "name2": 2}',
            "data_string2": "this is another test"
        };

        var user
        , info;

        before(function(done) {
            bcupFile.createBcupFile(filePath, masterPassword, extraData)
                .then((success) => {
                    chai.passport(strategy)
                        .success(function(u, i) {
                            user = u;
                            info = i;
                            done();
                        })
                        .req(function(req) {
                            req.query = {};
                            req.query.username = 'user01';
                            req.query.password = 'user01pass';
                        })
                        .authenticate();
                });
        });

        after(function(done) {
            bcupFile.removeBcupFile(filePath);
            done();
        });

        it('should supply user', function() {
            expect(user).to.be.an.object;
            expect(user.id).to.equal("1234");
        });

        it('should supply info', function() {
            expect(info).to.be.an.object;
            expect(info.db_reader).to.equal(true);
            expect(info.db_writer).to.equal(false);
            expect(info.count).to.equal(2);
            expect(info.data_string).to.equal("this is a test");
            expect(info.data_object.name1).to.equal("value1");
            expect(info.data_object.name2).to.equal(2);
            expect(info.username).to.equal("user01");
        });
    });

    describe('handling a request that fails master password authentication', function() {
        var strategy = new Strategy({ filename: filePath,
                                      groupName: "General",
                                      masterPassword: "notMasterPassword"},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .req(function(req) {
                    req.body = {};
                    req.body.username = 'user01';
                    req.body.password = 'user01pass';
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message.startsWith('Error opening ' + filePath)).to.be.true;
            expect(status).to.equal(500);
        });
    });

    describe('handling a request that fails user authentication', function() {
        var strategy = new Strategy({ filename: filePath,
                                      groupName: "General",
                                      masterPassword: masterPassword},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .req(function(req) {
                    req.body = {};
                    req.body.username = 'user01';
                    req.body.password = 'user01notpass';
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message).to.equal('Authentication failure');
            expect(status).to.equal(401);
        });
    });

    describe('handling a request that has valid credentials in the wrong group', function() {
        var strategy = new Strategy({ filename: filePath,
                                      groupName: "notGeneral",
                                      masterPassword: masterPassword},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .req(function(req) {
                    req.body = {};
                    req.body.username = 'user01';
                    req.body.password = 'user01pass';
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message).to.equal('Authentication failure');
            expect(status).to.equal(401);
        });
    });

    describe('handling a request without a body', function() {
        var strategy = new Strategy({testWithoutFile: true},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message).to.equal('Missing credentials');
            expect(status).to.equal(400);
        });
    });

    describe('handling a request without a body, but no username and password', function() {
        var strategy = new Strategy({testWithoutFile: true},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .req(function(req) {
                    req.body = {};
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message).to.equal('Missing credentials');
            expect(status).to.equal(400);
        });
    });

    describe('handling a request without a body, but no password', function() {
        var strategy = new Strategy({testWithoutFile: true},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .req(function(req) {
                    req.body = {};
                    req.body.username = 'johndoe';
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message).to.equal('Missing credentials');
            expect(status).to.equal(400);
        });
    });

    describe('handling a request without a body, but no password', function() {
        var strategy = new Strategy({testWithoutFile: true},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .req(function(req) {
                    req.body = {};
                    req.body.username = 'johndoe';
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message).to.equal('Missing credentials');
            expect(status).to.equal(400);
        });
    });

    describe('handling a request without a body, but no username', function() {
        var strategy = new Strategy({testWithoutFile: true},
            function(profile, done) {
                throw new Error('should not be called');
            });

        var info, status;

        before(function(done) {
            chai.passport(strategy)
                .fail(function(i, s) {
                    info = i;
                    status = s;
                    done();
                })
                .req(function(req) {
                    req.body = {};
                    req.body.password = 'secret';
                })
                .authenticate();
        });

        it('should fail with info and status', function() {
            expect(info).to.be.an.object;
            expect(info.message).to.equal('Missing credentials');
            expect(status).to.equal(400);
        });
    });
});

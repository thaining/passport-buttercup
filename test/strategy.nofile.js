var chai = require('chai')
    , Strategy = require('../lib/strategy')
    , uuid = require('uuid');


describe('Strategy', function() {
    var filePath = "/tmp/" + uuid.v4() + ".bcup";

    describe('handling a request with valid credentials in body using custom field names', function() {
        var strategy = new Strategy({ usernameField: 'userid',
                                      passwordField: 'passwd',
                                      filename: filePath,
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
                })
                .authenticate();
        });

        it('should fail with info and status', function () {
            expect(info).to.be.an.object;
            expect(info.message).to.equal("Password file " + filePath + " could not be found");
            expect(status).to.equal(500);
        });
    });
});

/**
 * Module dependencies.
 */
var passport = require('passport-strategy')
    , util = require('util')
    , buttercup = require('buttercup')
    , lexer = require('json-lexer')
    , fs = require('fs')
    , lookup = require('./utils').lookup;

/**
 * `Strategy` constructor.
 *
 * A buttercup-based authentication strategy authenticates requests based on the
 * credentials submitted through an HTML-based login form.  The username and password
 * are checked against a Buttercup password store.
 *
 * Applications must supply a `verify` callback which processes the profile object
 * returned by the strategy middleware.  The callback completes by calling the
 * `done` callback, supplying a finished profile of the user or 'false' if the
 * credentials are invalid.  An 'err' should be passed as the first argument i f
 * an exception occurs.
 *
 * Optionally, `options` can be used to change the fields in which the
 * credentials are found.
 *
 * Options:
 *   - `usernameField`  field name where the username is found, defaults to _username_
 *   - `passwordField`  field name where the password is found, defaults to _password_
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *   - 'filename'       path to the buttercup file containing user information
 *   - 'masterPasswor'  the password used to unlock the buttercup file
 *   - 'groupName'      the group containing password information within the buttercup file
 *   - 'propertyDictObject' an key/value object containing the names of properties (keys) and their types (values) default: null
 *
 * The propertyDictObject requires some special explanation.  User records in Buttercup keystores can
 * include an arbitrary number of additional properties with custom ids.  The strategy takes a dictionary-
 * style object that maps the id of the attributes and a basic javascript type (+JSON)  to which the value
 * expects to be converted.  The value is fed to a lexer to parse it into a token.  Currently recognized
 * token types are "literal" (true, false, null), "number", "string", and "boolean" (literal with extra
 * checks).  JSON-hinted property values are just fed directly to the JSON parser.  Values that cause
 * parsing errors (both in the lexer and JSON parser) are skipped with an error message.
 * Examples:
 *
 *     passport.use(new ButtercupStrategy({
 *       filename: "/some/file/path/file.bcup,
 *       masterPassword: "myMasterPassword!",
 *       usernameField: "app_username",
 *       passwordField: "app_password",
 *       propertyDictObject: { "some_property": "number",
 *                             "another property": "string",
 *                             "yet_another_property": JSON,
 *                             "last_property": "boolean"
 *                           }
 *       function(profile, done) {
 *         // process extra attributes here
 *         if (something) {
 *             do_something_here(profile);
 *         }
 *         if (user_logged_in) {
 *             return(null, profile);
 *         }
 *         return(null, false);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
    if ((!options) || (typeof options !== 'object')) {
        { throw new TypeError('ButtercupStrategy has required arguments'); }
    }

    if (!verify) { throw new TypeError('ButtercupStrategy requires a verify callback'); }

    this._usernameField = options.usernameField || 'username';
    this._passwordField = options.passwordField || 'password';
    this._filename = options.filename || '/tmp/passwdVault';
    this._groupName = options.groupName || undefined;
    this._masterPassword = options.masterPassword || 'password';
    this._propertyDictObject = options.propertyDictObject || undefined;
    this._testWithoutFile = options.testWithoutFile || false;

    // prevent the interface from printing out passwords
    if (('undefined' !== typeof this._propertyDictObject) &&
        ('undefined' !== typeof this._propertyDictObject.password)) {
        delete this._propertyDictObject.password;
    }

    passport.Strategy.call(this);
    this.name = 'buttercup';
    this._verify = verify;
    this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
    options = options || {};
    var username = lookup(req.body, this._usernameField) || lookup(req.query, this._usernameField);
    var password = lookup(req.body, this._passwordField) || lookup(req.query, this._passwordField);

    if (!username || !password) {
        this.fail({ message: options.badRequestMessage || 'Missing credentials' }, 400);
        return;
    }

    var self = this;

    // this function is run last -- after _verify -- and sets the ultimate
    // failure success or error state of the request
    function verified(err, user, info) {
        if (err) { self.error(err); return; }
        if (!user) { self.fail(info); return; }
        self.success(user, info);
    }

    // this function is used to fix up the output of the lexer
    function typeCheck(type, token) {
        if (type.toLowerCase() == 'boolean') {
            var booleans = ['true', 'false'];
            return ((token[0].type == 'literal') &&
                    (booleans.includes(token[0].raw)));
        }

        return (type.toLowerCase() == token[0].type);
    }

    function jsonParse(userEntry, propertyName, entry) {
        try {
            userEntry.buttercup[propertyName] = JSON.parse(entry);
        } catch(error) {
            console.log("Error parsing the JSON in the property " + propertyName);
            console.log(error);
            console.log("Skipping...");
        }
    }

    function lexerParse(userEntry, propertyName, propertyType, entry) {
        var parserEntry = entry;
        try {
            // here's where the lexer funny business starts
            // put everything in the entry in double quotes if
            // it is not JSON to parse
            if ((propertyType == "string") &&
                (entry[0] != '"' && entry[entry.length - 1] != '"')) {
                parserEntry = '"' + entry + '"';
            }

            var token = lexer(parserEntry);

            if (!typeCheck(self._propertyDictObject[propertyName],
                           token)) {
                console.log("For property " + propertyName +
                            ", the identified type " +
                            self._propertyDictObject[propertyName] +
                            " did not match the actual type " +
                            token[0].type);
                console.log("Skipping...");
                return;
            }

            // put the processed value in the outptu
            userEntry.buttercup[propertyName] = token[0].value;
        } catch(error) {
            console.log("Error during the scanning of property " + propertyName);
            console.log("data: " + parserEntry);
            console.log(error);
            console.log("Skipping...");
        }
    }

    function readVault(resolve, reject, userEntry, vault) {
        var userEntryStr = null;
        var regexp = new RegExp('^' + username + '$');
        var authenticated = false;

        vault
            .findEntriesByProperty("username", regexp)
            .forEach(function(entryObj) {

                // if a group name is specified and it does not match
                // look elsewhere
                if (('undefined' !== typeof self._groupName) &&
                    (entryObj.getGroup().getTitle() !== self._groupName)) {
                    return;
                }

                // if the password does not match, look elsewhere
                if (entryObj.getProperty("password") !== password) {
                    return;
                }

                // fill in the username value
                userEntry.buttercup.username = entryObj.getProperty("username");

                // if there are no properties to search for, do nothing
                if ('undefined' === typeof self._propertyDictObject) {
                    return;
                }

                Object.keys(self._propertyDictObject).forEach(propertyName => {
                    var entry = entryObj.getProperty(propertyName);
                    var propertyType = self._propertyDictObject[propertyName];

                    if ('undefined' !== typeof entry) {
                        if (propertyType == "JSON") {
                            jsonParse(userEntry, propertyName, entry);
                        } else {
                            lexerParse(userEntry, propertyName, propertyType, entry);
                        }
                    }
                });
            });
    }


    function loadFile() {
        return new Promise(function(resolve, reject) {
            var status = {msg: ""};
            var userEntry = {
                buttercup: {}
            };

            if (self._testWithoutFile) {
                userEntry.buttercup['username'] = "user";
                resolve(userEntry);
            } else {
                if (!self._testWithoutFile && !fs.existsSync(self._filename)) {
                    var msg = "Password file " + self._filename + " could not be found";
                    self.fail({ message: msg }, 500);
                    status.msg = msg;
                    reject(status);
                }

                buttercup.init();

                const fileCredentials = buttercup.Credentials.fromDatasource({
                    "path": self._filename}, self._masterPassword);
                const datasourceCredentials = buttercup.Credentials.fromDatasource({
                    "path": self._filename}, self._masterPassword);
                 // The buttercup README says that datasourceCredentials should be used
                // both here and below, but the TextDatasource constructor narrows the
                // permissions to "export-only" using call-by-sharing, which narrows
                // capabilites of the credentials passed in here.  This means that those
                // credentials do not have permissions to load fileDatasource below.
                const fileDatasource = new buttercup.FileDatasource(fileCredentials);

                fileDatasource
                    .load(datasourceCredentials)
                    .then((loadedData) => {
                        // The buttercup README says that this anonymous function is not
                        // necessary and that createFromHistory can be called directly
                        // i.e. '.then(buttercup.Vault.createFromHistory)
                        // The problem is that the object returned by load() is
                        // a single anonymous object with history and Format members that
                        // is not being converted to the History and Format that
                        // createFromHistory expects.  This fixes that.
                        return buttercup.Vault.createFromHistory(
                            loadedData.history, loadedData.Format);
                    })
                    .then(vault => {
                        readVault(resolve, reject, userEntry, vault);
                        resolve(userEntry);
                    })
                    .catch((err) => {
                        // this shows failure to open the butterupc file
                        var msg = "Error opening " + self._filename + ":" + JSON.stringify(err.message);
                        self.fail({ message: msg }, 500);
                        status.message = msg;
                        reject(status);
                    });
            }
        });
    }

    loadFile()
        .then(
            (userEntry) => {
                // now that we've retrieved all the data proceed with verification and report failures there as errors
                try {
                    if ('undefined' === typeof userEntry.buttercup.username) {
                        self.fail({ message: "Authentication failure"}, 401);
                    } else {
                        if (self._passReqToCallback) {
                            self._verify(req, userEntry, verified);
                        } else {
                            self._verify(userEntry, verified);
                        }
                    }
                } catch(err) {
                    verified(err, false, null);
                }
            })
        .catch(
            // this catches promise failures during loadFile
            // responses should have been sent, so just log the errors
            (status) => {
                console.log(status.message);
            }
        );
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;

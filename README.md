# passport-buttercup

[Passport](http://passportjs.org/) strategy for authenticating with a username
and password using a buttercup password-vault.

This module lets you authenticate using a username and password with a buttercup
password vault in your Node.js applications.  By plugging into Passport, buttercup
authentication with a secure password file can be easily and unobtrusively
integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Install

```bash
$ npm install passport-buttercup
```

## Usage

#### Configure Strategy

The buttercup authentication strategy authenticates users using a username and
password with a buttercup password vault.  The strategy requires a buttercup
`verify` callback, which accepts these credentials and calls `done` providing a user
profile.

```js
passport.use(new ButtercupStrategy({
                 filename: '/tmp/passwdVault',
                 masterPassword: 'myPassword',
                 passwordGroup: 'admin',
            }, function(profile, done) {
                   if (profile.meta.Admin === 'true' ||
                         profile.meta.User === 'true') {
                      return done(null, profile);
                   } else {
                      return done(null, false);
                   }
           }));
```

##### Available Options

This strategy takes several options hash before the function, e.g. `new ButtercupStrategy({/* options */, callback})`.

The available options are:

* `filename` - name of the buttercup file
* `masterPassword` - master password for the buttercup file
* `groupName     ` - the group where the password records are located (optional)
* `usernameField` - Optional, defaults to 'username'
* `passwordField` - Optional, defaults to 'password'

The usernameField and passwordField fields define the name of the properties in the POST body that are sent to the server.

#### Parameters

By default, `ButtercupStrategy` expects to find credentials in the group
passwordGroup within the password vault at Filename that can be opened
by masterPassword.  It also expects to find credentials in parameters
named username and password within req.body. If your site prefers to
name these fields differently, options are available to change the defaults.


      passport.use(new ButtercupStrategy({
        filename: "/some/file/path/file.bcup,
        masterPassword: "myMasterPassword!",
        usernameField: "app_username",
        passwordField: "app_password",
        groupName: "AppPasswords",
        propertyDictObject: { "some_property": "number",
                              "another property": "string",
                              "yet_another_property": JSON,
                              "last_property": "boolean"
                            }
        function(profile, done) {
          // process extra attributes here
          if (something) {
              do_something_here(profile);
          }
          if (user_logged_in) {
              return(null, profile);
          }
          return(null, false);
          });
        }
      ));

When session support is not necessary, it can be safely disabled by
setting the `session` option to false.

The verify callback can be supplied with the `request` object by setting
the `passReqToCallback` option to true, and changing callback arguments
accordingly.

    
	passport.use(new ButtercupStrategy({
        filename: '/var/tmp/passwordFile',
        masterPassword: 'myPassword',
        usernameField: 'email',
        passwordField: 'passwd',
        passReqToCallback: true,
        session: false
      },
      function(req, username, password, done) {
        // request object is now first argument
        // ...
      }
    ));

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'buttercup'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

```js
app.post('/login',
  passport.authenticate('buttercup', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });
```

## Examples

Developers using the popular [Express](http://expressjs.com/) web framework can
refer to an [example](https://github.com/passport/express-4.x-local-example)
as a starting point for their own web applications.

## Tests

```bash
$ npm install
$ npm test
```

## Credits

- [Ted Haining]

## License

[The MIT License](http://opensource.org/licenses/MIT)


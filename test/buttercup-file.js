const buttercup = require('buttercup');
const fs = require('fs');

async function createBcupFile(filePath, masterPassword, attributes) {

    buttercup.init();

    const dataSourceCredentials = buttercup.Credentials.fromDatasource({
        path: filePath}, masterPassword);
    const fileDatasource = new buttercup.FileDatasource(dataSourceCredentials);
    const vault = buttercup.Vault.createWithDefaults();
    vault
        .createGroup("General")
        .createEntry("Sample")
        .setProperty("username", "user01")
        .setProperty("password", "user01pass");

    if ('undefined' !== typeof attributes) {
        var regExp = new RegExp('^user01$');
        var entryObj = vault
            .findEntriesByProperty("username", regExp)
            .forEach(function(entryObj) {
                Object.keys(attributes)
                    .forEach(function (propertyName) {
                        entryObj.setProperty(propertyName, attributes[propertyName]);
                    });
            });
   }

    const vaultCredentials = buttercup.Credentials.fromPassword(masterPassword);
    await fileDatasource.save(vault.format.history, vaultCredentials);
 }

function removeBcupFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.rmSync(filePath);
    }
}

module.exports.createBcupFile = createBcupFile;
module.exports.removeBcupFile = removeBcupFile;

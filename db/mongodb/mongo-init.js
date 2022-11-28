// MongoDB docker entrypoint
// resides in /docker-entrypoint-initdb.d/mongo-init.js
// When the container is executed for the first time, it will execute the files with extensions .sh, and .js located at /docker-entrypoint-initdb.d.
// In order to have your custom files inside the docker image you can mount them as a volume.

// use umami
db = db.getSiblingDB("umami")

// insert the default admin:umami admin account
db.account.insertOne(
    {
        "username": "admin",
        "password": "$2b$10$BUli0c.muyCW1ErNJc3jL.vFRFtFJWrT8/GcR4A.sUdCznaXiqFXa",
        "is_admin": true,
        "account_uuid": UUID().toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
    }
)
// https://stackoverflow.com/a/72349259/8291133

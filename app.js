require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { Issuer } = require("openid-client");
const path = require("path");

const app = express();

// Set up EJS and Public folder
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET || "something-very-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

let client;

async function initClient() {
    try {
        const keycloakIssuer = await Issuer.discover(process.env.KEYCLOAK_ISSUER);
        client = new keycloakIssuer.Client({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uris: [process.env.REDIRECT_URI],
            generated_types: ["code"]
        });
        console.log("OIDC Client initialized");
    } catch (error) {
        console.error("Failed to initialize OIDC Client:", error);
    }
}

initClient();

function checkAuthenticated(req, res, next) {
    if (!req.session.tokenSet) {
        return res.redirect("/login");
    }
    next();
}

function checkAdmin(req, res, next) {
    const roles = req.session.userinfo.realm_access?.roles || [];
    if (roles.includes("admin")) {
        return next();
    }
    // Reusing standard EJS error handling style if we had one, but for now just send back
    res.status(403).send("Forbidden: Insufficient Privileges");
}

function checkModerator(req, res, next) {
    const roles = req.session.userinfo.realm_access?.roles || [];
    if (roles.includes("moderator") || roles.includes("admin")) {
        return next();
    }
    res.status(403).send("Forbidden: Moderator Access Required");
}

app.get("/", (req, res) => {
    if (req.session.userinfo) return res.redirect("/dashboard");
    res.render("home");
});

app.get("/login", (req, res) => {
    if (!client) {
        return res.status(500).send("Identity Provider unavailable");
    }
    const authUrl = client.authorizationUrl({
        scope: "openid profile email"
    });
    res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
    try {
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(process.env.REDIRECT_URI, params);
        const userinfo = await client.userinfo(tokenSet);

        req.session.tokenSet = tokenSet;
        req.session.userinfo = userinfo;

        res.redirect("/dashboard");
    } catch (error) {
        console.error("Auth Failure:", error);
        res.status(500).send("Authentication failed");
    }
});

app.get("/dashboard", checkAuthenticated, (req, res) => {
    res.render("dashboard", { user: req.session.userinfo });
});

app.get("/admin", checkAuthenticated, checkAdmin, (req, res) => {
    res.render("admin", { user: req.session.userinfo });
});

app.get("/moderator", checkAuthenticated, checkModerator, (req, res) => {
    res.render("moderator", { user: req.session.userinfo });
});

app.get("/logout", (req, res) => {
    const idToken = req.session.tokenSet?.id_token;
    req.session.destroy();

    if (idToken) {
        // Construct Keycloak logout URL
        const logoutUrl = client.endSessionUrl({
            id_token_hint: idToken,
            post_logout_redirect_uri: "http://localhost:3000/"
        });
        return res.redirect(logoutUrl);
    }

    res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Enterprise Gateway running on http://localhost:${PORT}`);
});

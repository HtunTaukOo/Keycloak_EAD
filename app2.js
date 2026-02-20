require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { Issuer } = require("openid-client");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views/app2"));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET || "app2-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

let client;

async function initClient() {
    try {
        const keycloakIssuer = await Issuer.discover(process.env.KEYCLOAK_ISSUER);
        client = new keycloakIssuer.Client({
            client_id: process.env.APP2_CLIENT_ID,
            client_secret: process.env.APP2_CLIENT_SECRET,
            redirect_uris: [process.env.APP2_REDIRECT_URI],
            response_types: ["code"]
        });
        console.log("[App 2] OIDC Client initialized");
    } catch (error) {
        console.error("[App 2] Failed to initialize OIDC Client:", error);
    }
}

initClient();

function checkAuthenticated(req, res, next) {
    if (!req.session.tokenSet) {
        return res.redirect("/login");
    }
    next();
}

app.get("/", (req, res) => {
    if (req.session.userinfo) return res.redirect("/dashboard");
    res.render("home");
});

app.get("/login", (req, res) => {
    if (!client) {
        return res.status(500).send("Identity Provider unavailable");
    }
    const authUrl = client.authorizationUrl({ scope: "openid profile email" });
    res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
    try {
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(process.env.APP2_REDIRECT_URI, params);
        const userinfo = await client.userinfo(tokenSet);

        const accessTokenClaims = JSON.parse(
            Buffer.from(tokenSet.access_token.split('.')[1], 'base64url').toString()
        );
        userinfo.realm_access = accessTokenClaims.realm_access;

        req.session.tokenSet = tokenSet;
        req.session.userinfo = userinfo;

        res.redirect("/dashboard");
    } catch (error) {
        console.error("[App 2] Auth Failure:", error);
        res.status(500).send("Authentication failed");
    }
});

app.get("/dashboard", checkAuthenticated, (req, res) => {
    res.render("dashboard", { user: req.session.userinfo });
});

app.get("/logout", (req, res) => {
    const idToken = req.session.tokenSet?.id_token;
    req.session.destroy();

    if (idToken) {
        const logoutUrl = client.endSessionUrl({
            id_token_hint: idToken,
            post_logout_redirect_uri: "http://localhost:3001/"
        });
        return res.redirect(logoutUrl);
    }

    res.redirect("/");
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`[App 2] SSO Demo running on http://localhost:${PORT}`);
});

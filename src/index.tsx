import React from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(
        <Auth0Provider
            domain="dev-ltz64nfoijkvemqi.us.auth0.com"
            clientId="spPPHmtTxqyzS63tYyJpU4GuL8yfs0b2"
            authorizationParams={{ redirect_uri: window.location.origin }}
            cacheLocation="localstorage"
        >
            <App />
        </Auth0Provider>
    );
}

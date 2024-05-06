import client from "./client.js";

let configPromise = new Promise((resolve) => {
    client.onConfig((configuration) => {
        resolve(configuration);
    });
});

export default configPromise;

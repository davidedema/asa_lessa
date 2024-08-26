import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import dotenv from 'dotenv';
dotenv.config();

var token;

// Read the CLI args and set the mode
if (process.argv[3] === 'master') {
    token = process.env.CLIENT_TOKEN_MASTER;
} else if (process.argv[3] === 'slave') {
    token = process.env.CLIENT_TOKEN_SLAVE;
} else {
    token = process.env.CLIENT_TOKEN;
}

const client = new DeliverooApi(
    'http://localhost:8080',
    token
)

export default client;
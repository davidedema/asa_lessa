import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import dotenv from 'dotenv';
dotenv.config();

const client = new DeliverooApi(
    'http://localhost:8080',
    process.env.CLIENT_TOKEN
)

export default client;
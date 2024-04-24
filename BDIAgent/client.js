import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA1OWJhYTIxYWRiIiwibmFtZSI6ImRhdmlkZSIsImlhdCI6MTcxMzk0MjYzM30.36QVErTGenPY5cnyuVNYyuX-mIe-G6tVCP6BC-mln9k'
)

export default client;